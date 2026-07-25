import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import {
  Prisma,
  StatusItemPedidoCompra,
  StatusPedidoCompra,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PedidosCompraService } from './pedidos-compra.service';

const usuario = { id: 'u1', empresaId: 'e1', tipo: 'ADMIN_EMPRESA' };
const produto = (id = 'prod1') => ({
  id,
  nome: `Produto ${id}`,
  empresaId: 'e1',
  ativo: true,
  estoqueMinimo: new Prisma.Decimal(0),
  estoqueMaximo: null,
});
const item = (
  id = 'item1',
  produtoId = 'prod1',
  solicitada: Prisma.Decimal.Value = 10,
  recebida: Prisma.Decimal.Value = 0,
  status: StatusItemPedidoCompra = StatusItemPedidoCompra.PENDENTE,
) => ({
  id,
  pedidoCompraId: 'p1',
  produtoId,
  produto: produto(produtoId),
  quantidadeSolicitada: new Prisma.Decimal(solicitada),
  quantidadeRecebida: new Prisma.Decimal(recebida),
  valorUnitario: new Prisma.Decimal('10.00'),
  valorDesconto: new Prisma.Decimal(0),
  valorTotal: new Prisma.Decimal(100),
  status,
});
const pedido = (
  status: StatusPedidoCompra = StatusPedidoCompra.APROVADO,
  itens = [item()],
) => ({
  id: 'p1',
  numero: 7,
  empresaId: 'e1',
  fornecedorId: 'f1',
  depositoId: 'd1',
  status,
  itens,
  valorDesconto: new Prisma.Decimal(0),
  valorFrete: new Prisma.Decimal(0),
  valorOutros: new Prisma.Decimal(0),
  valorTotal: new Prisma.Decimal(100),
  fornecedor: {},
  deposito: {},
  historicos: [],
});

