import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import {
  OrigemMovimentacaoCaixa,
  Prisma,
  StatusCaixa,
  TipoMovimentacaoCaixa,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CaixasService } from './caixas.service';

function criarPrismaMock() {
  const prisma = {
    caixa: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    aberturaCaixa: {
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    movimentacaoCaixa: { create: jest.fn() },
    caixaHistorico: { create: jest.fn() },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(async (operacao: unknown) =>
    (operacao as (tx: typeof prisma) => Promise<unknown>)(prisma),
  );
  return prisma;
}

type PrismaMock = ReturnType<typeof criarPrismaMock>;
const usuario = {
  id: 'usuario-1',
  email: 'usuario@empresa.com',
  empresaId: 'empresa-1',
  tipo: 'ADMIN_EMPRESA',
};
const caixa = (status: StatusCaixa = StatusCaixa.FECHADO, saldoAtual = 0) => ({
  id: 'caixa-1',
  empresaId: 'empresa-1',
  nome: 'Principal',
  codigo: 'CX1',
  ativo: true,
  status,
  saldoAtual,
  aberturas: [],
});
const abertura = {
  id: 'abertura-1',
  caixaId: 'caixa-1',
  empresaId: 'empresa-1',
  aberto: true,
};

describe('CaixasService', () => {
  let prisma: PrismaMock;
  let service: CaixasService;

  beforeEach(() => {
    prisma = criarPrismaMock();
    service = new CaixasService(prisma as unknown as PrismaService);
    prisma.caixa.findUnique.mockResolvedValue(caixa());
    prisma.caixa.findUniqueOrThrow.mockResolvedValue(caixa(StatusCaixa.ABERTO));
    prisma.caixa.updateMany.mockResolvedValue({ count: 1 });
    prisma.aberturaCaixa.findFirst.mockResolvedValue(null);
    prisma.aberturaCaixa.create.mockResolvedValue(abertura);
    prisma.aberturaCaixa.updateMany.mockResolvedValue({ count: 1 });
    prisma.aberturaCaixa.findUniqueOrThrow.mockResolvedValue(abertura);
    prisma.movimentacaoCaixa.create.mockResolvedValue({ id: 'mov-1' });
    prisma.caixaHistorico.create.mockResolvedValue({ id: 'hist-1' });
  });

  it('cria caixa válido no tenant do usuário', async () => {
    prisma.caixa.create.mockResolvedValue(caixa());
    await service.criar({ nome: ' Principal ', codigo: ' cx1 ' }, usuario);
    expect(prisma.caixa.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          empresaId: 'empresa-1',
          nome: 'Principal',
          codigo: 'CX1',
        }),
      }),
    );
  });

  it.each([
    [['empresaId', 'codigo'], 'código'],
    [['empresaId', 'nome'], 'nome'],
  ])('diferencia conflito P2002 de %s', async (target, mensagem) => {
    prisma.caixa.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: '6.19.3',
        meta: { target },
      }),
    );
    await expect(
      service.criar({ nome: 'Principal', codigo: 'CX1' }, usuario),
    ).rejects.toThrow(mensagem);
  });

  it('não converte P2002 desconhecido', async () => {
    const erro = new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target: ['outra'] },
    });
    prisma.caixa.create.mockRejectedValue(erro);
    await expect(
      service.criar({ nome: 'Principal', codigo: 'CX1' }, usuario),
    ).rejects.toBe(erro);
  });

  it('abre de forma condicional, registra histórico e usa lock', async () => {
    await service.abrir('caixa-1', { saldoInicial: 100 }, usuario);
    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(prisma.caixa.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          empresaId: 'empresa-1',
          status: StatusCaixa.FECHADO,
        }),
      }),
    );
    expect(prisma.caixaHistorico.create).toHaveBeenCalled();
  });

  it('rejeita segunda abertura sem criar abertura ou histórico', async () => {
    prisma.caixa.findUnique.mockResolvedValue(caixa(StatusCaixa.ABERTO));
    await expect(
      service.abrir('caixa-1', { saldoInicial: 0 }, usuario),
    ).rejects.toThrow('já está aberto');
    expect(prisma.aberturaCaixa.create).not.toHaveBeenCalled();
    expect(prisma.caixaHistorico.create).not.toHaveBeenCalled();
  });

  it('rejeita perdedor concorrente pela transição condicional', async () => {
    prisma.caixa.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.abrir('caixa-1', { saldoInicial: 0 }, usuario),
    ).rejects.toThrow('já está aberto');
    expect(prisma.aberturaCaixa.create).not.toHaveBeenCalled();
  });

  it('converte conflito do índice de abertura ativa', async () => {
    prisma.aberturaCaixa.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: '6.19.3',
        meta: { target: 'AberturaCaixa_caixaId_aberto_key' },
      }),
    );
    await expect(
      service.abrir('caixa-1', { saldoInicial: 0 }, usuario),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rollback lógico se histórico da abertura falhar', async () => {
    const erro = new Error('histórico indisponível');
    prisma.caixaHistorico.create.mockRejectedValue(erro);
    await expect(
      service.abrir('caixa-1', { saldoInicial: 0 }, usuario),
    ).rejects.toBe(erro);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('entrada usa increment e registra saldos efetivos', async () => {
    prisma.caixa.findUnique.mockResolvedValue(caixa(StatusCaixa.ABERTO, 10));
    prisma.caixa.findUniqueOrThrow.mockResolvedValue(
      caixa(StatusCaixa.ABERTO, 15),
    );
    prisma.aberturaCaixa.findFirst.mockResolvedValue(abertura);
    await service.criarMovimentacao(
      'caixa-1',
      {
        tipo: TipoMovimentacaoCaixa.ENTRADA,
        descricao: 'Entrada',
        valor: 5,
      },
      usuario,
    );
    expect(prisma.caixa.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { saldoAtual: { increment: 5 } },
      }),
    );
    expect(prisma.movimentacaoCaixa.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          saldoAnterior: 10,
          saldoPosterior: 15,
        }),
      }),
    );
  });

  it('saída usa decrement condicional e nunca permite negativo', async () => {
    prisma.caixa.findUnique.mockResolvedValue(caixa(StatusCaixa.ABERTO, 10));
    prisma.caixa.findUniqueOrThrow.mockResolvedValue(
      caixa(StatusCaixa.ABERTO, 4),
    );
    prisma.aberturaCaixa.findFirst.mockResolvedValue(abertura);
    await service.criarMovimentacao(
      'caixa-1',
      {
        tipo: TipoMovimentacaoCaixa.SAIDA,
        descricao: 'Saída',
        valor: 6,
      },
      usuario,
    );
    expect(prisma.caixa.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ saldoAtual: { gte: 6 } }),
        data: { saldoAtual: { decrement: 6 } },
      }),
    );
  });

  it('rejeita saída concorrente derrotada sem movimento ou histórico', async () => {
    prisma.caixa.findUnique.mockResolvedValue(caixa(StatusCaixa.ABERTO, 4));
    prisma.aberturaCaixa.findFirst.mockResolvedValue(abertura);
    prisma.caixa.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.criarMovimentacao(
        'caixa-1',
        {
          tipo: TipoMovimentacaoCaixa.SAIDA,
          descricao: 'Saída',
          valor: 6,
        },
        usuario,
      ),
    ).rejects.toThrow('Saldo insuficiente');
    expect(prisma.movimentacaoCaixa.create).not.toHaveBeenCalled();
    expect(prisma.caixaHistorico.create).not.toHaveBeenCalled();
  });

  it('rollback lógico se movimento ou histórico falhar', async () => {
    prisma.caixa.findUnique.mockResolvedValue(caixa(StatusCaixa.ABERTO, 10));
    prisma.caixa.findUniqueOrThrow.mockResolvedValue(
      caixa(StatusCaixa.ABERTO, 15),
    );
    prisma.aberturaCaixa.findFirst.mockResolvedValue(abertura);
    const erro = new Error('movimento falhou');
    prisma.movimentacaoCaixa.create.mockRejectedValue(erro);
    await expect(
      service.criarMovimentacao(
        'caixa-1',
        {
          tipo: TipoMovimentacaoCaixa.ENTRADA,
          descricao: 'Entrada',
          valor: 5,
        },
        usuario,
      ),
    ).rejects.toBe(erro);
    expect(prisma.caixaHistorico.create).not.toHaveBeenCalled();
  });

  it('fecha de forma condicional com saldo consistente e histórico', async () => {
    prisma.caixa.findUnique.mockResolvedValue(caixa(StatusCaixa.ABERTO, 90));
    prisma.aberturaCaixa.findFirst.mockResolvedValue(abertura);
    await service.fechar('caixa-1', { saldoInformado: 89 }, usuario);
    expect(prisma.aberturaCaixa.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          aberto: true,
          empresaId: 'empresa-1',
        }),
        data: expect.objectContaining({
          saldoSistema: 90,
          saldoInformado: 89,
          diferenca: -1,
        }),
      }),
    );
    expect(prisma.caixaHistorico.create).toHaveBeenCalled();
  });

  it('rejeita fechamento duplicado antes de efeitos', async () => {
    prisma.caixa.findUnique.mockResolvedValue(caixa(StatusCaixa.FECHADO));
    await expect(
      service.fechar('caixa-1', { saldoInformado: 0 }, usuario),
    ).rejects.toThrow('não está aberto');
    expect(prisma.aberturaCaixa.updateMany).not.toHaveBeenCalled();
  });

  it('rejeita perdedor concorrente do fechamento', async () => {
    prisma.caixa.findUnique.mockResolvedValue(caixa(StatusCaixa.ABERTO));
    prisma.aberturaCaixa.findFirst.mockResolvedValue(abertura);
    prisma.aberturaCaixa.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.fechar('caixa-1', { saldoInformado: 0 }, usuario),
    ).rejects.toThrow('já foi fechada');
    expect(prisma.caixaHistorico.create).not.toHaveBeenCalled();
  });

  it('impede operação em caixa de outro tenant', async () => {
    prisma.caixa.findUnique.mockResolvedValue({
      ...caixa(),
      empresaId: 'empresa-2',
    });
    await expect(
      service.abrir('caixa-1', { saldoInicial: 0 }, usuario),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.caixa.updateMany).not.toHaveBeenCalled();
  });

  it('SUPER_ADMIN mantém a empresa operacional do caixa', async () => {
    prisma.caixa.findUnique.mockResolvedValue({
      ...caixa(),
      empresaId: 'empresa-2',
    });
    await service.abrir(
      'caixa-1',
      { saldoInicial: 0 },
      {
        id: 'super',
        email: 'super@sistema.com',
        tipo: 'SUPER_ADMIN',
        empresaId: null,
      },
    );
    expect(prisma.aberturaCaixa.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ empresaId: 'empresa-2' }),
      }),
    );
  });
  it('registra saída financeira no tx recebido com idempotência do pagamento', async () => {
    prisma.caixa.findUnique.mockResolvedValue(caixa(StatusCaixa.ABERTO, 100));
    prisma.caixa.findUniqueOrThrow.mockResolvedValue(
      caixa(StatusCaixa.ABERTO, 60),
    );
    prisma.aberturaCaixa.findFirst.mockResolvedValue(abertura);

    await service.registrarMovimentacaoFinanceira(prisma as never, {
      caixaId: 'caixa-1',
      empresaId: 'empresa-1',
      tipo: TipoMovimentacaoCaixa.SAIDA,
      origem: OrigemMovimentacaoCaixa.CONTA_PAGAR,
      descricao: 'Pagamento da conta 1',
      valor: new Prisma.Decimal(40),
      dataMovimentacao: new Date('2026-07-20'),
      pagamentoContaPagarId: 'pagamento-1',
      usuarioId: 'usuario-1',
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.caixa.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          empresaId: 'empresa-1',
          saldoAtual: { gte: new Prisma.Decimal(40) },
        }),
        data: { saldoAtual: { decrement: new Prisma.Decimal(40) } },
      }),
    );
    expect(prisma.movimentacaoCaixa.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pagamentoContaPagarId: 'pagamento-1',
          saldoAnterior: new Prisma.Decimal(100),
          saldoPosterior: new Prisma.Decimal(60),
        }),
      }),
    );
    expect(prisma.caixaHistorico.create).toHaveBeenCalled();
  });

  it('rejeita saída financeira sem saldo antes de movimento e histórico', async () => {
    prisma.caixa.findUnique.mockResolvedValue(caixa(StatusCaixa.ABERTO, 10));
    prisma.aberturaCaixa.findFirst.mockResolvedValue(abertura);
    prisma.caixa.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.registrarMovimentacaoFinanceira(prisma as never, {
        caixaId: 'caixa-1',
        empresaId: 'empresa-1',
        tipo: TipoMovimentacaoCaixa.SAIDA,
        origem: OrigemMovimentacaoCaixa.CONTA_PAGAR,
        descricao: 'Pagamento',
        valor: new Prisma.Decimal(20),
        dataMovimentacao: new Date(),
        pagamentoContaPagarId: 'pagamento-1',
      }),
    ).rejects.toThrow('Saldo insuficiente');

    expect(prisma.movimentacaoCaixa.create).not.toHaveBeenCalled();
    expect(prisma.caixaHistorico.create).not.toHaveBeenCalled();
  });

  it('rejeita empresa incompatível na movimentação financeira', async () => {
    prisma.caixa.findUnique.mockResolvedValue(caixa(StatusCaixa.ABERTO, 100));

    await expect(
      service.registrarMovimentacaoFinanceira(prisma as never, {
        caixaId: 'caixa-1',
        empresaId: 'empresa-2',
        tipo: TipoMovimentacaoCaixa.SAIDA,
        origem: OrigemMovimentacaoCaixa.CONTA_PAGAR,
        descricao: 'Pagamento',
        valor: new Prisma.Decimal(20),
        dataMovimentacao: new Date(),
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.caixa.updateMany).not.toHaveBeenCalled();
  });
});
