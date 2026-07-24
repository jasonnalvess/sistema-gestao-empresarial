/* Testes unitários com mocks: não comprovam locks, concorrência nem rollback físico do PostgreSQL. */
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  Prisma,
  StatusInventarioEstoque,
  StatusItemInventario,
} from '@prisma/client';
import { InventariosEstoqueService } from './inventarios-estoque.service';
import { PrismaService } from '../prisma/prisma.service';

describe('InventariosEstoqueService hardening', () => {
  const usuario = { id: 'u1', empresaId: 'e1', tipo: 'ADMIN_EMPRESA' };
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
  let tx: any;
  let prisma: any;
  let service: InventariosEstoqueService;

  beforeEach(() => {
    tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'inv1' }]),
      deposito: { findUnique: jest.fn().mockResolvedValue(deposito) },
      inventarioEstoque: {
        findFirst: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(inventario()),
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValue(inventario(StatusInventarioEstoque.FINALIZADO)),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest
          .fn()
          .mockResolvedValue(inventario(StatusInventarioEstoque.ABERTO)),
        update: jest.fn().mockResolvedValue(inventario()),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      inventarioEstoqueItem: { update: jest.fn().mockResolvedValue(item()) },
      estoqueProduto: {
        findMany: jest.fn().mockResolvedValue([estoque()]),
        findUnique: jest.fn().mockResolvedValue(estoque()),
        create: jest.fn().mockImplementation(({ data }: any) => ({
          id: `s-${data.produtoId}`,
          ...data,
        })),
        update: jest.fn().mockResolvedValue(estoque()),
      },
      movimentacaoEstoque: {
        create: jest.fn().mockResolvedValue({ id: 'm1' }),
      },
    };
    prisma = { $transaction: jest.fn((callback: any) => callback(tx)) };
    service = new InventariosEstoqueService(prisma as PrismaService);
  });

  it('cria em uma única transação e valida depósito pelo mesmo tx', async () => {
    await service.criar({ depositoId: 'd1' } as any, usuario);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.deposito.findUnique).toHaveBeenCalledWith({
      where: { id: 'd1' },
    });
    expect(tx.inventarioEstoque.create).toHaveBeenCalled();
  });

  it('serializa criação e rejeita inventário ativo duplicado', async () => {
    tx.inventarioEstoque.findFirst.mockResolvedValueOnce(
      inventario(StatusInventarioEstoque.ABERTO),
    );
    await expect(
      service.criar({ depositoId: 'd1' } as any, usuario),
    ).rejects.toThrow('Já existe um inventário aberto');
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.inventarioEstoque.findFirst.mock.invocationCallOrder[0],
    );
    expect(tx.inventarioEstoque.create).not.toHaveBeenCalled();
  });

  it('bloqueia a linha antes de reler e atualizar', async () => {
    await service.atualizar('inv1', { descricao: 'Nova' }, usuario);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.inventarioEstoque.findUnique.mock.invocationCallOrder[0],
    );
    expect(
      tx.inventarioEstoque.findUnique.mock.invocationCallOrder[0],
    ).toBeLessThan(tx.inventarioEstoque.update.mock.invocationCallOrder[0]);
  });

  it('impede tenant incorreto depois do lock', async () => {
    tx.inventarioEstoque.findUnique.mockResolvedValue({
      ...inventario(),
      empresaId: 'outra',
    });
    await expect(service.cancelar('inv1', usuario)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(tx.inventarioEstoque.updateMany).not.toHaveBeenCalled();
  });

  it('contagem usa Decimal e transição condicional', async () => {
    tx.inventarioEstoque.findUnique.mockResolvedValue(
      inventario(StatusInventarioEstoque.ABERTO),
    );
    await service.contarItem(
      'inv1',
      'i-p1',
      { quantidadeContada: 1.35 } as any,
      usuario,
    );
    const data = tx.inventarioEstoqueItem.update.mock.calls[0][0].data;
    expect(data.quantidadeContada).toBeInstanceOf(Prisma.Decimal);
    expect(data.diferenca.eq('0.10')).toBe(true);
    expect(tx.inventarioEstoque.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: StatusInventarioEstoque.ABERTO,
        }),
      }),
    );
  });

  it('count 0 na contagem aborta sem etapas posteriores', async () => {
    tx.inventarioEstoque.findUnique.mockResolvedValue(
      inventario(StatusInventarioEstoque.ABERTO),
    );
    tx.inventarioEstoque.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.contarItem(
        'inv1',
        'i-p1',
        { quantidadeContada: 2 } as any,
        usuario,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.estoqueProduto.update).not.toHaveBeenCalled();
  });

  it('cancelamento usa lock e updateMany condicional', async () => {
    await service.cancelar('inv1', usuario);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.inventarioEstoque.findUnique.mock.invocationCallOrder[0],
    );
    expect(tx.inventarioEstoque.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'inv1',
          empresaId: 'e1',
          status: StatusInventarioEstoque.EM_CONTAGEM,
        }),
      }),
    );
  });

  it('cancelamento concorrente derrotado não consulta resultado final', async () => {
    tx.inventarioEstoque.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.cancelar('inv1', usuario)).rejects.toThrow();
    expect(tx.inventarioEstoque.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it('duas finalizações: estado já finalizado não produz ajustes', async () => {
    tx.inventarioEstoque.findUnique.mockResolvedValue(
      inventario(StatusInventarioEstoque.FINALIZADO),
    );
    await expect(service.finalizar('inv1', usuario)).rejects.toThrow(
      'já foi finalizado',
    );
    expect(tx.estoqueProduto.findUnique).not.toHaveBeenCalled();
  });

  it('contagem durante cancelamento vê status confirmado e falha', async () => {
    tx.inventarioEstoque.findUnique.mockResolvedValue(
      inventario(StatusInventarioEstoque.CANCELADO),
    );
    await expect(
      service.contarItem(
        'inv1',
        'i-p1',
        { quantidadeContada: 2 } as any,
        usuario,
      ),
    ).rejects.toThrow('não aceita novas contagens');
    expect(tx.inventarioEstoqueItem.update).not.toHaveBeenCalled();
  });

  it('ajuste positivo registra diferença e saldos exatos', async () => {
    await service.finalizar('inv1', usuario);
    const mov = tx.movimentacaoEstoque.create.mock.calls[0][0].data;
    expect(mov.quantidade.eq('1.25')).toBe(true);
    expect(mov.saldoAnterior.eq('1.25')).toBe(true);
    expect(mov.saldoPosterior.eq('2.5')).toBe(true);
  });

  it('ajuste negativo preserva Decimal e não gera saldo negativo', async () => {
    tx.inventarioEstoque.findUnique.mockResolvedValue(
      inventario(undefined, [item('p1', '0.10')]),
    );
    tx.estoqueProduto.findUnique.mockResolvedValue(estoque('p1', '1.25'));
    await service.finalizar('inv1', usuario);
    const mov = tx.movimentacaoEstoque.create.mock.calls[0][0].data;
    expect(mov.quantidade.eq('1.15')).toBe(true);
    expect(mov.saldoPosterior.eq('0.10')).toBe(true);
  });

  it('saldo igual não atualiza nem movimenta', async () => {
    tx.inventarioEstoque.findUnique.mockResolvedValue(
      inventario(undefined, [item('p1', '1.25')]),
    );
    await service.finalizar('inv1', usuario);
    expect(tx.estoqueProduto.update).not.toHaveBeenCalled();
    expect(tx.movimentacaoEstoque.create).not.toHaveBeenCalled();
  });

  it('saldo inexistente com contagem positiva é criado após lock', async () => {
    tx.estoqueProduto.findUnique.mockResolvedValue(null);
    await service.finalizar('inv1', usuario);
    expect(tx.$queryRaw.mock.invocationCallOrder[1]).toBeLessThan(
      tx.estoqueProduto.findUnique.mock.invocationCallOrder[0],
    );
    expect(tx.estoqueProduto.create).toHaveBeenCalled();
    expect(tx.estoqueProduto.update).toHaveBeenCalled();
  });

  it('saldo inexistente com contagem zero não é criado', async () => {
    tx.inventarioEstoque.findUnique.mockResolvedValue(
      inventario(undefined, [item('p1', '0')]),
    );
    tx.estoqueProduto.findUnique.mockResolvedValue(null);
    await service.finalizar('inv1', usuario);
    expect(tx.estoqueProduto.create).not.toHaveBeenCalled();
    expect(tx.movimentacaoEstoque.create).not.toHaveBeenCalled();
  });

  it('ordena locks igualmente para itens em ordem inversa', async () => {
    const capturar = async (itens: any[]) => {
      tx.inventarioEstoque.findUnique.mockResolvedValue(
        inventario(undefined, itens),
      );
      tx.estoqueProduto.findUnique.mockImplementation(({ where }: any) =>
        estoque(where.empresaId_produtoId_depositoId.produtoId),
      );
      await service.finalizar('inv1', usuario);
      return tx.$queryRaw.mock.calls.slice(1).map((call: any[]) => call[1]);
    };
    const primeira = await capturar([item('p2', '2'), item('p1', '2')]);
    jest.clearAllMocks();
    tx.$queryRaw.mockResolvedValue([{ id: 'inv1' }]);
    tx.inventarioEstoque.findUnique.mockResolvedValue(
      inventario(undefined, [item('p1', '2'), item('p2', '2')]),
    );
    tx.inventarioEstoque.updateMany.mockResolvedValue({ count: 1 });
    tx.inventarioEstoque.findUniqueOrThrow.mockResolvedValue(
      inventario(StatusInventarioEstoque.FINALIZADO),
    );
    tx.estoqueProduto.findUnique.mockImplementation(({ where }: any) =>
      estoque(where.empresaId_produtoId_depositoId.produtoId),
    );
    tx.estoqueProduto.update.mockResolvedValue(estoque());
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
    tx.inventarioEstoque.findUnique.mockResolvedValue(
      inventario(undefined, [item('p1'), item('p2')]),
    );
    tx.estoqueProduto.findUnique.mockImplementation(({ where }: any) =>
      estoque(where.empresaId_produtoId_depositoId.produtoId),
    );
    if (etapa === 'update')
      tx.estoqueProduto.update.mockRejectedValueOnce(new Error('falha'));
    if (etapa === 'movement') {
      if (chamada === 2)
        tx.movimentacaoEstoque.create.mockResolvedValueOnce({ id: 'm1' });
      tx.movimentacaoEstoque.create.mockRejectedValueOnce(new Error('falha'));
    }
    if (etapa === 'status')
      tx.inventarioEstoque.updateMany.mockRejectedValueOnce(new Error('falha'));
    await expect(service.finalizar('inv1', usuario)).rejects.toThrow('falha');
    if (etapa !== 'status')
      expect(tx.inventarioEstoque.findUniqueOrThrow).not.toHaveBeenCalled();
  });
  it('finalização derrotada por count 0 não retorna sucesso', async () => {
    tx.inventarioEstoque.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.finalizar('inv1', usuario)).rejects.toThrow(
      'já foi alterado',
    );
    expect(tx.inventarioEstoque.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it('falha ao atualizar o segundo saldo interrompe movimentações seguintes', async () => {
    tx.inventarioEstoque.findUnique.mockResolvedValue(
      inventario(undefined, [item('p1'), item('p2')]),
    );
    tx.estoqueProduto.findUnique.mockImplementation(({ where }: any) =>
      estoque(where.empresaId_produtoId_depositoId.produtoId),
    );
    tx.estoqueProduto.update
      .mockResolvedValueOnce(estoque('p1'))
      .mockRejectedValueOnce(new Error('falha segundo saldo'));
    await expect(service.finalizar('inv1', usuario)).rejects.toThrow(
      'falha segundo saldo',
    );
    expect(tx.movimentacaoEstoque.create).toHaveBeenCalledTimes(1);
    expect(tx.inventarioEstoque.updateMany).not.toHaveBeenCalled();
  });
});
