/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- Matchers assimetricos do Jest expoem valores como any. */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import {
  FormaRecebimento,
  OrigemContaReceber,
  OrigemMovimentacaoCaixa,
  Prisma,
  StatusContaReceber,
  TipoMovimentacaoCaixa,
} from '@prisma/client';
import { CaixasService } from '../caixas/caixas.service';
import { PrismaService } from '../prisma/prisma.service';
import { VendasService } from '../vendas/vendas.service';
import { ContasReceberService } from './contas-receber.service';

function criarPrismaMock() {
  const prisma = {
    cliente: { findUnique: jest.fn() },
    ordemServico: { findUnique: jest.fn() },
    contaReceber: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    recebimentoContaReceber: { create: jest.fn() },
    contaReceberHistorico: { create: jest.fn() },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(async (operacao: unknown) =>
    (operacao as (tx: typeof prisma) => Promise<unknown>)(prisma),
  );
  const prismaSemCaixa: typeof prisma & { caixa?: never } = prisma;
  return prismaSemCaixa;
}

type PrismaMock = ReturnType<typeof criarPrismaMock>;
const usuario = {
  id: 'usuario-1',
  email: 'usuario@teste.com',
  empresaId: 'empresa-1',
  tipo: 'ADMIN_EMPRESA',
};
const cliente = { id: 'cliente-1', empresaId: 'empresa-1', ativo: true };
const ordem = {
  id: 'ordem-1',
  empresaId: 'empresa-1',
  clienteId: 'cliente-1',
  numero: 10,
  titulo: 'Manutenção',
  status: 'CONCLUIDA',
  cliente,
};
const conta = (
  status: StatusContaReceber = StatusContaReceber.PENDENTE,
  aberto = 100,
  vendaId: string | null = null,
) => ({
  id: 'conta-1',
  numero: 1,
  empresaId: 'empresa-1',
  clienteId: 'cliente-1',
  ordemServicoId: null,
  vendaId,
  descricao: 'Conta',
  documento: null,
  status,
  valorOriginal: new Prisma.Decimal(100),
  valorDesconto: new Prisma.Decimal(0),
  valorJuros: new Prisma.Decimal(0),
  valorMulta: new Prisma.Decimal(0),
  valorRecebido: new Prisma.Decimal(100 - aberto),
  valorAberto: new Prisma.Decimal(aberto),
  parcelaAtual: 1,
  totalParcelas: 1,
  dataVencimento: new Date('2026-08-10'),
  recebimentos: [],
  historicos: [],
  cliente,
  ordemServico: null,
  venda: null,
});

describe('ContasReceberService', () => {
  let prisma: PrismaMock;
  let caixas: { registrarMovimentacaoFinanceira: jest.Mock };
  let vendas: { concluirSeQuitada: jest.Mock };
  let service: ContasReceberService;

  beforeEach(() => {
    prisma = criarPrismaMock();
    caixas = { registrarMovimentacaoFinanceira: jest.fn() };
    vendas = { concluirSeQuitada: jest.fn() };
    service = new ContasReceberService(
      prisma as unknown as PrismaService,
      vendas as unknown as VendasService,
      caixas as unknown as CaixasService,
    );
    prisma.cliente.findUnique.mockResolvedValue(cliente);
    prisma.ordemServico.findUnique.mockResolvedValue(ordem);
    prisma.contaReceber.findFirst.mockResolvedValue(null);
    prisma.contaReceber.findUnique.mockResolvedValue(conta());
    prisma.contaReceber.findUniqueOrThrow.mockResolvedValue(
      conta(StatusContaReceber.CANCELADA),
    );
    prisma.contaReceber.create.mockResolvedValue(conta());
    prisma.contaReceber.update.mockResolvedValue(conta());
    prisma.contaReceber.updateMany.mockResolvedValue({ count: 1 });
    prisma.recebimentoContaReceber.create.mockResolvedValue({
      id: 'recebimento-1',
    });
    prisma.contaReceberHistorico.create.mockResolvedValue({
      id: 'historico-1',
    });
    caixas.registrarMovimentacaoFinanceira.mockResolvedValue({
      movimentacao: { id: 'movimento-1' },
      caixa: { id: 'caixa-1' },
    });
  });

  it('cria conta manual com Decimal, tenant e histórico', async () => {
    await service.criar(
      {
        descricao: ' Conta ',
        dataVencimento: '2026-08-10',
        valorOriginal: 100,
        origem: OrigemContaReceber.MANUAL,
      },
      usuario,
    );
    expect(prisma.contaReceber.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          empresaId: 'empresa-1',
          descricao: 'Conta',
          valorOriginal: new Prisma.Decimal(100),
          valorAberto: new Prisma.Decimal(100),
        }),
      }),
    );
    expect(prisma.contaReceberHistorico.create).toHaveBeenCalled();
  });

  it('rejeita cliente de outro tenant sem criar conta', async () => {
    prisma.cliente.findUnique.mockResolvedValue({
      ...cliente,
      empresaId: 'empresa-2',
    });
    await expect(
      service.criar(
        {
          descricao: 'Conta',
          dataVencimento: '2026-08-10',
          valorOriginal: 100,
          clienteId: 'cliente-1',
        },
        usuario,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.contaReceber.create).not.toHaveBeenCalled();
  });

  it('gera conta a partir de ordem concluída dentro da transação', async () => {
    await service.gerarAPartirOrdemServico(
      'ordem-1',
      {
        dataVencimento: '2026-08-10',
        valorOriginal: 100,
      },
      usuario,
    );
    expect(prisma.ordemServico.findUnique).toHaveBeenCalled();
    expect(prisma.contaReceber.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ordemServicoId: 'ordem-1',
          clienteId: 'cliente-1',
          empresaId: 'empresa-1',
        }),
      }),
    );
  });

  it('rejeita ordem incompatível ou já vinculada', async () => {
    prisma.ordemServico.findUnique.mockResolvedValue({
      ...ordem,
      status: 'ABERTA',
    });
    await expect(
      service.gerarAPartirOrdemServico(
        'ordem-1',
        {
          dataVencimento: '2026-08-10',
          valorOriginal: 100,
        },
        usuario,
      ),
    ).rejects.toThrow('concluídas');
    prisma.ordemServico.findUnique.mockResolvedValue(ordem);
    prisma.contaReceber.findFirst.mockResolvedValue({ numero: 7 });
    await expect(
      service.gerarAPartirOrdemServico(
        'ordem-1',
        {
          dataVencimento: '2026-08-10',
          valorOriginal: 100,
        },
        usuario,
      ),
    ).rejects.toThrow('já possui');
  });

  it('converte concorrência da ordem pelo índice parcial', async () => {
    prisma.contaReceber.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: '6.19.3',
        meta: { target: 'ContaReceber_ordemServicoId_ativa_key' },
      }),
    );
    await expect(
      service.gerarAPartirOrdemServico(
        'ordem-1',
        {
          dataVencimento: '2026-08-10',
          valorOriginal: 100,
        },
        usuario,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it.each([
    [['empresaId', 'numero'], 'numeração'],
    [['recebimentoContaReceberId'], 'já possui movimentação'],
  ])('diferencia P2002 de %s', async (target, mensagem) => {
    const erro = new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target },
    });
    if (target.includes('recebimentoContaReceberId')) {
      caixas.registrarMovimentacaoFinanceira.mockRejectedValue(erro);
      await expect(
        service.registrarRecebimento(
          'conta-1',
          {
            valor: 20,
            caixaId: 'caixa-1',
            formaRecebimento: FormaRecebimento.PIX,
          },
          usuario,
        ),
      ).rejects.toThrow(mensagem);
    } else {
      prisma.contaReceber.create.mockRejectedValue(erro);
      await expect(
        service.criar(
          {
            descricao: 'Conta',
            dataVencimento: '2026-08-10',
            valorOriginal: 100,
          },
          usuario,
        ),
      ).rejects.toThrow(mensagem);
    }
  });

  it('propaga P2002 desconhecido', async () => {
    const erro = new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target: ['outra'] },
    });
    prisma.contaReceber.create.mockRejectedValue(erro);
    await expect(
      service.criar(
        {
          descricao: 'Conta',
          dataVencimento: '2026-08-10',
          valorOriginal: 100,
        },
        usuario,
      ),
    ).rejects.toBe(erro);
  });

  it('registra recebimento parcial com Decimal e lock', async () => {
    await service.registrarRecebimento(
      'conta-1',
      {
        valor: 40,
        formaRecebimento: FormaRecebimento.PIX,
      },
      usuario,
    );
    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(prisma.contaReceber.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          valorRecebido: new Prisma.Decimal(40),
          valorAberto: new Prisma.Decimal(60),
          status: StatusContaReceber.PARCIALMENTE_RECEBIDA,
        }),
      }),
    );
  });

  it('recebimento total exige saldo exatamente zero', async () => {
    await service.registrarRecebimento(
      'conta-1',
      {
        valor: 100,
        formaRecebimento: FormaRecebimento.PIX,
      },
      usuario,
    );
    expect(prisma.contaReceber.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          valorAberto: new Prisma.Decimal(0),
          status: StatusContaReceber.RECEBIDA,
        }),
      }),
    );
  });

  it('saldo de um centavo permanece parcialmente recebido', async () => {
    await service.registrarRecebimento(
      'conta-1',
      {
        valor: 99.99,
        formaRecebimento: FormaRecebimento.PIX,
      },
      usuario,
    );
    expect(prisma.contaReceber.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          valorAberto: new Prisma.Decimal('0.01'),
          status: StatusContaReceber.PARCIALMENTE_RECEBIDA,
        }),
      }),
    );
  });

  it('aplica juros, multa e desconto sem ponto flutuante', async () => {
    await service.registrarRecebimento(
      'conta-1',
      {
        valor: 105,
        juros: 5,
        multa: 2,
        desconto: 2,
        formaRecebimento: FormaRecebimento.PIX,
      },
      usuario,
    );
    expect(prisma.contaReceber.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          valorJuros: new Prisma.Decimal(5),
          valorMulta: new Prisma.Decimal(2),
          valorDesconto: new Prisma.Decimal(2),
          valorAberto: new Prisma.Decimal(0),
        }),
      }),
    );
  });

  it.each([0, -1])('rejeita valor inválido %s sem efeitos', async (valor) => {
    await expect(
      service.registrarRecebimento(
        'conta-1',
        {
          valor,
          formaRecebimento: FormaRecebimento.PIX,
        },
        usuario,
      ),
    ).rejects.toThrow('valores do recebimento');
    expect(prisma.recebimentoContaReceber.create).not.toHaveBeenCalled();
  });

  it('rejeita recebimento maior que o saldo sem efeitos', async () => {
    await expect(
      service.registrarRecebimento(
        'conta-1',
        {
          valor: 100.01,
          formaRecebimento: FormaRecebimento.PIX,
        },
        usuario,
      ),
    ).rejects.toThrow('maior que o saldo');
    expect(prisma.recebimentoContaReceber.create).not.toHaveBeenCalled();
    expect(caixas.registrarMovimentacaoFinanceira).not.toHaveBeenCalled();
  });

  it.each([
    ['valor', { valor: 10.001 }],
    ['juros', { valor: 10, juros: 0.009 }],
    ['multa', { valor: 10, multa: 1.999 }],
    ['desconto', { valor: 10, desconto: 99.995 }],
  ])(
    'rejeita precisão inválida em %s antes dos efeitos',
    async (_campo, valores) => {
      await expect(
        service.registrarRecebimento(
          'conta-1',
          {
            ...valores,
            formaRecebimento: FormaRecebimento.PIX,
          },
          usuario,
        ),
      ).rejects.toThrow('duas casas decimais');
      expect(prisma.recebimentoContaReceber.create).not.toHaveBeenCalled();
      expect(caixas.registrarMovimentacaoFinanceira).not.toHaveBeenCalled();
    },
  );

  it('usa o mesmo tx e increment do Caixa no recebimento', async () => {
    await service.registrarRecebimento(
      'conta-1',
      {
        valor: 20,
        caixaId: 'caixa-1',
        formaRecebimento: FormaRecebimento.PIX,
      },
      usuario,
    );
    expect(caixas.registrarMovimentacaoFinanceira).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        caixaId: 'caixa-1',
        empresaId: 'empresa-1',
        tipo: TipoMovimentacaoCaixa.ENTRADA,
        origem: OrigemMovimentacaoCaixa.CONTA_RECEBER,
        recebimentoContaReceberId: 'recebimento-1',
        valor: new Prisma.Decimal(20),
      }),
    );
    expect(prisma.caixa).toBeUndefined();
  });

  it('falha do Caixa reverte o fluxo lógico sem atualizar conta ou histórico', async () => {
    caixas.registrarMovimentacaoFinanceira.mockRejectedValue(
      new BadRequestException('Caixa indisponível'),
    );
    await expect(
      service.registrarRecebimento(
        'conta-1',
        {
          valor: 20,
          caixaId: 'caixa-1',
          formaRecebimento: FormaRecebimento.PIX,
        },
        usuario,
      ),
    ).rejects.toThrow('Caixa indisponível');
    expect(prisma.contaReceber.update).not.toHaveBeenCalled();
    expect(prisma.contaReceberHistorico.create).not.toHaveBeenCalled();
  });

  it('falha do histórico propaga para rollback da transação', async () => {
    const erro = new Error('histórico falhou');
    prisma.contaReceberHistorico.create.mockRejectedValue(erro);
    await expect(
      service.registrarRecebimento(
        'conta-1',
        {
          valor: 20,
          formaRecebimento: FormaRecebimento.PIX,
        },
        usuario,
      ),
    ).rejects.toBe(erro);
    expect(prisma.contaReceber.update).toHaveBeenCalled();
  });

  it('segunda tentativa após quitação não cria efeitos', async () => {
    prisma.contaReceber.findUnique.mockResolvedValue(
      conta(StatusContaReceber.RECEBIDA, 0),
    );
    await expect(
      service.registrarRecebimento(
        'conta-1',
        {
          valor: 1,
          formaRecebimento: FormaRecebimento.PIX,
        },
        usuario,
      ),
    ).rejects.toThrow('já foi recebida');
    expect(prisma.recebimentoContaReceber.create).not.toHaveBeenCalled();
    expect(caixas.registrarMovimentacaoFinanceira).not.toHaveBeenCalled();
  });

  it('operação concorrente derrotada observa o estado já recebido', async () => {
    prisma.contaReceber.findUnique.mockResolvedValue(
      conta(StatusContaReceber.RECEBIDA, 0),
    );
    await expect(
      service.registrarRecebimento(
        'conta-1',
        {
          valor: 100,
          formaRecebimento: FormaRecebimento.PIX,
        },
        usuario,
      ),
    ).rejects.toThrow('já foi recebida');
    expect(prisma.recebimentoContaReceber.create).not.toHaveBeenCalled();
  });

  it('protege tenant antes dos efeitos e SUPER_ADMIN usa empresa da conta', async () => {
    prisma.contaReceber.findUnique.mockResolvedValue({
      ...conta(),
      empresaId: 'empresa-2',
    });
    await expect(
      service.registrarRecebimento(
        'conta-1',
        {
          valor: 20,
          formaRecebimento: FormaRecebimento.PIX,
        },
        usuario,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.recebimentoContaReceber.create).not.toHaveBeenCalled();

    await service.registrarRecebimento(
      'conta-1',
      {
        valor: 20,
        caixaId: 'caixa-1',
        formaRecebimento: FormaRecebimento.PIX,
      },
      {
        id: 'super',
        email: 'super@teste.com',
        empresaId: null,
        tipo: 'SUPER_ADMIN',
      },
    );
    expect(caixas.registrarMovimentacaoFinanceira).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({ empresaId: 'empresa-2' }),
    );
  });

  it('serializa conta de venda e conclui a venda no mesmo tx', async () => {
    prisma.contaReceber.findUnique.mockResolvedValue(
      conta(StatusContaReceber.PENDENTE, 100, 'venda-1'),
    );
    prisma.contaReceber.update.mockResolvedValue(
      conta(StatusContaReceber.RECEBIDA, 0, 'venda-1'),
    );
    await service.registrarRecebimento(
      'conta-1',
      {
        valor: 100,
        formaRecebimento: FormaRecebimento.PIX,
      },
      usuario,
    );
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    expect(vendas.concluirSeQuitada).toHaveBeenCalledWith(
      'venda-1',
      'usuario-1',
      prisma,
    );
  });

  it('cancela condicionalmente com histórico', async () => {
    await service.cancelar('conta-1', usuario);
    expect(prisma.contaReceber.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          empresaId: 'empresa-1',
          recebimentos: { none: {} },
        }),
      }),
    );
    expect(prisma.contaReceberHistorico.create).toHaveBeenCalled();
  });

  it('bloqueia cancelamento com recebimentos', async () => {
    prisma.contaReceber.findUnique.mockResolvedValue({
      ...conta(),
      recebimentos: [{ id: 'recebimento-1' }],
    });
    await expect(service.cancelar('conta-1', usuario)).rejects.toThrow(
      'com recebimentos',
    );
    expect(prisma.contaReceber.updateMany).not.toHaveBeenCalled();
  });

  it('cancelamento concorrente derrotado não cria histórico', async () => {
    prisma.contaReceber.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.cancelar('conta-1', usuario)).rejects.toThrow(
      'foi alterada',
    );
    expect(prisma.contaReceberHistorico.create).not.toHaveBeenCalled();
  });

  it('cancelamento repetido é idempotente', async () => {
    const cancelada = conta(StatusContaReceber.CANCELADA);
    prisma.contaReceber.findUnique.mockResolvedValue(cancelada);
    await expect(service.cancelar('conta-1', usuario)).resolves.toBe(cancelada);
    expect(prisma.contaReceber.updateMany).not.toHaveBeenCalled();
  });

  it('edição bloqueia e rejeita precisão inválida sem persistir', async () => {
    await expect(
      service.atualizar(
        'conta-1',
        {
          valorOriginal: 10.001,
        },
        usuario,
      ),
    ).rejects.toThrow('duas casas decimais');
    expect(prisma.contaReceber.update).not.toHaveBeenCalled();
  });
});
