import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma, TipoMovimentacaoEstoque } from '@prisma/client';
import { MovimentacoesEstoqueService } from './movimentacoes-estoque.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MovimentacoesEstoqueService hardening', () => {
  const usuario = { id: 'u1', empresaId: 'e1' };
  const produto = {
    id: 'p1',
    empresaId: 'e1',
    ativo: true,
    estoqueMinimo: new Prisma.Decimal(0),
    estoqueMaximo: null,
  };
  const deposito = (id: string) => ({
    id,
    empresaId: 'e1',
    ativo: true,
    nome: id,
  });
  const estoque = (id = 's1', depositoId = 'd1', quantidade = '10.25') => ({
    id,
    empresaId: 'e1',
    produtoId: 'p1',
    depositoId,
    quantidadeAtual: new Prisma.Decimal(quantidade),
    custoMedio: new Prisma.Decimal('2.50'),
    ultimoCusto: new Prisma.Decimal('2.50'),
  });
  let tx: any;
  let prisma: any;
  let service: MovimentacoesEstoqueService;

  beforeEach(() => {
    tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ pg_advisory_xact_lock: null }]),
      produto: { findUnique: jest.fn().mockResolvedValue(produto) },
      deposito: { findUnique: jest.fn(({ where }: any) => deposito(where.id)) },
      estoqueProduto: {
        findUnique: jest.fn().mockResolvedValue(estoque()),
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValue(estoque('s1', 'd1', '9.15')),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue(estoque()),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      movimentacaoEstoque: {
        create: jest.fn().mockResolvedValue({ id: 'm1' }),
      },
    };
    prisma = { $transaction: jest.fn((callback: any) => callback(tx)) };
    service = new MovimentacoesEstoqueService(prisma as PrismaService);
  });

  it('executa entrada inteira em uma única transação e usa increment', async () => {
    await service.criar(
      {
        produtoId: 'p1',
        depositoId: 'd1',
        tipo: TipoMovimentacaoEstoque.ENTRADA,
        quantidade: 0.1,
        custoUnitario: 3,
      } as any,
      usuario,
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.estoqueProduto.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          quantidadeAtual: { increment: expect.any(Prisma.Decimal) },
        }),
      }),
    );
    expect(tx.movimentacaoEstoque.create).toHaveBeenCalled();
  });

  it('preserva precisão decimal no saldo posterior e custo médio', async () => {
    await service.criar(
      {
        produtoId: 'p1',
        depositoId: 'd1',
        tipo: TipoMovimentacaoEstoque.ENTRADA,
        quantidade: 0.1,
        custoUnitario: 3,
      } as any,
      usuario,
    );
    const data = tx.movimentacaoEstoque.create.mock.calls[0][0].data;
    expect(data.saldoPosterior.eq(new Prisma.Decimal('10.35'))).toBe(true);
    expect(
      tx.estoqueProduto.update.mock.calls[0][0].data.custoMedio,
    ).toBeInstanceOf(Prisma.Decimal);
  });

  it('impede saldo negativo e não cria movimentação', async () => {
    tx.estoqueProduto.findUnique.mockResolvedValue(estoque('s1', 'd1', '1'));
    await expect(
      service.criar(
        {
          produtoId: 'p1',
          depositoId: 'd1',
          tipo: TipoMovimentacaoEstoque.SAIDA,
          quantidade: 2,
        } as any,
        usuario,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.movimentacaoEstoque.create).not.toHaveBeenCalled();
  });

  it('trata derrota do decremento condicional sem efeitos posteriores', async () => {
    tx.estoqueProduto.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.criar(
        {
          produtoId: 'p1',
          depositoId: 'd1',
          tipo: TipoMovimentacaoEstoque.SAIDA,
          quantidade: 1,
        } as any,
        usuario,
      ),
    ).rejects.toThrow();
    expect(tx.movimentacaoEstoque.create).not.toHaveBeenCalled();
  });

  it('adquire locks da transferência em ordem determinística antes das consultas de estoque', async () => {
    tx.estoqueProduto.findUnique
      .mockResolvedValueOnce(estoque('so', 'z', '5'))
      .mockResolvedValueOnce(estoque('sd', 'a', '1'));
    tx.estoqueProduto.findUniqueOrThrow.mockResolvedValue(
      estoque('so', 'z', '4'),
    );
    await service.transferir(
      {
        produtoId: 'p1',
        depositoOrigemId: 'z',
        depositoDestinoId: 'a',
        quantidade: 1,
      } as any,
      usuario,
    );
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    expect(tx.$queryRaw.mock.invocationCallOrder[1]).toBeLessThan(
      tx.estoqueProduto.findUnique.mock.invocationCallOrder[0],
    );
    const textos = tx.$queryRaw.mock.calls.map((call: any[]) => call[1]);
    expect(textos).toEqual(['e1:p1:a', 'e1:p1:z']);
  });

  it('transferência usa decrement e increment atômicos', async () => {
    tx.estoqueProduto.findUnique
      .mockResolvedValueOnce(estoque('so', 'd1', '5'))
      .mockResolvedValueOnce(estoque('sd', 'd2', '1'));
    await service.transferir(
      {
        produtoId: 'p1',
        depositoOrigemId: 'd1',
        depositoDestinoId: 'd2',
        quantidade: 1.25,
      } as any,
      usuario,
    );
    expect(
      tx.estoqueProduto.updateMany.mock.calls[0][0].data.quantidadeAtual
        .decrement,
    ).toBeInstanceOf(Prisma.Decimal);
    expect(
      tx.estoqueProduto.update.mock.calls[0][0].data.quantidadeAtual.increment,
    ).toBeInstanceOf(Prisma.Decimal);
    expect(tx.movimentacaoEstoque.create).toHaveBeenCalledTimes(2);
  });

  it('isola empresa na validação de produto', async () => {
    tx.produto.findUnique.mockResolvedValue({ ...produto, empresaId: 'outra' });
    await expect(
      service.criar(
        {
          produtoId: 'p1',
          depositoId: 'd1',
          tipo: TipoMovimentacaoEstoque.ENTRADA,
          quantidade: 1,
        } as any,
        usuario,
      ),
    ).rejects.toThrow();
    expect(tx.estoqueProduto.findUnique).not.toHaveBeenCalled();
  });

  it('converte somente P2002 da constraint de estoque conhecida', async () => {
    const erro = new Prisma.PrismaClientKnownRequestError('duplicado', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: 'EstoqueProduto_empresaId_produtoId_depositoId_key' },
    });
    prisma.$transaction.mockRejectedValue(erro);
    await expect(
      service.criar(
        {
          produtoId: 'p1',
          depositoId: 'd1',
          tipo: TipoMovimentacaoEstoque.ENTRADA,
          quantidade: 1,
        } as any,
        usuario,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('propaga P2002 desconhecido sem conversão', async () => {
    const erro = new Prisma.PrismaClientKnownRequestError('duplicado', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: 'Outra_key' },
    });
    prisma.$transaction.mockRejectedValue(erro);
    await expect(
      service.criar(
        {
          produtoId: 'p1',
          depositoId: 'd1',
          tipo: TipoMovimentacaoEstoque.ENTRADA,
          quantidade: 1,
        } as any,
        usuario,
      ),
    ).rejects.toBe(erro);
  });
  it('cria saldo inexistente somente depois do advisory lock', async () => {
    tx.estoqueProduto.findUnique.mockResolvedValue(null);
    tx.estoqueProduto.create.mockResolvedValue(estoque('novo', 'd1', '0'));
    await service.criar(
      {
        produtoId: 'p1',
        depositoId: 'd1',
        tipo: TipoMovimentacaoEstoque.ENTRADA,
        quantidade: 1,
      } as any,
      usuario,
    );
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.estoqueProduto.findUnique.mock.invocationCallOrder[0],
    );
    expect(tx.estoqueProduto.create).toHaveBeenCalledTimes(1);
  });

  it('saída suficiente usa decrement e registra saldos Decimal', async () => {
    await service.criar(
      {
        produtoId: 'p1',
        depositoId: 'd1',
        tipo: TipoMovimentacaoEstoque.SAIDA,
        quantidade: 1.1,
      } as any,
      usuario,
    );
    expect(
      tx.estoqueProduto.updateMany.mock.calls[0][0].data.quantidadeAtual
        .decrement,
    ).toBeInstanceOf(Prisma.Decimal);
    expect(
      tx.movimentacaoEstoque.create.mock.calls[0][0].data.saldoPosterior.eq(
        '9.15',
      ),
    ).toBe(true);
  });

  it.each([
    ['AJUSTE', '12.5'],
    ['INVENTARIO', '0.25'],
  ])('%s atribui saldo absoluto sob lock', async (tipo, quantidade) => {
    await service.criar(
      { produtoId: 'p1', depositoId: 'd1', tipo, quantidade } as any,
      usuario,
    );
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.estoqueProduto.findUnique.mock.invocationCallOrder[0],
    );
    expect(
      tx.estoqueProduto.update.mock.calls[0][0].data.quantidadeAtual.eq(
        quantidade,
      ),
    ).toBe(true);
  });

  it('falha na movimentação impede retorno e propaga para rollback da transação', async () => {
    const erro = new Error('falha tardia');
    tx.movimentacaoEstoque.create.mockRejectedValue(erro);
    await expect(
      service.criar(
        {
          produtoId: 'p1',
          depositoId: 'd1',
          tipo: TipoMovimentacaoEstoque.ENTRADA,
          quantidade: 1,
        } as any,
        usuario,
      ),
    ).rejects.toBe(erro);
  });
});
