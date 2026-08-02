import { ConflictException, NotFoundException } from '@nestjs/common';
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
      findFirst: jest.fn(),
      findFirstOrThrow: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    aberturaCaixa: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      findFirstOrThrow: jest.fn(),
    },
    movimentacaoCaixa: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    caixaHistorico: { create: jest.fn() },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(async (operacao: unknown) => {
    if (Array.isArray(operacao)) return Promise.all(operacao);
    return (operacao as (tx: typeof prisma) => Promise<unknown>)(prisma);
  });
  return prisma;
}

type PrismaMock = ReturnType<typeof criarPrismaMock>;
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
    prisma.caixa.findFirst.mockResolvedValue(caixa());
    prisma.caixa.findFirstOrThrow.mockResolvedValue(caixa(StatusCaixa.ABERTO));
    prisma.caixa.updateMany.mockResolvedValue({ count: 1 });
    prisma.aberturaCaixa.findFirst.mockResolvedValue(null);
    prisma.aberturaCaixa.create.mockResolvedValue(abertura);
    prisma.aberturaCaixa.updateMany.mockResolvedValue({ count: 1 });
    prisma.aberturaCaixa.findFirstOrThrow.mockResolvedValue(abertura);
    prisma.movimentacaoCaixa.create.mockResolvedValue({ id: 'mov-1' });
    prisma.caixaHistorico.create.mockResolvedValue({ id: 'hist-1' });
  });

  it('cria caixa válido no tenant do usuário', async () => {
    prisma.caixa.create.mockResolvedValue(caixa());
    await service.criar('empresa-1', 'usuario-1', {
      nome: ' Principal ',
      codigo: ' cx1 ',
    });
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
    [['codigo', 'empresaId'], 'código'],
    [['empresaId', 'nome'], 'nome'],
    ['Caixa_empresaId_codigo_key', 'código'],
    ['Caixa_empresaId_nome_key', 'nome'],
  ])('diferencia conflito P2002 de %s', async (target, mensagem) => {
    prisma.caixa.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: '6.19.3',
        meta: { target },
      }),
    );
    await expect(
      service.criar('empresa-1', 'usuario-1', {
        nome: 'Principal',
        codigo: 'CX1',
      }),
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
      service.criar('empresa-1', 'usuario-1', {
        nome: 'Principal',
        codigo: 'CX1',
      }),
    ).rejects.toBe(erro);
  });

  it.each([
    ['campos adicionais', ['empresaId', 'codigo', 'extra']],
    ['nome parcial', 'prefixo_Caixa_empresaId_codigo_key_sufixo'],
    ['metadata ausente', undefined],
  ])('não converte P2002 com %s', async (_caso, target) => {
    const erro = new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: target === undefined ? {} : { target },
    });
    prisma.caixa.create.mockRejectedValue(erro);
    await expect(
      service.criar('empresa-1', 'usuario-1', {
        nome: 'Principal',
        codigo: 'CX1',
      }),
    ).rejects.toBe(erro);
  });

  it('abre de forma condicional, registra histórico e usa lock', async () => {
    await service.abrir('empresa-1', 'caixa-1', 'usuario-1', {
      saldoInicial: 100,
    });
    expect(prisma.$queryRaw).toHaveBeenCalled();
    const lock = (prisma.$queryRaw.mock.calls as Array<[Prisma.Sql]>)[0][0];
    expect(lock.values).toEqual(['caixa-1', 'empresa-1']);
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
    prisma.caixa.findFirst.mockResolvedValue(caixa(StatusCaixa.ABERTO));
    await expect(
      service.abrir('empresa-1', 'caixa-1', 'usuario-1', { saldoInicial: 0 }),
    ).rejects.toThrow('já está aberto');
    expect(prisma.aberturaCaixa.create).not.toHaveBeenCalled();
    expect(prisma.caixaHistorico.create).not.toHaveBeenCalled();
  });

  it('rejeita perdedor concorrente pela transição condicional', async () => {
    prisma.caixa.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.abrir('empresa-1', 'caixa-1', 'usuario-1', { saldoInicial: 0 }),
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
      service.abrir('empresa-1', 'caixa-1', 'usuario-1', { saldoInicial: 0 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rollback lógico se histórico da abertura falhar', async () => {
    const erro = new Error('histórico indisponível');
    prisma.caixaHistorico.create.mockRejectedValue(erro);
    await expect(
      service.abrir('empresa-1', 'caixa-1', 'usuario-1', { saldoInicial: 0 }),
    ).rejects.toBe(erro);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('entrada usa increment e registra saldos efetivos', async () => {
    prisma.caixa.findFirst.mockResolvedValue(caixa(StatusCaixa.ABERTO, 10));
    prisma.caixa.findFirstOrThrow.mockResolvedValue(
      caixa(StatusCaixa.ABERTO, 15),
    );
    prisma.aberturaCaixa.findFirst.mockResolvedValue(abertura);
    await service.criarMovimentacao('empresa-1', 'caixa-1', 'usuario-1', {
      tipo: TipoMovimentacaoCaixa.ENTRADA,
      descricao: 'Entrada',
      valor: 5,
    });
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
    prisma.caixa.findFirst.mockResolvedValue(caixa(StatusCaixa.ABERTO, 10));
    prisma.caixa.findFirstOrThrow.mockResolvedValue(
      caixa(StatusCaixa.ABERTO, 4),
    );
    prisma.aberturaCaixa.findFirst.mockResolvedValue(abertura);
    await service.criarMovimentacao('empresa-1', 'caixa-1', 'usuario-1', {
      tipo: TipoMovimentacaoCaixa.SAIDA,
      descricao: 'Saída',
      valor: 6,
    });
    expect(prisma.caixa.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ saldoAtual: { gte: 6 } }),
        data: { saldoAtual: { decrement: 6 } },
      }),
    );
  });

  it('rejeita saída concorrente derrotada sem movimento ou histórico', async () => {
    prisma.caixa.findFirst.mockResolvedValue(caixa(StatusCaixa.ABERTO, 4));
    prisma.aberturaCaixa.findFirst.mockResolvedValue(abertura);
    prisma.caixa.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.criarMovimentacao('empresa-1', 'caixa-1', 'usuario-1', {
        tipo: TipoMovimentacaoCaixa.SAIDA,
        descricao: 'Saída',
        valor: 6,
      }),
    ).rejects.toThrow('Saldo insuficiente');
    expect(prisma.movimentacaoCaixa.create).not.toHaveBeenCalled();
    expect(prisma.caixaHistorico.create).not.toHaveBeenCalled();
  });

  it('rollback lógico se movimento ou histórico falhar', async () => {
    prisma.caixa.findFirst.mockResolvedValue(caixa(StatusCaixa.ABERTO, 10));
    prisma.caixa.findFirstOrThrow.mockResolvedValue(
      caixa(StatusCaixa.ABERTO, 15),
    );
    prisma.aberturaCaixa.findFirst.mockResolvedValue(abertura);
    const erro = new Error('movimento falhou');
    prisma.movimentacaoCaixa.create.mockRejectedValue(erro);
    await expect(
      service.criarMovimentacao('empresa-1', 'caixa-1', 'usuario-1', {
        tipo: TipoMovimentacaoCaixa.ENTRADA,
        descricao: 'Entrada',
        valor: 5,
      }),
    ).rejects.toBe(erro);
    expect(prisma.caixaHistorico.create).not.toHaveBeenCalled();
  });

  it('fecha de forma condicional com saldo consistente e histórico', async () => {
    prisma.caixa.findFirst.mockResolvedValue(caixa(StatusCaixa.ABERTO, 90));
    prisma.aberturaCaixa.findFirst.mockResolvedValue(abertura);
    await service.fechar('empresa-1', 'caixa-1', 'usuario-1', {
      saldoInformado: 89,
    });
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
    prisma.caixa.findFirst.mockResolvedValue(caixa(StatusCaixa.FECHADO));
    await expect(
      service.fechar('empresa-1', 'caixa-1', 'usuario-1', {
        saldoInformado: 0,
      }),
    ).rejects.toThrow('não está aberto');
    expect(prisma.aberturaCaixa.updateMany).not.toHaveBeenCalled();
  });

  it('rejeita perdedor concorrente do fechamento', async () => {
    prisma.caixa.findFirst.mockResolvedValue(caixa(StatusCaixa.ABERTO));
    prisma.aberturaCaixa.findFirst.mockResolvedValue(abertura);
    prisma.aberturaCaixa.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.fechar('empresa-1', 'caixa-1', 'usuario-1', {
        saldoInformado: 0,
      }),
    ).rejects.toThrow('já foi fechada');
    expect(prisma.caixaHistorico.create).not.toHaveBeenCalled();
  });

  it('impede operação em caixa de outro tenant', async () => {
    prisma.caixa.findFirst.mockResolvedValue(null);
    await expect(
      service.abrir('empresa-1', 'caixa-1', 'usuario-1', { saldoInicial: 0 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.caixa.updateMany).not.toHaveBeenCalled();
  });

  it('usa sempre a empresa operacional explícita', async () => {
    await service.abrir('empresa-1', 'caixa-1', 'super', { saldoInicial: 0 });
    expect(prisma.aberturaCaixa.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ empresaId: 'empresa-1' }),
      }),
    );
  });
  it('registra saída financeira no tx recebido com idempotência do pagamento', async () => {
    prisma.caixa.findFirst.mockResolvedValue(caixa(StatusCaixa.ABERTO, 100));
    prisma.caixa.findFirstOrThrow.mockResolvedValue(
      caixa(StatusCaixa.ABERTO, 60),
    );
    prisma.aberturaCaixa.findFirst.mockResolvedValue(abertura);

    await service.registrarMovimentacaoFinanceira(
      prisma as never,
      'empresa-1',
      {
        caixaId: 'caixa-1',
        tipo: TipoMovimentacaoCaixa.SAIDA,
        origem: OrigemMovimentacaoCaixa.CONTA_PAGAR,
        descricao: 'Pagamento da conta 1',
        valor: new Prisma.Decimal(40),
        dataMovimentacao: new Date('2026-07-20'),
        pagamentoContaPagarId: 'pagamento-1',
        usuarioId: 'usuario-1',
      },
    );

    expect(prisma.$transaction).not.toHaveBeenCalled();
    const rawCalls = prisma.$queryRaw.mock.calls as Array<[Prisma.Sql]>;
    const lock = rawCalls[0][0];
    expect(lock.values).toEqual(['caixa-1', 'empresa-1']);

    expect(prisma.caixa.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'caixa-1',
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
    prisma.caixa.findFirst.mockResolvedValue(caixa(StatusCaixa.ABERTO, 10));
    prisma.aberturaCaixa.findFirst.mockResolvedValue(abertura);
    prisma.caixa.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.registrarMovimentacaoFinanceira(prisma as never, 'empresa-1', {
        caixaId: 'caixa-1',
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

  it('trata Caixa externo como inexistente na movimentação financeira', async () => {
    prisma.caixa.findFirst.mockResolvedValue(null);

    await expect(
      service.registrarMovimentacaoFinanceira(prisma as never, 'empresa-2', {
        caixaId: 'caixa-1',
        tipo: TipoMovimentacaoCaixa.SAIDA,
        origem: OrigemMovimentacaoCaixa.CONTA_PAGAR,
        descricao: 'Pagamento',
        valor: new Prisma.Decimal(20),
        dataMovimentacao: new Date(),
      }),
    ).rejects.toThrow('Caixa não encontrado');

    expect(prisma.caixa.updateMany).not.toHaveBeenCalled();
  });

  it.each([
    { target: ['pagamentoContaPagarId'], converte: true },
    { target: 'MovimentacaoCaixa_pagamentoContaPagarId_key', converte: true },
    { target: ['pagamentoContaPagarId', 'extra'], converte: false },
    { target: ['outra'], converte: false },
    { target: 'outra_constraint', converte: false },
    { target: undefined, converte: false },
  ])(
    'trata P2002 da movimentação de forma defensiva: %o',
    async ({ target, converte }) => {
      prisma.caixa.findFirst.mockResolvedValue(caixa(StatusCaixa.ABERTO, 100));
      prisma.caixa.findFirstOrThrow.mockResolvedValue(
        caixa(StatusCaixa.ABERTO, 80),
      );
      prisma.aberturaCaixa.findFirst.mockResolvedValue(abertura);
      const erro = new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: '6.19.3',
        meta: target === undefined ? {} : { target },
      });
      prisma.movimentacaoCaixa.create.mockRejectedValue(erro);
      const resultado = service.registrarMovimentacaoFinanceira(
        prisma as never,
        'empresa-1',
        {
          caixaId: 'caixa-1',
          tipo: TipoMovimentacaoCaixa.SAIDA,
          origem: OrigemMovimentacaoCaixa.CONTA_PAGAR,
          descricao: 'Pagamento',
          valor: new Prisma.Decimal(20),
          dataMovimentacao: new Date(),
          pagamentoContaPagarId: 'pagamento-1',
        },
      );
      if (converte)
        await expect(resultado).rejects.toBeInstanceOf(ConflictException);
      else await expect(resultado).rejects.toBe(erro);
      expect(prisma.caixaHistorico.create).not.toHaveBeenCalled();
    },
  );

  describe('isolamento explícito', () => {
    it('lista caixas e conta sempre no mesmo tenant', async () => {
      prisma.caixa.findMany.mockResolvedValue([]);
      prisma.caixa.count.mockResolvedValue(0);
      await service.listar('empresa-1', { page: 1, limit: 10 });
      expect(prisma.caixa.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { empresaId: 'empresa-1' } }),
      );
      expect(prisma.caixa.count).toHaveBeenCalledWith({
        where: { empresaId: 'empresa-1' },
      });
    });

    it('lista movimentações sempre no tenant', async () => {
      prisma.movimentacaoCaixa.findMany.mockResolvedValue([]);
      prisma.movimentacaoCaixa.count.mockResolvedValue(0);
      await service.listarMovimentacoes('empresa-1', { page: 1, limit: 10 });
      expect(prisma.movimentacaoCaixa.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { empresaId: 'empresa-1' } }),
      );
      expect(prisma.movimentacaoCaixa.count).toHaveBeenCalledWith({
        where: { empresaId: 'empresa-1' },
      });
    });

    it('calcula o resumo sem agregação global', async () => {
      prisma.caixa.aggregate.mockResolvedValue({ _sum: { saldoAtual: 0 } });
      prisma.caixa.count.mockResolvedValue(0);
      prisma.movimentacaoCaixa.aggregate.mockResolvedValue({
        _sum: { valor: 0 },
      });
      prisma.movimentacaoCaixa.count.mockResolvedValue(0);
      await service.resumo('empresa-1', {});
      const chamadasCaixas = prisma.caixa.count.mock.calls as Array<
        [{ where: { empresaId: string } }]
      >;
      for (const chamada of chamadasCaixas) {
        expect(chamada[0].where).toEqual(
          expect.objectContaining({ empresaId: 'empresa-1' }),
        );
      }
      const chamadasMovimentacoes = prisma.movimentacaoCaixa.aggregate.mock
        .calls as Array<[{ where: { empresaId: string } }]>;
      for (const chamada of chamadasMovimentacoes) {
        expect(chamada[0].where).toEqual(
          expect.objectContaining({ empresaId: 'empresa-1' }),
        );
      }
    });

    it.each(['inexistente', 'externo'])(
      'retorna o mesmo 404 para Caixa %s',
      async () => {
        prisma.caixa.findFirst.mockResolvedValue(null);
        await expect(
          service.buscarPorId('empresa-1', 'caixa-x'),
        ).rejects.toThrow('Caixa não encontrado');
        expect(prisma.caixa.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'caixa-x', empresaId: 'empresa-1' },
          }),
        );
      },
    );

    it('busca abertura e lista sessões por Caixa e empresa', async () => {
      prisma.aberturaCaixa.findFirst.mockResolvedValue(abertura);
      prisma.aberturaCaixa.findMany.mockResolvedValue([]);
      await service.buscarAberturaAtiva('empresa-1', 'caixa-1');
      await service.listarAberturas('empresa-1', 'caixa-1');
      const chamadasAbertura = prisma.aberturaCaixa.findFirst.mock
        .calls as Array<[{ where: { caixaId: string; empresaId: string } }]>;
      const chamadaAbertura = chamadasAbertura[0][0];
      expect(chamadaAbertura.where).toEqual(
        expect.objectContaining({
          caixaId: 'caixa-1',
          empresaId: 'empresa-1',
        }),
      );
      expect(prisma.aberturaCaixa.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { caixaId: 'caixa-1', empresaId: 'empresa-1' },
        }),
      );
    });
  });

  describe('atualização', () => {
    it('atualiza condicionalmente e relê por id + empresaId', async () => {
      prisma.caixa.findFirst.mockResolvedValue(caixa());
      prisma.caixa.findFirstOrThrow.mockResolvedValue(caixa());
      await service.atualizar('empresa-1', 'caixa-1', 'usuario-1', {
        nome: 'Novo nome',
      });
      const chamadasAtualizacao = prisma.caixa.updateMany.mock.calls as Array<
        [{ where: { id: string; empresaId: string } }]
      >;
      const chamadaAtualizacao = chamadasAtualizacao[0][0];
      expect(chamadaAtualizacao.where).toEqual(
        expect.objectContaining({
          id: 'caixa-1',
          empresaId: 'empresa-1',
        }),
      );
      expect(prisma.caixa.findFirstOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'caixa-1', empresaId: 'empresa-1' },
        }),
      );
    });

    it('não permite desativar Caixa aberto', async () => {
      prisma.caixa.findFirst.mockResolvedValue(caixa(StatusCaixa.ABERTO));
      await expect(
        service.atualizar('empresa-1', 'caixa-1', 'usuario-1', {
          ativo: false,
        }),
      ).rejects.toThrow('Um caixa aberto não pode ser desativado');
      expect(prisma.caixa.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('origem manual', () => {
    it('aceita MANUAL no endpoint manual', async () => {
      prisma.caixa.findFirst.mockResolvedValue(caixa(StatusCaixa.ABERTO, 10));
      prisma.caixa.findFirstOrThrow.mockResolvedValue(
        caixa(StatusCaixa.ABERTO, 11),
      );
      prisma.aberturaCaixa.findFirst.mockResolvedValue(abertura);
      await expect(
        service.criarMovimentacao('empresa-1', 'caixa-1', 'usuario-1', {
          tipo: TipoMovimentacaoCaixa.ENTRADA,
          origem: OrigemMovimentacaoCaixa.MANUAL,
          descricao: 'Entrada',
          valor: 1,
        }),
      ).resolves.toBeDefined();
    });

    it.each([
      OrigemMovimentacaoCaixa.CONTA_PAGAR,
      OrigemMovimentacaoCaixa.CONTA_RECEBER,
      OrigemMovimentacaoCaixa.VENDA,
      OrigemMovimentacaoCaixa.AJUSTE,
      OrigemMovimentacaoCaixa.OUTRA,
    ])('rejeita origem automática %s sem abrir transação', async (origem) => {
      await expect(
        service.criarMovimentacao('empresa-1', 'caixa-1', 'usuario-1', {
          tipo: TipoMovimentacaoCaixa.ENTRADA,
          origem,
          descricao: 'Entrada',
          valor: 1,
        }),
      ).rejects.toThrow('A origem da movimentação manual deve ser MANUAL');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
