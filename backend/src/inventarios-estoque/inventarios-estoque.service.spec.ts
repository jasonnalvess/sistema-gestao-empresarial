/* Testes unitários com mocks: não comprovam locks, concorrência nem rollback físico do PostgreSQL. */
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  StatusInventarioEstoque,
  StatusItemInventario,
} from '@prisma/client';
import { InventariosEstoqueService } from './inventarios-estoque.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

describe('InventariosEstoqueService hardening', () => {
  const usuario: AuthenticatedUser = {
    id: 'u1',
    email: 'admin@empresa.com',
    tipo: 'ADMIN_EMPRESA',
    empresaId: 'e1',
  };
  const deposito = {
    id: 'd1',
    empresaId: 'e1',
    ativo: true,
    nome: 'Principal',
  };
  const item = (produtoId = 'p1', quantidade = '2.5') => ({
    id: `i-${produtoId}`,
    produtoId,
    quantidadeSistema: new Prisma.Decimal('1.25'),
    quantidadeContada: new Prisma.Decimal(quantidade),
    diferenca: new Prisma.Decimal(quantidade).minus('1.25'),
    observacao: null,
    status: StatusItemInventario.CONTADO,
    produto: { id: produtoId, nome: produtoId, unidadeMedida: null },
  });
  const inventario = (
    status: StatusInventarioEstoque = StatusInventarioEstoque.EM_CONTAGEM,
    itens = [item()],
  ) => ({
    id: 'inv1',
    numero: 7,
    empresaId: 'e1',
    depositoId: 'd1',
    status,
    itens,
    deposito,
    usuarioAbertura: null,
    usuarioConclusao: null,
  });
  const estoque = (produtoId = 'p1', quantidade = '1.25') => ({
    id: `s-${produtoId}`,
    empresaId: 'e1',
    produtoId,
    depositoId: 'd1',
    quantidadeAtual: new Prisma.Decimal(quantidade),
    custoMedio: new Prisma.Decimal('3.33'),
    ultimoCusto: new Prisma.Decimal('3.33'),
  });
  type EstoqueMock = ReturnType<typeof estoque>;
  type InventarioMock = ReturnType<typeof inventario>;
  type AtualizarInventarioArgs = {
    where: {
      id?: string;
      empresaId?: string;
      status?: StatusInventarioEstoque;
    };
  };
  type AtualizarItemInventarioArgs = {
    data: {
      quantidadeContada: Prisma.Decimal;
      diferenca: Prisma.Decimal;
    };
  };
  type CriarMovimentacaoArgs = {
    data: {
      quantidade: Prisma.Decimal;
      saldoAnterior: Prisma.Decimal;
      saldoPosterior: Prisma.Decimal;
    };
  };
  type BuscarEstoqueArgs = {
    where: {
      empresaId_produtoId_depositoId: {
        empresaId: string;
        produtoId: string;
        depositoId: string;
      };
    };
  };
  type BuscarItemArgs = { where: Prisma.InventarioEstoqueItemWhereInput };
  type ListarInventariosArgs = {
    where: Prisma.InventarioEstoqueWhereInput;
    orderBy: Prisma.InventarioEstoqueOrderByWithRelationInput;
  };
  type BuscarInventarioDetalheArgs = {
    where: Prisma.InventarioEstoqueWhereInput;
  };

  type CriarInventarioArgs = {
    data: {
      itens: {
        create: Array<{
          produtoId: string;
          quantidadeSistema: Prisma.Decimal;
          status: StatusItemInventario;
        }>;
      };
    };
    include: unknown;
  };

  let executarRawMock: jest.MockedFunction<
    (query: Prisma.Sql) => Promise<number>
  >;
  let buscarDepositoMock: jest.MockedFunction<
    (args: {
      where: { id: string; empresaId: string };
    }) => Promise<typeof deposito | null>
  >;
  let buscarInventarioMock: jest.MockedFunction<
    (args?: unknown) => Promise<InventarioMock | null>
  >;
  let criarInventarioMock: jest.MockedFunction<
    (args: CriarInventarioArgs) => Promise<InventarioMock>
  >;
  let buscarEstoquesMock: jest.MockedFunction<
    (args: {
      where: { empresaId: string; depositoId: string };
    }) => Promise<EstoqueMock[]>
  >;
  let tx: ReturnType<typeof criarTransactionMock>;
  let prisma: jest.Mocked<PrismaService>;
  let executarTransacaoMock!: jest.MockedFunction<
    (
      callback: (client: Prisma.TransactionClient) => Promise<unknown>,
    ) => Promise<unknown>
  >;
  let service: InventariosEstoqueService;

  function criarTransactionMock() {
    return {
      $queryRaw: jest
        .fn<Promise<Array<{ id: string }>>, [Prisma.Sql]>()
        .mockResolvedValue([{ id: 'inv1' }]),
      $executeRaw: executarRawMock,
      deposito: { findFirst: buscarDepositoMock },
      produto: {
        findMany: jest
          .fn<
            Promise<Array<{ id: string; ativo: boolean }>>,
            [{ where: { id: { in: string[] } } }]
          >()
          .mockImplementation(
            ({ where }: { where: { id: { in: string[] } } }) =>
              Promise.resolve(where.id.in.map((id) => ({ id, ativo: true }))),
          ),
      },
      inventarioEstoque: {
        findFirst: buscarInventarioMock,
        findFirstOrThrow: jest
          .fn()
          .mockResolvedValue(inventario(StatusInventarioEstoque.FINALIZADO)),
        findMany: jest.fn(),
        count: jest.fn(),
        create: criarInventarioMock,
        updateMany: jest
          .fn<Promise<{ count: number }>, [AtualizarInventarioArgs]>()
          .mockResolvedValue({ count: 1 }),
      },
      inventarioEstoqueItem: {
        findFirst: jest
          .fn<Promise<ReturnType<typeof item> | null>, [BuscarItemArgs]>()
          .mockResolvedValue(item()),
        findFirstOrThrow: jest.fn().mockResolvedValue(item()),
        updateMany: jest
          .fn<Promise<{ count: number }>, [AtualizarItemInventarioArgs]>()
          .mockResolvedValue({ count: 1 }),
      },
      estoqueProduto: {
        findMany: buscarEstoquesMock,
        findUnique: jest
          .fn<Promise<EstoqueMock | null>, [BuscarEstoqueArgs]>()
          .mockResolvedValue(estoque()),
        create: jest
          .fn()
          .mockImplementation(
            ({
              data,
            }: {
              data: { produtoId: string } & Record<string, unknown>;
            }) => ({
              id: `s-${data.produtoId}`,
              ...data,
            }),
          ),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      movimentacaoEstoque: {
        create: jest
          .fn<Promise<{ id: string }>, [CriarMovimentacaoArgs]>()
          .mockResolvedValue({ id: 'm1' }),
      },
    };
  }

  beforeEach(() => {
    executarRawMock = jest
      .fn<Promise<number>, [Prisma.Sql]>()
      .mockResolvedValue(1);
    buscarDepositoMock = jest
      .fn<
        Promise<typeof deposito | null>,
        [{ where: { id: string; empresaId: string } }]
      >()
      .mockResolvedValue(deposito);
    buscarInventarioMock = jest
      .fn<Promise<InventarioMock | null>, [unknown?]>()
      .mockResolvedValue(inventario());
    criarInventarioMock = jest
      .fn<Promise<InventarioMock>, [CriarInventarioArgs]>()
      .mockResolvedValue(inventario(StatusInventarioEstoque.ABERTO));
    buscarEstoquesMock = jest
      .fn<
        Promise<EstoqueMock[]>,
        [{ where: { empresaId: string; depositoId: string } }]
      >()
      .mockResolvedValue([estoque()]);

    tx = criarTransactionMock();
    executarTransacaoMock = jest.fn(
      (callback: (client: Prisma.TransactionClient) => Promise<unknown>) =>
        callback(tx as unknown as Prisma.TransactionClient),
    );
    prisma = {
      $transaction: executarTransacaoMock,
    } as unknown as jest.Mocked<PrismaService>;
    service = new InventariosEstoqueService(prisma);
  });

  it('cria em uma única transação e valida depósito pelo mesmo tx', async () => {
    tx.inventarioEstoque.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    await service.criar('e1', { depositoId: 'd1' }, usuario);
    expect(executarTransacaoMock).toHaveBeenCalledTimes(1);
    expect(tx.deposito.findFirst).toHaveBeenCalledWith({
      where: { id: 'd1', empresaId: 'e1' },
    });
    expect(tx.inventarioEstoque.create).toHaveBeenCalled();
    expect(tx.$executeRaw).toHaveBeenCalledTimes(2);
    expect(tx.$executeRaw.mock.calls[0][0].values).toEqual([
      'inventario-numero:e1',
    ]);
    expect(tx.$executeRaw.mock.calls[1][0].values).toEqual([
      'inventario-aberto:e1:d1',
    ]);
    expect(tx.$executeRaw.mock.invocationCallOrder[1]).toBeLessThan(
      tx.inventarioEstoque.findFirst.mock.invocationCallOrder[0],
    );
  });

  it('rejeita snapshot vazio antes de criar inventário ou itens', async () => {
    buscarInventarioMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    buscarEstoquesMock.mockResolvedValue([]);

    const criacao = service.criar('e1', { depositoId: 'd1' }, usuario);
    await expect(criacao).rejects.toBeInstanceOf(BadRequestException);
    await expect(criacao).rejects.toThrow(
      'Não existem itens de estoque cadastrados neste depósito para realizar o inventário.',
    );

    expect(buscarEstoquesMock).toHaveBeenCalledWith({
      where: { empresaId: 'e1', depositoId: 'd1' },
    });
    expect(criarInventarioMock).not.toHaveBeenCalled();
  });

  it('preserva itens com saldo zero no snapshot', async () => {
    buscarInventarioMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    buscarEstoquesMock.mockResolvedValue([estoque('p1', '0')]);

    await service.criar('e1', { depositoId: 'd1' }, usuario);

    const chamadaCriacao = criarInventarioMock.mock.calls[0];
    expect(chamadaCriacao).toBeDefined();
    const [argumentosCriacao] = chamadaCriacao;
    const itensCriados = argumentosCriacao.data.itens.create;
    expect(itensCriados).toHaveLength(1);
    const itemCriado = itensCriados[0];
    expect(itemCriado.produtoId).toBe('p1');
    expect(itemCriado.quantidadeSistema).toBeInstanceOf(Prisma.Decimal);
    expect(itemCriado.quantidadeSistema.eq(0)).toBe(true);
  });

  it('preserva rejeição de depósito inativo antes dos locks', async () => {
    buscarDepositoMock.mockResolvedValue({ ...deposito, ativo: false });

    await expect(
      service.criar('e1', { depositoId: 'd1' }, usuario),
    ).rejects.toThrow('Não é possível abrir inventário em depósito inativo');

    expect(buscarEstoquesMock).not.toHaveBeenCalled();
    expect(criarInventarioMock).not.toHaveBeenCalled();
    expect(executarRawMock).not.toHaveBeenCalled();
  });

  it('serializa criação e rejeita inventário ativo duplicado', async () => {
    tx.inventarioEstoque.findFirst.mockResolvedValueOnce(
      inventario(StatusInventarioEstoque.ABERTO),
    );
    await expect(
      service.criar('e1', { depositoId: 'd1' }, usuario),
    ).rejects.toThrow('Já existe um inventário aberto');
    expect(tx.$executeRaw.mock.invocationCallOrder[1]).toBeLessThan(
      tx.inventarioEstoque.findFirst.mock.invocationCallOrder[0],
    );
    expect(tx.inventarioEstoque.create).not.toHaveBeenCalled();
  });

  it('bloqueia a linha antes de reler e atualizar', async () => {
    await service.atualizar('e1', 'inv1', { descricao: 'Nova' }, usuario);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.inventarioEstoque.findFirst.mock.invocationCallOrder[0],
    );
    expect(
      tx.inventarioEstoque.findFirst.mock.invocationCallOrder[0],
    ).toBeLessThan(tx.inventarioEstoque.updateMany.mock.invocationCallOrder[0]);
    const sql = tx.$queryRaw.mock.calls[0][0];
    expect(sql.sql).toContain('"empresaId"');
    expect(sql.sql).toContain('FOR UPDATE');
    expect(sql.values).toEqual(['inv1', 'e1']);
  });

  it('inventário externo não é bloqueado e retorna o mesmo 404', async () => {
    tx.$queryRaw.mockResolvedValue([]);
    await expect(
      service.cancelar('e1', 'inv1', usuario),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.inventarioEstoque.findFirst).not.toHaveBeenCalled();
    expect(tx.inventarioEstoque.updateMany).not.toHaveBeenCalled();
  });

  it('contagem usa Decimal e transição condicional', async () => {
    tx.inventarioEstoque.findFirst.mockResolvedValue(
      inventario(StatusInventarioEstoque.ABERTO),
    );
    await service.contarItem(
      'e1',
      'inv1',
      'i-p1',
      { quantidadeContada: 1.35 },
      usuario,
    );
    const data = tx.inventarioEstoqueItem.updateMany.mock.calls[0][0].data;
    expect(data.quantidadeContada).toBeInstanceOf(Prisma.Decimal);
    expect(data.diferenca.eq('0.10')).toBe(true);
    expect(tx.inventarioEstoque.updateMany.mock.calls[0][0].where.status).toBe(
      StatusInventarioEstoque.ABERTO,
    );
  });

  it('count 0 na contagem aborta sem etapas posteriores', async () => {
    tx.inventarioEstoque.findFirst.mockResolvedValue(
      inventario(StatusInventarioEstoque.ABERTO),
    );
    tx.inventarioEstoque.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.contarItem(
        'e1',
        'inv1',
        'i-p1',
        { quantidadeContada: 2 },
        usuario,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.estoqueProduto.updateMany).not.toHaveBeenCalled();
  });

  it('cancelamento usa lock e updateMany condicional', async () => {
    await service.cancelar('e1', 'inv1', usuario);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.inventarioEstoque.findFirst.mock.invocationCallOrder[0],
    );
    const where = tx.inventarioEstoque.updateMany.mock.calls[0][0].where;
    expect(where).toMatchObject({
      id: 'inv1',
      empresaId: 'e1',
      status: StatusInventarioEstoque.EM_CONTAGEM,
    });
  });

  it('cancelamento concorrente derrotado não consulta resultado final', async () => {
    tx.inventarioEstoque.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.cancelar('e1', 'inv1', usuario)).rejects.toThrow();
    expect(tx.inventarioEstoque.findFirstOrThrow).not.toHaveBeenCalled();
  });

  it('duas finalizações: estado já finalizado não produz ajustes', async () => {
    tx.inventarioEstoque.findFirst.mockResolvedValue(
      inventario(StatusInventarioEstoque.FINALIZADO),
    );
    await expect(service.finalizar('e1', 'inv1', usuario)).rejects.toThrow(
      'já foi finalizado',
    );
    expect(tx.estoqueProduto.findUnique).not.toHaveBeenCalled();
  });

  it('contagem durante cancelamento vê status confirmado e falha', async () => {
    tx.inventarioEstoque.findFirst.mockResolvedValue(
      inventario(StatusInventarioEstoque.CANCELADO),
    );
    await expect(
      service.contarItem(
        'e1',
        'inv1',
        'i-p1',
        { quantidadeContada: 2 },
        usuario,
      ),
    ).rejects.toThrow('não aceita novas contagens');
    expect(tx.inventarioEstoqueItem.updateMany).not.toHaveBeenCalled();
  });

  it('ajuste positivo registra diferença e saldos exatos', async () => {
    await service.finalizar('e1', 'inv1', usuario);
    const mov = tx.movimentacaoEstoque.create.mock.calls[0][0].data;
    expect(mov.quantidade.eq('1.25')).toBe(true);
    expect(mov.saldoAnterior.eq('1.25')).toBe(true);
    expect(mov.saldoPosterior.eq('2.5')).toBe(true);
  });

  it('ajuste negativo preserva Decimal e não gera saldo negativo', async () => {
    tx.inventarioEstoque.findFirst.mockResolvedValue(
      inventario(undefined, [item('p1', '0.10')]),
    );
    tx.estoqueProduto.findUnique.mockResolvedValue(estoque('p1', '1.25'));
    await service.finalizar('e1', 'inv1', usuario);
    const mov = tx.movimentacaoEstoque.create.mock.calls[0][0].data;
    expect(mov.quantidade.eq('1.15')).toBe(true);
    expect(mov.saldoPosterior.eq('0.10')).toBe(true);
  });

  it('saldo igual não atualiza nem movimenta', async () => {
    tx.inventarioEstoque.findFirst.mockResolvedValue(
      inventario(undefined, [item('p1', '1.25')]),
    );
    await service.finalizar('e1', 'inv1', usuario);
    expect(tx.estoqueProduto.updateMany).not.toHaveBeenCalled();
    expect(tx.movimentacaoEstoque.create).not.toHaveBeenCalled();
  });

  it('saldo inexistente com contagem positiva é criado após lock', async () => {
    tx.estoqueProduto.findUnique.mockResolvedValue(null);
    await service.finalizar('e1', 'inv1', usuario);
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.estoqueProduto.findUnique.mock.invocationCallOrder[0],
    );
    expect(tx.estoqueProduto.create).toHaveBeenCalled();
    expect(tx.estoqueProduto.updateMany).toHaveBeenCalled();
  });

  it('saldo inexistente com contagem zero não é criado', async () => {
    tx.inventarioEstoque.findFirst.mockResolvedValue(
      inventario(undefined, [item('p1', '0')]),
    );
    tx.estoqueProduto.findUnique.mockResolvedValue(null);
    await service.finalizar('e1', 'inv1', usuario);
    expect(tx.estoqueProduto.create).not.toHaveBeenCalled();
    expect(tx.movimentacaoEstoque.create).not.toHaveBeenCalled();
  });

  it('ordena locks igualmente para itens em ordem inversa', async () => {
    const capturar = async (itens: ReturnType<typeof item>[]) => {
      tx.inventarioEstoque.findFirst.mockResolvedValue(
        inventario(undefined, itens),
      );
      tx.estoqueProduto.findUnique.mockImplementation(({ where }) =>
        Promise.resolve(
          estoque(where.empresaId_produtoId_depositoId.produtoId),
        ),
      );
      await service.finalizar('e1', 'inv1', usuario);
      return tx.$executeRaw.mock.calls.map(
        (call: [Prisma.Sql]) => call[0].values[0],
      );
    };
    const primeira = await capturar([item('p2', '2'), item('p1', '2')]);
    jest.clearAllMocks();
    tx.$queryRaw.mockResolvedValue([{ id: 'inv1' }]);
    tx.inventarioEstoque.findFirst.mockResolvedValue(
      inventario(undefined, [item('p1', '2'), item('p2', '2')]),
    );
    tx.inventarioEstoque.updateMany.mockResolvedValue({ count: 1 });
    tx.inventarioEstoque.findFirstOrThrow.mockResolvedValue(
      inventario(StatusInventarioEstoque.FINALIZADO),
    );
    tx.estoqueProduto.findUnique.mockImplementation(({ where }) =>
      Promise.resolve(estoque(where.empresaId_produtoId_depositoId.produtoId)),
    );
    tx.estoqueProduto.updateMany.mockResolvedValue({ count: 1 });
    tx.movimentacaoEstoque.create.mockResolvedValue({ id: 'm' });
    const segunda = await capturar([item('p1', '2'), item('p2', '2')]);
    expect(primeira).toEqual(['e1:p1:d1', 'e1:p2:d1']);
    expect(segunda).toEqual(primeira);
  });

  it.each([
    ['falha no primeiro saldo', 'update', 1],
    ['falha na movimentação', 'movement', 1],
    ['falha na segunda movimentação', 'movement', 2],
    ['falha no status', 'status', 1],
  ])('%s interrompe etapas posteriores', async (_nome, etapa, chamada) => {
    tx.inventarioEstoque.findFirst.mockResolvedValue(
      inventario(undefined, [item('p1'), item('p2')]),
    );
    tx.estoqueProduto.findUnique.mockImplementation(({ where }) =>
      Promise.resolve(estoque(where.empresaId_produtoId_depositoId.produtoId)),
    );
    if (etapa === 'update')
      tx.estoqueProduto.updateMany.mockRejectedValueOnce(new Error('falha'));
    if (etapa === 'movement') {
      if (chamada === 2)
        tx.movimentacaoEstoque.create.mockResolvedValueOnce({ id: 'm1' });
      tx.movimentacaoEstoque.create.mockRejectedValueOnce(new Error('falha'));
    }
    if (etapa === 'status')
      tx.inventarioEstoque.updateMany.mockRejectedValueOnce(new Error('falha'));
    await expect(service.finalizar('e1', 'inv1', usuario)).rejects.toThrow(
      'falha',
    );
    if (etapa !== 'status')
      expect(tx.inventarioEstoque.findFirstOrThrow).not.toHaveBeenCalled();
  });
  it('finalização derrotada por count 0 não retorna sucesso', async () => {
    tx.inventarioEstoque.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.finalizar('e1', 'inv1', usuario)).rejects.toThrow(
      'já foi alterado',
    );
    expect(tx.inventarioEstoque.findFirstOrThrow).not.toHaveBeenCalled();
  });

  it('falha ao atualizar o segundo saldo interrompe movimentações seguintes', async () => {
    tx.inventarioEstoque.findFirst.mockResolvedValue(
      inventario(undefined, [item('p1'), item('p2')]),
    );
    tx.estoqueProduto.findUnique.mockImplementation(({ where }) =>
      Promise.resolve(estoque(where.empresaId_produtoId_depositoId.produtoId)),
    );
    tx.estoqueProduto.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockRejectedValueOnce(new Error('falha segundo saldo'));
    await expect(service.finalizar('e1', 'inv1', usuario)).rejects.toThrow(
      'falha segundo saldo',
    );
    expect(tx.movimentacaoEstoque.create).toHaveBeenCalledTimes(1);
    expect(tx.inventarioEstoque.updateMany).not.toHaveBeenCalled();
  });

  it('lista com tenant, mesmo where e fallback createdAt', async () => {
    const findMany = jest
      .fn<Promise<unknown[]>, [ListarInventariosArgs]>()
      .mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prismaListagem = {
      inventarioEstoque: { findMany, count },
      $transaction: jest.fn((operacoes: Array<Promise<unknown>>) =>
        Promise.all(operacoes),
      ),
    };
    const servico = new InventariosEstoqueService(
      prismaListagem as unknown as PrismaService,
    );
    await servico.listar('e1', {
      status: StatusInventarioEstoque.ABERTO,
      depositoId: 'd1',
      search: '7',
      sortBy: 'arbitrario',
    });
    const where = findMany.mock.calls[0][0].where;
    expect(where.empresaId).toBe('e1');
    expect(where.status).toBe(StatusInventarioEstoque.ABERTO);
    expect(where.depositoId).toBe('d1');
    expect(where.OR).toContainEqual({ numero: 7 });
    expect(count).toHaveBeenCalledWith({ where });
    expect(findMany.mock.calls[0][0].orderBy).toEqual({ createdAt: 'desc' });
  });

  it('busca detalhe por id + empresaId e retorna 404 para tenant externo', async () => {
    const findFirst = jest
      .fn<Promise<null>, [BuscarInventarioDetalheArgs]>()
      .mockResolvedValue(null);
    const servico = new InventariosEstoqueService({
      inventarioEstoque: { findFirst },
    } as unknown as PrismaService);
    await expect(
      servico.buscarPorId('e1', 'inventario-externo'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(findFirst.mock.calls[0][0].where).toEqual({
      id: 'inventario-externo',
      empresaId: 'e1',
    });
  });

  it('depósito externo retorna o mesmo 404 antes dos locks', async () => {
    tx.deposito.findFirst.mockResolvedValue(null);
    await expect(
      service.criar('e1', { depositoId: 'externo' }, usuario),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.deposito.findFirst).toHaveBeenCalledWith({
      where: { id: 'externo', empresaId: 'e1' },
    });
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });

  it('produto externo impede finalização antes dos locks de saldo', async () => {
    tx.produto.findMany.mockResolvedValue([]);
    await expect(
      service.finalizar('e1', 'inv1', usuario),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.$executeRaw).not.toHaveBeenCalled();
    expect(tx.movimentacaoEstoque.create).not.toHaveBeenCalled();
  });

  it('item de outro inventário retorna 404 e não é atualizado', async () => {
    tx.inventarioEstoqueItem.findFirst.mockResolvedValue(null);
    await expect(
      service.contarItem(
        'e1',
        'inv1',
        'item-externo',
        { quantidadeContada: 1 },
        usuario,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.inventarioEstoqueItem.findFirst.mock.calls[0][0].where).toEqual({
      id: 'item-externo',
      inventarioId: 'inv1',
      inventario: { empresaId: 'e1' },
      produto: { empresaId: 'e1' },
    });
    expect(tx.inventarioEstoqueItem.updateMany).not.toHaveBeenCalled();
  });

  it('falha do advisory lock de numeração interrompe a criação', async () => {
    const erro = new Error('falha no lock');
    tx.$executeRaw.mockRejectedValue(erro);
    await expect(
      service.criar('e1', { depositoId: 'd1' }, usuario),
    ).rejects.toBe(erro);
    expect(tx.inventarioEstoque.findFirst).not.toHaveBeenCalled();
    expect(tx.inventarioEstoque.create).not.toHaveBeenCalled();
  });

  it('usa chaves de numeração diferentes para empresas diferentes', async () => {
    tx.inventarioEstoque.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    await service.criar('empresa-a', { depositoId: 'd1' }, usuario);
    const chaveA = tx.$executeRaw.mock.calls[0][0].values[0];
    jest.clearAllMocks();
    tx.deposito.findFirst.mockResolvedValue({
      ...deposito,
      empresaId: 'empresa-b',
    });
    tx.inventarioEstoque.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    tx.estoqueProduto.findMany.mockResolvedValue([estoque()]);
    tx.inventarioEstoque.create.mockResolvedValue(
      inventario(StatusInventarioEstoque.ABERTO),
    );
    await service.criar('empresa-b', { depositoId: 'd1' }, usuario);
    const chaveB = tx.$executeRaw.mock.calls[0][0].values[0];
    expect(chaveA).toBe('inventario-numero:empresa-a');
    expect(chaveB).toBe('inventario-numero:empresa-b');
  });

  it.each([
    [['empresaId', 'numero'], ConflictException],
    [['numero', 'empresaId'], ConflictException],
  ])('converte P2002 exato da numeração: %j', async (target, excecao) => {
    const erro = new Prisma.PrismaClientKnownRequestError('duplicado', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target },
    });
    tx.inventarioEstoque.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    tx.inventarioEstoque.create.mockRejectedValue(erro);
    await expect(
      service.criar('e1', { depositoId: 'd1' }, usuario),
    ).rejects.toBeInstanceOf(excecao);
  });

  it('relança P2002 com campo adicional e erro não Prisma', async () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError('duplicado', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['empresaId', 'numero', 'extra'] },
    });
    for (const erro of [p2002, new Error('falha posterior')]) {
      jest.clearAllMocks();
      tx.deposito.findFirst.mockResolvedValue(deposito);
      tx.$executeRaw.mockResolvedValue(1);
      tx.inventarioEstoque.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      tx.estoqueProduto.findMany.mockResolvedValue([estoque()]);
      tx.inventarioEstoque.create.mockRejectedValue(erro);
      await expect(
        service.criar('e1', { depositoId: 'd1' }, usuario),
      ).rejects.toBe(erro);
    }
  });

  it('converte somente P2002 exato dos itens durante a criação', async () => {
    const erro = new Prisma.PrismaClientKnownRequestError('duplicado', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['produtoId', 'inventarioId'] },
    });
    tx.inventarioEstoque.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    tx.inventarioEstoque.create.mockRejectedValue(erro);
    await expect(
      service.criar('e1', { depositoId: 'd1' }, usuario),
    ).rejects.toThrow(
      'O inventário não pode conter o mesmo produto mais de uma vez',
    );
  });

  it('P2002 do saldo é restrito à criação do Estoque na finalização', async () => {
    const erro = new Prisma.PrismaClientKnownRequestError('duplicado', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['depositoId', 'produtoId', 'empresaId'] },
    });
    tx.estoqueProduto.findUnique.mockResolvedValue(null);
    tx.estoqueProduto.create.mockRejectedValue(erro);
    await expect(
      service.finalizar('e1', 'inv1', usuario),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.movimentacaoEstoque.create).not.toHaveBeenCalled();
  });
});