function criarContexto() {
  const tx: any = {
    pedidoCompra: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    pedidoCompraItem: {
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    pedidoCompraHistorico: { create: jest.fn(), findMany: jest.fn() },
    estoqueProduto: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    movimentacaoEstoque: { create: jest.fn() },
    fornecedor: { findUnique: jest.fn() },
    deposito: { findUnique: jest.fn() },
    produto: { findMany: jest.fn() },
    $queryRaw: jest.fn(),
  };
  const prisma: any = {
    $transaction: jest.fn(async (operacao: (cliente: typeof tx) => unknown) =>
      operacao(tx),
    ),
    pedidoCompra: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    pedidoCompraHistorico: { findMany: jest.fn() },
  };
  tx.pedidoCompra.findUnique.mockResolvedValue(pedido());
  tx.pedidoCompra.findUniqueOrThrow.mockResolvedValue(pedido());
  tx.pedidoCompra.findFirst.mockResolvedValue(null);
  tx.pedidoCompra.create.mockResolvedValue(pedido(StatusPedidoCompra.RASCUNHO));
  tx.pedidoCompra.updateMany.mockResolvedValue({ count: 1 });
  tx.pedidoCompraItem.findMany.mockResolvedValue([
    item('item1', 'prod1', 10, 5, StatusItemPedidoCompra.PARCIALMENTE_RECEBIDO),
  ]);
  tx.pedidoCompraItem.deleteMany.mockResolvedValue({ count: 1 });
  tx.pedidoCompraItem.createMany.mockResolvedValue({ count: 1 });
  tx.estoqueProduto.findFirst.mockResolvedValue({
    id: 'est1',
    empresaId: 'e1',
    produtoId: 'prod1',
    depositoId: 'd1',
    quantidadeAtual: new Prisma.Decimal(5),
    custoMedio: new Prisma.Decimal(8),
  });
  tx.estoqueProduto.create.mockResolvedValue({
    id: 'est2',
    quantidadeAtual: new Prisma.Decimal(0),
    custoMedio: new Prisma.Decimal(0),
  });
  tx.movimentacaoEstoque.create.mockResolvedValue({ id: 'mov1' });
  tx.pedidoCompraHistorico.create.mockResolvedValue({ id: 'hist1' });
  tx.fornecedor.findUnique.mockResolvedValue({
    id: 'f1',
    empresaId: 'e1',
    ativo: true,
  });
  tx.deposito.findUnique.mockResolvedValue({
    id: 'd1',
    empresaId: 'e1',
    ativo: true,
  });
  tx.produto.findMany.mockResolvedValue([produto()]);
  return {
    tx,
    prisma,
    service: new PedidosCompraService(prisma as PrismaService),
  };
}

const dtoCriacao = {
  fornecedorId: 'f1',
  depositoId: 'd1',
  itens: [{ produtoId: 'prod1', quantidadeSolicitada: 1, valorUnitario: 10 }],
};

describe('PedidosCompraService hardening', () => {
  it('criar usa uma transação e todas as consultas críticas usam o mesmo tx', async () => {
    const { service, prisma, tx } = criarContexto();
    await service.criar(dtoCriacao, usuario);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.fornecedor.findUnique).toHaveBeenCalled();
    expect(tx.deposito.findUnique).toHaveBeenCalled();
    expect(tx.produto.findMany).toHaveBeenCalled();
    expect(tx.pedidoCompra.create).toHaveBeenCalled();
    expect(tx.pedidoCompraHistorico.create).toHaveBeenCalled();
  });

  it.each([
    ['atualizar', StatusPedidoCompra.RASCUNHO],
    ['enviarParaAprovacao', StatusPedidoCompra.RASCUNHO],
    ['aprovar', StatusPedidoCompra.PENDENTE_APROVACAO],
    ['cancelar', StatusPedidoCompra.APROVADO],
  ] as const)(
    '%s usa transação, bloqueia antes de reler e grava pelo tx',
    async (metodo, status) => {
      const { service, prisma, tx } = criarContexto();
      tx.pedidoCompra.findUnique.mockResolvedValue(pedido(status));
      tx.pedidoCompra.findUniqueOrThrow.mockResolvedValue(pedido(status));
      if (metodo === 'atualizar') {
        await service.atualizar('p1', { observacao: 'ok' }, usuario);
      } else {
        await service[metodo]('p1', usuario);
      }
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        tx.pedidoCompra.findUnique.mock.invocationCallOrder[0],
      );
      expect(tx.pedidoCompra.updateMany).toHaveBeenCalled();
      expect(tx.pedidoCompraHistorico.create).toHaveBeenCalled();
    },
  );

  it('adicionarHistorico usa transação, lock, releitura de tenant e o mesmo tx', async () => {
    const { service, prisma, tx } = criarContexto();
    await service.adicionarHistorico('p1', { descricao: 'Nota' }, usuario);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.pedidoCompra.findUnique.mock.invocationCallOrder[0],
    );
    expect(tx.pedidoCompraHistorico.create).toHaveBeenCalled();
  });

  it('recebimento parcial usa Decimal, increment e uma única transação', async () => {
    const { service, prisma, tx } = criarContexto();
    tx.pedidoCompra.findUniqueOrThrow.mockResolvedValue(
      pedido(StatusPedidoCompra.PARCIALMENTE_RECEBIDO),
    );
    const resultado = await service.receber(
      'p1',
      { itens: [{ itemId: 'item1', quantidadeRecebida: 5 }] },
      usuario,
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.estoqueProduto.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          quantidadeAtual: { increment: new Prisma.Decimal(5) },
        }),
      }),
    );
    expect(tx.pedidoCompraItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          quantidadeRecebida: { increment: new Prisma.Decimal(5) },
          status: StatusItemPedidoCompra.PARCIALMENTE_RECEBIDO,
        }),
      }),
    );
    expect(resultado.pedido.status).toBe(
      StatusPedidoCompra.PARCIALMENTE_RECEBIDO,
    );
  });

  it('recebimento total preserva saldo decimal residual exato', async () => {
    const { service, tx } = criarContexto();
    tx.pedidoCompra.findUnique.mockResolvedValue(
      pedido(StatusPedidoCompra.APROVADO, [
        item('item1', 'prod1', '1.10', '0.30'),
      ]),
    );
    tx.pedidoCompraItem.findMany.mockResolvedValue([
      item('item1', 'prod1', '1.10', '1.10', StatusItemPedidoCompra.RECEBIDO),
    ]);
    tx.pedidoCompra.findUniqueOrThrow.mockResolvedValue(
      pedido(StatusPedidoCompra.RECEBIDO),
    );
    await service.receber(
      'p1',
      { itens: [{ itemId: 'item1', quantidadeRecebida: 0.8 }] },
      usuario,
    );
    const incremento =
      tx.pedidoCompraItem.update.mock.calls[0][0].data.quantidadeRecebida
        .increment;
    expect(incremento).toBeInstanceOf(Prisma.Decimal);
    expect(incremento.eq(new Prisma.Decimal('0.8'))).toBe(true);
    expect(tx.pedidoCompraItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: StatusItemPedidoCompra.RECEBIDO,
        }),
      }),
    );
  });

  it('rejeita recebimento superior ao saldo sem efeitos', async () => {
    const { service, tx } = criarContexto();
    tx.pedidoCompra.findUnique.mockResolvedValue(
      pedido(StatusPedidoCompra.APROVADO, [
        item('item1', 'prod1', '1.10', '0.30'),
      ]),
    );
    await expect(
      service.receber(
        'p1',
        { itens: [{ itemId: 'item1', quantidadeRecebida: 0.81 }] },
        usuario,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.estoqueProduto.update).not.toHaveBeenCalled();
    expect(tx.movimentacaoEstoque.create).not.toHaveBeenCalled();
  });

  it('calcula custo médio com Decimal sem tolerância numérica', async () => {
    const { service, tx } = criarContexto();
    tx.estoqueProduto.findFirst.mockResolvedValue({
      id: 'est1',
      quantidadeAtual: new Prisma.Decimal(1),
      custoMedio: new Prisma.Decimal(10),
    });
    await service.receber(
      'p1',
      {
        itens: [
          { itemId: 'item1', quantidadeRecebida: 0.5, custoUnitario: 20 },
        ],
      },
      usuario,
    );
    const custoMedio =
      tx.estoqueProduto.update.mock.calls[0][0].data.custoMedio;
    expect(custoMedio).toBeInstanceOf(Prisma.Decimal);
    expect(
      custoMedio.eq(new Prisma.Decimal(20).div(new Prisma.Decimal('1.5'))),
    ).toBe(true);
  });

  it('itens em ordens inversas produzem a mesma ordem de advisory locks', async () => {
    const executar = async (ordem: string[]) => {
      const { service, tx } = criarContexto();
      const itens = [item('ia', 'prod-a'), item('ib', 'prod-b')];
      tx.pedidoCompra.findUnique.mockResolvedValue(
        pedido(StatusPedidoCompra.APROVADO, itens),
      );
      tx.pedidoCompraItem.findMany.mockResolvedValue([
        item(
          'ia',
          'prod-a',
          10,
          1,
          StatusItemPedidoCompra.PARCIALMENTE_RECEBIDO,
        ),
        item(
          'ib',
          'prod-b',
          10,
          1,
          StatusItemPedidoCompra.PARCIALMENTE_RECEBIDO,
        ),
      ]);
      tx.estoqueProduto.findFirst.mockResolvedValue({
        id: 'est',
        quantidadeAtual: new Prisma.Decimal(0),
        custoMedio: new Prisma.Decimal(0),
      });
      await service.receber(
        'p1',
        {
          itens: ordem.map((id) => ({ itemId: id, quantidadeRecebida: 1 })),
        },
        usuario,
      );
      return tx.$queryRaw.mock.calls
        .slice(1)
        .map((call: any[]) => call[0].values[0]);
    };
    await expect(executar(['ib', 'ia'])).resolves.toEqual([
      'e1:prod-a:d1',
      'e1:prod-b:d1',
    ]);
    await expect(executar(['ia', 'ib'])).resolves.toEqual([
      'e1:prod-a:d1',
      'e1:prod-b:d1',
    ]);
  });

  it('adquire todos os advisory locks antes de consultar estoque', async () => {
    const { service, tx } = criarContexto();
    tx.pedidoCompra.findUnique.mockResolvedValue(
      pedido(StatusPedidoCompra.APROVADO, [
        item('ia', 'prod-a'),
        item('ib', 'prod-b'),
      ]),
    );
    tx.pedidoCompraItem.findMany.mockResolvedValue([
      item('ia', 'prod-a', 10, 1, StatusItemPedidoCompra.PARCIALMENTE_RECEBIDO),
      item('ib', 'prod-b', 10, 1, StatusItemPedidoCompra.PARCIALMENTE_RECEBIDO),
    ]);
    await service.receber(
      'p1',
      {
        itens: [
          { itemId: 'ib', quantidadeRecebida: 1 },
          { itemId: 'ia', quantidadeRecebida: 1 },
        ],
      },
      usuario,
    );
    expect(tx.$queryRaw.mock.invocationCallOrder[2]).toBeLessThan(
      tx.estoqueProduto.findFirst.mock.invocationCallOrder[0],
    );
  });

  it('rejeita item duplicado antes de abrir transação', async () => {
    const { service, prisma } = criarContexto();
    await expect(
      service.receber(
        'p1',
        {
          itens: [
            { itemId: 'item1', quantidadeRecebida: 1 },
            { itemId: 'item1', quantidadeRecebida: 1 },
          ],
        },
        usuario,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejeita produto duplicado após lock e antes de efeitos de estoque', async () => {
    const { service, tx } = criarContexto();
    tx.pedidoCompra.findUnique.mockResolvedValue(
      pedido(StatusPedidoCompra.APROVADO, [
        item('ia', 'prod-a'),
        item('ib', 'prod-a'),
      ]),
    );
    await expect(
      service.receber(
        'p1',
        {
          itens: [
            { itemId: 'ia', quantidadeRecebida: 1 },
            { itemId: 'ib', quantidadeRecebida: 1 },
          ],
        },
        usuario,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.estoqueProduto.findFirst).not.toHaveBeenCalled();
  });

  it.each([
    ['aprovar × cancelar', 'aprovar', StatusPedidoCompra.CANCELADO],
    ['receber × cancelar', 'receber', StatusPedidoCompra.CANCELADO],
    [
      'atualizar × receber',
      'atualizar',
      StatusPedidoCompra.PARCIALMENTE_RECEBIDO,
    ],
  ] as const)(
    '%s: perdedor relê status confirmado e não cria histórico',
    async (_nome, metodo, status) => {
      const { service, tx } = criarContexto();
      tx.pedidoCompra.findUnique.mockResolvedValue(pedido(status));
      const acao =
        metodo === 'receber'
          ? service.receber(
              'p1',
              { itens: [{ itemId: 'item1', quantidadeRecebida: 1 }] },
              usuario,
            )
          : metodo === 'atualizar'
            ? service.atualizar('p1', { observacao: 'x' }, usuario)
            : service.aprovar('p1', usuario);
      await expect(acao).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.pedidoCompraHistorico.create).not.toHaveBeenCalled();
    },
  );

  it('updateMany com count zero derrota transição sem histórico', async () => {
    const { service, tx } = criarContexto();
    tx.pedidoCompra.findUnique.mockResolvedValue(
      pedido(StatusPedidoCompra.PENDENTE_APROVACAO),
    );
    tx.pedidoCompra.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.aprovar('p1', usuario)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(tx.pedidoCompraHistorico.create).not.toHaveBeenCalled();
  });

  it('atualização condicional com count zero não recria itens nem histórico', async () => {
    const { service, tx } = criarContexto();
    tx.pedidoCompra.findUnique.mockResolvedValue(
      pedido(StatusPedidoCompra.RASCUNHO),
    );
    tx.pedidoCompra.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.atualizar(
        'p1',
        {
          itens: [
            { produtoId: 'prod1', quantidadeSolicitada: 2, valorUnitario: 10 },
          ],
        },
        usuario,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.pedidoCompraItem.createMany).not.toHaveBeenCalled();
    expect(tx.pedidoCompraHistorico.create).not.toHaveBeenCalled();
  });
  it('segundo recebimento relê saldo/status atualizado sob lock', async () => {
    const { service, tx } = criarContexto();
    tx.pedidoCompra.findUnique.mockResolvedValue(
      pedido(StatusPedidoCompra.RECEBIDO, [
        item('item1', 'prod1', 10, 10, StatusItemPedidoCompra.RECEBIDO),
      ]),
    );
    await expect(
      service.receber(
        'p1',
        { itens: [{ itemId: 'item1', quantidadeRecebida: 1 }] },
        usuario,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.estoqueProduto.findFirst).not.toHaveBeenCalled();
  });

  it('impede efeitos para pedido de outro tenant', async () => {
    const { service, tx } = criarContexto();
    tx.pedidoCompra.findUnique.mockResolvedValue({
      ...pedido(),
      empresaId: 'e2',
    });
    await expect(service.cancelar('p1', usuario)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(tx.pedidoCompra.updateMany).not.toHaveBeenCalled();
    expect(tx.pedidoCompraHistorico.create).not.toHaveBeenCalled();
  });

  it.each([
    ['movimentação', 'movimentacaoEstoque'],
    ['histórico', 'pedidoCompraHistorico'],
    ['pedido final', 'pedidoCompraFinal'],
  ] as const)(
    'propaga falha em %s e não executa etapas posteriores',
    async (_nome, etapa) => {
      const { service, tx } = criarContexto();
      const erro = new Error(`${etapa} falhou`);
      if (etapa === 'movimentacaoEstoque') {
        tx.movimentacaoEstoque.create.mockRejectedValue(erro);
      } else if (etapa === 'pedidoCompraHistorico') {
        tx.pedidoCompraHistorico.create.mockRejectedValue(erro);
      } else {
        tx.pedidoCompra.updateMany.mockRejectedValue(erro);
      }
      await expect(
        service.receber(
          'p1',
          { itens: [{ itemId: 'item1', quantidadeRecebida: 1 }] },
          usuario,
        ),
      ).rejects.toBe(erro);
      if (etapa === 'movimentacaoEstoque') {
        expect(tx.pedidoCompra.updateMany).not.toHaveBeenCalled();
        expect(tx.pedidoCompraHistorico.create).not.toHaveBeenCalled();
      }
      if (etapa === 'pedidoCompraFinal') {
        expect(tx.pedidoCompraHistorico.create).not.toHaveBeenCalled();
      }
      expect(tx.pedidoCompra.findUniqueOrThrow).not.toHaveBeenCalled();
    },
  );

  it('cria estoque inexistente protegido pelos locks e pela chave do tenant', async () => {
    const { service, tx } = criarContexto();
    tx.estoqueProduto.findFirst.mockResolvedValue(null);
    await service.receber(
      'p1',
      { itens: [{ itemId: 'item1', quantidadeRecebida: 1 }] },
      usuario,
    );
    expect(tx.estoqueProduto.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          empresaId: 'e1',
          produtoId: 'prod1',
          depositoId: 'd1',
        }),
      }),
    );
    expect(tx.$queryRaw.mock.invocationCallOrder[1]).toBeLessThan(
      tx.estoqueProduto.findFirst.mock.invocationCallOrder[0],
    );
  });

  it('rejeita precisão monetária superior a centavos', async () => {
    const { service, tx } = criarContexto();
    await expect(
      service.criar(
        {
          ...dtoCriacao,
          itens: [
            {
              produtoId: 'prod1',
              quantidadeSolicitada: 1,
              valorUnitario: 10.001,
            },
          ],
        },
        usuario,
      ),
    ).rejects.toThrow('duas casas decimais');
    expect(tx.pedidoCompra.create).not.toHaveBeenCalled();
  });

  it.each([
    [['empresaId', 'numero'], true],
    ['PedidoCompra_empresaId_numero_key', true],
    [['outra'], false],
    ['AlgumaConstraint_desconhecida_key', false],
  ] as const)(
    'P2002 target %p é convertido somente quando conhecido',
    async (target, conhecido) => {
      const { service, tx } = criarContexto();
      const erro = new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: '6.19.3',
        meta: { target },
      });
      tx.pedidoCompra.create.mockRejectedValue(erro);
      const promessa = service.criar(dtoCriacao, usuario);
      if (conhecido) {
        await expect(promessa).rejects.toBeInstanceOf(ConflictException);
      } else {
        await expect(promessa).rejects.toBe(erro);
      }
    },
  );
});
