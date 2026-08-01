import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  FormaPagamento,
  OrigemContaPagar,
  Prisma,
  StatusContaPagar,
} from '@prisma/client';
import { CaixasService } from '../caixas/caixas.service';
import { PrismaService } from '../prisma/prisma.service';
import { ContasPagarService } from './contas-pagar.service';

function criarPrismaMock() {
  const prisma = {
    fornecedor: { findFirst: jest.fn() },
    pedidoCompra: { findFirst: jest.fn() },
    contaPagar: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    pagamentoContaPagar: { create: jest.fn() },
    contaPagarHistorico: { create: jest.fn(), findMany: jest.fn() },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(async (operacao: unknown) => {
    if (Array.isArray(operacao)) return Promise.all(operacao);
    return (operacao as (tx: typeof prisma) => Promise<unknown>)(prisma);
  });
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
const fornecedor = { id: 'fornecedor-1', empresaId: 'empresa-1', ativo: true };
const pedido = {
  id: 'pedido-1',
  empresaId: 'empresa-1',
  fornecedorId: 'fornecedor-1',
  numero: 10,
  status: 'RECEBIDO',
  valorTotal: new Prisma.Decimal(100),
  fornecedor,
};
const conta = (
  status: StatusContaPagar = StatusContaPagar.PENDENTE,
  aberto = 100,
) => ({
  id: 'conta-1',
  numero: 1,
  empresaId: 'empresa-1',
  fornecedorId: 'fornecedor-1',
  pedidoCompraId: null,
  descricao: 'Conta',
  documento: null,
  status,
  valorOriginal: new Prisma.Decimal(100),
  valorDesconto: new Prisma.Decimal(0),
  valorJuros: new Prisma.Decimal(0),
  valorMulta: new Prisma.Decimal(0),
  valorPago: new Prisma.Decimal(100 - aberto),
  valorAberto: new Prisma.Decimal(aberto),
  parcelaAtual: 1,
  totalParcelas: 1,
  dataVencimento: new Date('2026-08-10'),
  pagamentos: [],
  historicos: [],
  fornecedor,
  pedidoCompra: null,
});

describe('ContasPagarService', () => {
  let prisma: PrismaMock;
  let caixas: { registrarMovimentacaoFinanceira: jest.Mock };
  let service: ContasPagarService;

  beforeEach(() => {
    prisma = criarPrismaMock();
    caixas = { registrarMovimentacaoFinanceira: jest.fn() };
    service = new ContasPagarService(
      prisma as unknown as PrismaService,
      caixas as unknown as CaixasService,
    );
    prisma.fornecedor.findFirst.mockResolvedValue(fornecedor);
    prisma.pedidoCompra.findFirst.mockResolvedValue(pedido);
    prisma.contaPagar.findFirst.mockImplementation(
      ({ where }: { where?: { id?: string } }) => (where?.id ? conta() : null),
    );
    prisma.contaPagar.findUnique.mockResolvedValue(conta());
    prisma.contaPagar.findUniqueOrThrow.mockResolvedValue(
      conta(StatusContaPagar.PAGA, 0),
    );
    prisma.contaPagar.findMany.mockResolvedValue([]);
    prisma.contaPagar.count.mockResolvedValue(0);
    prisma.contaPagar.create.mockResolvedValue(conta());
    prisma.contaPagar.update.mockResolvedValue(conta());
    prisma.contaPagar.updateMany.mockResolvedValue({ count: 1 });
    prisma.pagamentoContaPagar.create.mockResolvedValue({ id: 'pagamento-1' });
    prisma.contaPagarHistorico.create.mockResolvedValue({ id: 'historico-1' });
    prisma.contaPagarHistorico.findMany.mockResolvedValue([]);
    caixas.registrarMovimentacaoFinanceira.mockResolvedValue({
      movimentacao: { id: 'movimento-1' },
      caixa: { id: 'caixa-1' },
    });
  });

  it('cria conta manual válida e histórico no tenant', async () => {
    await service.criar(
      'empresa-1',
      {
        descricao: ' Conta ',
        dataVencimento: '2026-08-10',
        valorOriginal: 100,
        origem: OrigemContaPagar.MANUAL,
      },
      usuario,
    );
    expect(prisma.contaPagar.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          descricao: 'Conta',
        }),
      }),
    );
    expect(prisma.contaPagarHistorico.create).toHaveBeenCalled();
  });

  it('trata fornecedor de outra empresa como não encontrado', async () => {
    prisma.fornecedor.findFirst.mockResolvedValue(null);
    await expect(
      service.criar(
        'empresa-1',
        {
          descricao: 'Conta',
          dataVencimento: '2026-08-10',
          valorOriginal: 100,
          fornecedorId: 'fornecedor-1',
        },
        usuario,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.contaPagar.create).not.toHaveBeenCalled();
  });

  it.each([
    [['empresaId', 'numero'], 'numeração'],
    [['numero', 'empresaId'], 'numeração'],
    [['pedidoCompraId'], 'já possui uma conta'],
  ])('diferencia P2002 de %s', async (target, mensagem) => {
    prisma.contaPagar.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: '6.19.3',
        meta: { target },
      }),
    );
    await expect(
      service.criar(
        'empresa-1',
        {
          descricao: 'Conta',
          dataVencimento: '2026-08-10',
          valorOriginal: 100,
        },
        usuario,
      ),
    ).rejects.toThrow(mensagem);
  });

  it('propaga P2002 desconhecido', async () => {
    const erro = new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target: ['outra'] },
    });
    prisma.contaPagar.create.mockRejectedValue(erro);
    await expect(
      service.criar(
        'empresa-1',
        {
          descricao: 'Conta',
          dataVencimento: '2026-08-10',
          valorOriginal: 100,
        },
        usuario,
      ),
    ).rejects.toBe(erro);
  });

  it('não converte P2002 posterior do histórico em conflito de numeração', async () => {
    const erro = new Prisma.PrismaClientKnownRequestError('histórico', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target: ['empresaId', 'numero'] },
    });
    prisma.contaPagarHistorico.create.mockRejectedValue(erro);
    await expect(
      service.criar(
        'empresa-1',
        {
          descricao: 'Conta',
          dataVencimento: '2026-08-10',
          valorOriginal: 100,
        },
        usuario,
      ),
    ).rejects.toBe(erro);
  });

  it('gera exatamente uma conta por pedido recebido', async () => {
    prisma.contaPagar.findUnique.mockResolvedValue(null);
    await service.gerarAPartirPedidoCompra(
      'empresa-1',
      'pedido-1',
      {
        dataVencimento: '2026-08-10',
      },
      usuario,
    );
    expect(prisma.contaPagar.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pedidoCompraId: 'pedido-1',
          parcelaAtual: 1,
          totalParcelas: 1,
        }),
      }),
    );
  });

  it('rejeita pedido de outra empresa sem criar conta', async () => {
    prisma.pedidoCompra.findFirst.mockResolvedValue(null);
    await expect(
      service.gerarAPartirPedidoCompra(
        'empresa-1',
        'pedido-1',
        {
          dataVencimento: '2026-08-10',
        },
        usuario,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.contaPagar.create).not.toHaveBeenCalled();
  });

  it('rejeita origem duplicada antes da criação', async () => {
    prisma.contaPagar.findUnique.mockResolvedValue({ numero: 7 });
    await expect(
      service.gerarAPartirPedidoCompra(
        'empresa-1',
        'pedido-1',
        {
          dataVencimento: '2026-08-10',
        },
        usuario,
      ),
    ).rejects.toThrow('já possui a conta');
    expect(prisma.contaPagar.create).not.toHaveBeenCalled();
  });

  it('converte perdedor concorrente da origem pelo P2002', async () => {
    prisma.contaPagar.findUnique.mockResolvedValue(null);
    prisma.contaPagar.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: '6.19.3',
        meta: { target: ['pedidoCompraId'] },
      }),
    );
    await expect(
      service.gerarAPartirPedidoCompra(
        'empresa-1',
        'pedido-1',
        {
          dataVencimento: '2026-08-10',
        },
        usuario,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('propaga falha do histórico da geração para rollback', async () => {
    prisma.contaPagar.findUnique.mockResolvedValue(null);
    const erro = new Error('histórico falhou');
    prisma.contaPagarHistorico.create.mockRejectedValue(erro);
    await expect(
      service.gerarAPartirPedidoCompra(
        'empresa-1',
        'pedido-1',
        {
          dataVencimento: '2026-08-10',
        },
        usuario,
      ),
    ).rejects.toBe(erro);
  });

  it('registra pagamento parcial com Decimal e lock', async () => {
    prisma.contaPagar.update.mockResolvedValue(
      conta(StatusContaPagar.PARCIALMENTE_PAGA, 60),
    );
    await service.registrarPagamento(
      'empresa-1',
      'conta-1',
      {
        valor: 40,
        formaPagamento: FormaPagamento.PIX,
      },
      usuario,
    );
    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(prisma.contaPagar.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          valorPago: new Prisma.Decimal(40),
          valorAberto: new Prisma.Decimal(60),
          status: StatusContaPagar.PARCIALMENTE_PAGA,
        }),
      }),
    );
  });

  it('registra pagamento total e zera saldo', async () => {
    await service.registrarPagamento(
      'empresa-1',
      'conta-1',
      {
        valor: 100,
        formaPagamento: FormaPagamento.PIX,
      },
      usuario,
    );
    expect(prisma.contaPagar.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          valorAberto: new Prisma.Decimal(0),
          status: StatusContaPagar.PAGA,
        }),
      }),
    );
  });

  it('preserva juros, multa e desconto no cálculo', async () => {
    await service.registrarPagamento(
      'empresa-1',
      'conta-1',
      {
        valor: 105,
        juros: 5,
        multa: 2,
        desconto: 2,
        formaPagamento: FormaPagamento.PIX,
      },
      usuario,
    );
    expect(prisma.contaPagar.update).toHaveBeenCalledWith(
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
      service.registrarPagamento(
        'empresa-1',
        'conta-1',
        {
          valor,
          formaPagamento: FormaPagamento.PIX,
        },
        usuario,
      ),
    ).rejects.toThrow('valores do pagamento');
    expect(prisma.pagamentoContaPagar.create).not.toHaveBeenCalled();
  });

  it('rejeita pagamento maior que saldo sem efeitos', async () => {
    await expect(
      service.registrarPagamento(
        'empresa-1',
        'conta-1',
        {
          valor: 101,
          formaPagamento: FormaPagamento.PIX,
        },
        usuario,
      ),
    ).rejects.toThrow('maior que o saldo');
    expect(prisma.pagamentoContaPagar.create).not.toHaveBeenCalled();
    expect(caixas.registrarMovimentacaoFinanceira).not.toHaveBeenCalled();
  });

  it('rejeita conta quitada sem nova movimentação', async () => {
    prisma.contaPagar.findFirst.mockResolvedValue(
      conta(StatusContaPagar.PAGA, 0),
    );
    await expect(
      service.registrarPagamento(
        'empresa-1',
        'conta-1',
        {
          valor: 1,
          formaPagamento: FormaPagamento.PIX,
        },
        usuario,
      ),
    ).rejects.toThrow('já está paga');
    expect(prisma.pagamentoContaPagar.create).not.toHaveBeenCalled();
  });

  it('usa o mesmo tx na saída do Caixa e a empresa da conta', async () => {
    await service.registrarPagamento(
      'empresa-1',
      'conta-1',
      {
        valor: 20,
        caixaId: 'caixa-1',
        formaPagamento: FormaPagamento.PIX,
      },
      usuario,
    );
    expect(caixas.registrarMovimentacaoFinanceira).toHaveBeenCalledWith(
      prisma,
      'empresa-1',
      expect.objectContaining({
        caixaId: 'caixa-1',
        pagamentoContaPagarId: 'pagamento-1',
        valor: new Prisma.Decimal(20),
      }),
    );
    expect(prisma.caixa).toBeUndefined();
  });

  it('propaga falha do Caixa e não atualiza conta ou histórico', async () => {
    caixas.registrarMovimentacaoFinanceira.mockRejectedValue(
      new BadRequestException('Saldo insuficiente no caixa'),
    );
    await expect(
      service.registrarPagamento(
        'empresa-1',
        'conta-1',
        {
          valor: 20,
          caixaId: 'caixa-1',
          formaPagamento: FormaPagamento.PIX,
        },
        usuario,
      ),
    ).rejects.toThrow('Saldo insuficiente');
    expect(prisma.contaPagar.update).not.toHaveBeenCalled();
    expect(prisma.contaPagarHistorico.create).not.toHaveBeenCalled();
  });

  it('trata movimentação duplicada e reverte o fluxo', async () => {
    caixas.registrarMovimentacaoFinanceira.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: '6.19.3',
        meta: { target: ['pagamentoContaPagarId'] },
      }),
    );
    await expect(
      service.registrarPagamento(
        'empresa-1',
        'conta-1',
        {
          valor: 20,
          caixaId: 'caixa-1',
          formaPagamento: FormaPagamento.PIX,
        },
        usuario,
      ),
    ).rejects.toThrow('já possui movimentação');
    expect(prisma.contaPagar.update).not.toHaveBeenCalled();
  });

  it('propaga falha do pagamento sem chamar Caixa', async () => {
    const erro = new Error('pagamento falhou');
    prisma.pagamentoContaPagar.create.mockRejectedValue(erro);
    await expect(
      service.registrarPagamento(
        'empresa-1',
        'conta-1',
        {
          valor: 20,
          caixaId: 'caixa-1',
          formaPagamento: FormaPagamento.PIX,
        },
        usuario,
      ),
    ).rejects.toBe(erro);
    expect(caixas.registrarMovimentacaoFinanceira).not.toHaveBeenCalled();
  });

  it('propaga falha do histórico após efeitos para rollback transacional', async () => {
    const erro = new Error('histórico falhou');
    prisma.contaPagarHistorico.create.mockRejectedValue(erro);
    await expect(
      service.registrarPagamento(
        'empresa-1',
        'conta-1',
        {
          valor: 20,
          formaPagamento: FormaPagamento.PIX,
        },
        usuario,
      ),
    ).rejects.toBe(erro);
    expect(prisma.contaPagar.update).toHaveBeenCalled();
  });

  it('impede pagamento de outro tenant antes de efeitos', async () => {
    prisma.contaPagar.findFirst.mockResolvedValue(null);
    await expect(
      service.registrarPagamento(
        'empresa-1',
        'conta-1',
        {
          valor: 20,
          formaPagamento: FormaPagamento.PIX,
        },
        usuario,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.pagamentoContaPagar.create).not.toHaveBeenCalled();
  });

  it('SUPER_ADMIN usa exclusivamente a empresa selecionada no Caixa', async () => {
    await service.registrarPagamento(
      'empresa-1',
      'conta-1',
      {
        valor: 20,
        caixaId: 'caixa-1',
        formaPagamento: FormaPagamento.PIX,
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
      'empresa-1',
      expect.any(Object),
    );
  });

  it('cancela condicionalmente e registra histórico', async () => {
    await service.cancelar('empresa-1', 'conta-1', usuario);
    expect(prisma.contaPagar.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          empresaId: 'empresa-1',
          pagamentos: { none: {} },
        }),
      }),
    );
    expect(prisma.contaPagarHistorico.create).toHaveBeenCalled();
  });

  it('bloqueia cancelamento com pagamentos', async () => {
    prisma.contaPagar.findFirst.mockResolvedValue({
      ...conta(),
      pagamentos: [{ id: 'pagamento-1' }],
    });
    await expect(
      service.cancelar('empresa-1', 'conta-1', usuario),
    ).rejects.toThrow('com pagamentos');
    expect(prisma.contaPagar.updateMany).not.toHaveBeenCalled();
  });

  it('rejeita perdedor concorrente do cancelamento sem histórico', async () => {
    prisma.contaPagar.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.cancelar('empresa-1', 'conta-1', usuario),
    ).rejects.toThrow('foi alterada');
    expect(prisma.contaPagarHistorico.create).not.toHaveBeenCalled();
  });

  it('cancelamento repetido permanece idempotente', async () => {
    const cancelada = conta(StatusContaPagar.CANCELADA);
    prisma.contaPagar.findFirst.mockResolvedValue(cancelada);
    await expect(
      service.cancelar('empresa-1', 'conta-1', usuario),
    ).resolves.toBe(cancelada);
    expect(prisma.contaPagar.updateMany).not.toHaveBeenCalled();
  });
  it('mantém saldo de um centavo como pagamento parcial', async () => {
    await service.registrarPagamento(
      'empresa-1',
      'conta-1',
      {
        valor: 99.99,
        formaPagamento: FormaPagamento.PIX,
      },
      usuario,
    );
    expect(prisma.contaPagar.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          valorAberto: new Prisma.Decimal('0.01'),
          status: StatusContaPagar.PARCIALMENTE_PAGA,
        }),
      }),
    );
  });

  it.each([
    ['valor', { valor: 10.001 }],
    ['juros', { valor: 10, juros: 0.009 }],
    ['multa', { valor: 10, multa: 1.999 }],
    ['desconto', { valor: 10, desconto: 99.995 }],
  ])(
    'rejeita precisão inválida em %s antes dos efeitos financeiros',
    async (_campo, valores) => {
      await expect(
        service.registrarPagamento(
          'empresa-1',
          'conta-1',
          {
            ...valores,
            formaPagamento: FormaPagamento.PIX,
          },
          usuario,
        ),
      ).rejects.toThrow('duas casas decimais');
      expect(prisma.pagamentoContaPagar.create).not.toHaveBeenCalled();
      expect(caixas.registrarMovimentacaoFinanceira).not.toHaveBeenCalled();
      expect(prisma.contaPagar.update).not.toHaveBeenCalled();
    },
  );

  it('rejeita precisão inválida na criação sem persistir', async () => {
    await expect(
      service.criar(
        'empresa-1',
        {
          descricao: 'Conta',
          dataVencimento: '2026-08-10',
          valorOriginal: 10.001,
        },
        usuario,
      ),
    ).rejects.toThrow('duas casas decimais');
    expect(prisma.contaPagar.create).not.toHaveBeenCalled();
  });

  it('rejeita precisão inválida na edição sem persistir', async () => {
    await expect(
      service.atualizar(
        'empresa-1',
        'conta-1',
        { valorOriginal: 10.001 },
        usuario,
      ),
    ).rejects.toThrow('duas casas decimais');
    expect(prisma.contaPagar.update).not.toHaveBeenCalled();
  });

  it('rejeita valor interno de pedido com precisão superior a centavos', async () => {
    prisma.contaPagar.findUnique.mockResolvedValue(null);
    prisma.pedidoCompra.findFirst.mockResolvedValue({
      ...pedido,
      valorTotal: new Prisma.Decimal('100.001'),
    });
    await expect(
      service.gerarAPartirPedidoCompra(
        'empresa-1',
        'pedido-1',
        {
          dataVencimento: '2026-08-10',
        },
        usuario,
      ),
    ).rejects.toThrow('duas casas decimais');
    expect(prisma.contaPagar.create).not.toHaveBeenCalled();
  });

  it('lista e atualiza vencimentos exclusivamente no tenant, com o mesmo where', async () => {
    await service.listar('empresa-1', { search: 'Conta', page: 1, limit: 10 });
    const updateCalls = prisma.contaPagar.updateMany.mock.calls as Array<
      [Prisma.ContaPagarUpdateManyArgs]
    >;
    const findManyCalls = prisma.contaPagar.findMany.mock.calls as Array<
      [Prisma.ContaPagarFindManyArgs]
    >;
    const countCalls = prisma.contaPagar.count.mock.calls as Array<
      [Prisma.ContaPagarCountArgs]
    >;
    expect(updateCalls[0][0].where?.empresaId).toBe('empresa-1');
    expect(findManyCalls[0][0].where).toEqual(countCalls[0][0].where);
    expect(findManyCalls[0][0].where?.empresaId).toBe('empresa-1');
  });

  it('usa fallback tipado dataVencimento para sortBy inválido', async () => {
    await service.listar('empresa-1', { sortBy: 'campoArbitrario' });
    expect(prisma.contaPagar.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { dataVencimento: 'asc' } }),
    );
  });

  it('busca detalhe por id e empresaId e não distingue outro tenant', async () => {
    prisma.contaPagar.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.buscarPorId('empresa-1', 'conta-externa'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.contaPagar.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'conta-externa', empresaId: 'empresa-1' },
      }),
    );
  });

  it('inclui id e empresaId no lock antes da atualização', async () => {
    await service.atualizar(
      'empresa-1',
      'conta-1',
      { descricao: 'Nova' },
      usuario,
    );
    const rawCalls = prisma.$queryRaw.mock.calls as Array<[Prisma.Sql]>;
    const sql = rawCalls[0][0];
    expect(sql.values).toEqual(['conta-1', 'empresa-1']);
    expect(prisma.contaPagar.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'conta-1', empresaId: 'empresa-1' },
      }),
    );
  });

  it.each([
    { target: ['numero', 'empresaId', 'extra'] },
    { target: 'ContaPagar_empresaId_numero_key' },
    {},
  ])(
    'não converte P2002 de numeração com metadata inválida: %o',
    async (meta) => {
      const erro = new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: '6.19.3',
        meta,
      });
      prisma.contaPagar.create.mockRejectedValue(erro);
      await expect(
        service.criar(
          'empresa-1',
          {
            descricao: 'Conta',
            dataVencimento: '2026-08-10',
            valorOriginal: 100,
          },
          usuario,
        ),
      ).rejects.toBe(erro);
    },
  );

  it('valida e cria histórico manual atomicamente no tenant', async () => {
    await service.adicionarHistorico(
      'empresa-1',
      'conta-1',
      { descricao: ' Anotação ' },
      usuario,
    );
    expect(prisma.contaPagar.findFirst).toHaveBeenCalledWith({
      where: { id: 'conta-1', empresaId: 'empresa-1' },
      select: { id: true },
    });
    const historicoCalls = prisma.contaPagarHistorico.create.mock
      .calls as Array<[Prisma.ContaPagarHistoricoCreateArgs]>;
    expect(historicoCalls[0][0].data.contaPagarId).toBe('conta-1');
  });

  it('resume valores exclusivamente no tenant e preserva o período', async () => {
    prisma.contaPagar.aggregate
      .mockResolvedValueOnce({
        _sum: {
          valorOriginal: new Prisma.Decimal('300.30'),
          valorPago: new Prisma.Decimal('100.10'),
          valorAberto: new Prisma.Decimal('200.20'),
        },
      })
      .mockResolvedValueOnce({
        _sum: {
          valorAberto: new Prisma.Decimal('50.05'),
        },
      });

    const resultado = await service.obterResumo('empresa-1', {
      vencimentoInicio: '2026-08-01',
      vencimentoFim: '2026-08-31',
    });

    expect(prisma.contaPagar.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ empresaId: 'empresa-1' }) as unknown,
      }),
    );

    const aggregateCalls = prisma.contaPagar.aggregate.mock.calls as Array<
      [Prisma.ContaPagarAggregateArgs]
    >;
    const whereTotais = aggregateCalls[0][0].where;
    const whereVencidas = aggregateCalls[1][0].where;

    expect(whereTotais).toEqual({
      empresaId: 'empresa-1',
      status: { not: StatusContaPagar.CANCELADA },
      dataVencimento: {
        gte: new Date('2026-08-01'),
        lte: new Date('2026-08-31T23:59:59.999Z'),
      },
    });
    expect(whereVencidas).toEqual({
      ...whereTotais,
      status: StatusContaPagar.VENCIDA,
    });
    expect(resultado).toEqual({
      pagar: {
        valorOriginal: 300.3,
        valorPago: 100.1,
        valorAberto: 200.2,
        valorVencido: 50.05,
      },
    });
  });

  it('retorna zeros quando o tenant não possui contas', async () => {
    prisma.contaPagar.aggregate
      .mockResolvedValueOnce({ _sum: {} })
      .mockResolvedValueOnce({ _sum: {} });

    await expect(service.obterResumo('empresa-1', {})).resolves.toEqual({
      pagar: {
        valorOriginal: 0,
        valorPago: 0,
        valorAberto: 0,
        valorVencido: 0,
      },
    });
  });

  it('mantém resumos de empresas diferentes independentes e sem modo global', async () => {
    prisma.contaPagar.aggregate
      .mockResolvedValueOnce({
        _sum: {
          valorOriginal: new Prisma.Decimal(10),
          valorPago: new Prisma.Decimal(1),
          valorAberto: new Prisma.Decimal(9),
        },
      })
      .mockResolvedValueOnce({
        _sum: { valorAberto: new Prisma.Decimal(2) },
      })
      .mockResolvedValueOnce({
        _sum: {
          valorOriginal: new Prisma.Decimal(20),
          valorPago: new Prisma.Decimal(4),
          valorAberto: new Prisma.Decimal(16),
        },
      })
      .mockResolvedValueOnce({
        _sum: { valorAberto: new Prisma.Decimal(3) },
      });

    const resumoA = await service.obterResumo('empresa-a', {});
    const resumoB = await service.obterResumo('empresa-b', {});

    const aggregateCalls = prisma.contaPagar.aggregate.mock.calls as Array<
      [Prisma.ContaPagarAggregateArgs]
    >;
    expect(aggregateCalls[0][0].where?.empresaId).toBe('empresa-a');
    expect(aggregateCalls[1][0].where?.empresaId).toBe('empresa-a');
    expect(aggregateCalls[2][0].where?.empresaId).toBe('empresa-b');
    expect(aggregateCalls[3][0].where?.empresaId).toBe('empresa-b');
    expect(resumoA.pagar.valorOriginal).toBe(10);
    expect(resumoB.pagar.valorOriginal).toBe(20);
  });
});
