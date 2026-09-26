import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TipoMovimentacaoEstoque } from '@prisma/client';
import { MovimentacoesEstoqueService } from './movimentacoes-estoque.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { TipoMovimentacaoEstoqueDto } from './dto/criar-movimentacao-estoque.dto';

describe('MovimentacoesEstoqueService hardening', () => {
  const usuario: AuthenticatedUser = {
    id: 'u1',
    email: 'admin@empresa.com',
    tipo: 'ADMIN_EMPRESA',
    empresaId: 'e1',
    permissoes: [
      'estoque.entradas.registrar',
      'estoque.saidas.registrar',
      'estoque.ajustes.realizar',
      'estoque.inventarios.finalizar',
      'estoque.transferencias.realizar',
    ],
  };
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
  type AtualizarEstoqueArgs = {
    data: {
      quantidadeAtual: unknown;
      custoMedio?: unknown;
    };
  };
  type CriarMovimentacaoArgs = {
    data: { saldoPosterior: Prisma.Decimal };
  };
  type ListarMovimentacoesArgs = {
    where: Prisma.MovimentacaoEstoqueWhereInput;
    orderBy: Prisma.MovimentacaoEstoqueOrderByWithRelationInput;
  };

  const estoque = (id = 's1', depositoId = 'd1', quantidade = '10.25') => ({
    id,
    empresaId: 'e1',
    produtoId: 'p1',
    depositoId,
    quantidadeAtual: new Prisma.Decimal(quantidade),
    custoMedio: new Prisma.Decimal('2.50'),
    ultimoCusto: new Prisma.Decimal('2.50'),
  });
  let tx: {
    $executeRaw: jest.MockedFunction<(query: Prisma.Sql) => Promise<number>>;
    produto: { findFirst: jest.Mock };
    deposito: { findFirst: jest.Mock };
    estoqueProduto: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      findFirstOrThrow: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.MockedFunction<
        (args: AtualizarEstoqueArgs) => Promise<{ count: number }>
      >;
    };
    movimentacaoEstoque: {
      create: jest.MockedFunction<
        (args: CriarMovimentacaoArgs) => Promise<{ id: string }>
      >;
    };
  };
  let prisma: { $transaction: jest.Mock };
  let service: MovimentacoesEstoqueService;

  beforeEach(() => {
    tx = {
      $executeRaw: jest
        .fn<Promise<number>, [Prisma.Sql]>()
        .mockResolvedValue(1),
      produto: { findFirst: jest.fn().mockResolvedValue(produto) },
      deposito: {
        findFirst: jest.fn(({ where }: { where: { id: string } }) =>
          deposito(where.id),
        ),
      },
      estoqueProduto: {
        findUnique: jest.fn().mockResolvedValue(estoque()),
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValue(estoque('s1', 'd1', '9.15')),
        findFirstOrThrow: jest
          .fn()
          .mockResolvedValue(estoque('s1', 'd1', '9.15')),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue(estoque()),
        updateMany: jest
          .fn<Promise<{ count: number }>, [AtualizarEstoqueArgs]>()
          .mockResolvedValue({ count: 1 }),
      },
      movimentacaoEstoque: {
        create: jest
          .fn<Promise<{ id: string }>, [CriarMovimentacaoArgs]>()
          .mockResolvedValue({ id: 'm1' }),
      },
    };
    prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    service = new MovimentacoesEstoqueService(
      prisma as unknown as PrismaService,
    );
  });

  it('executa entrada inteira em uma única transação e usa increment', async () => {
    await service.criar(
      'e1',
      {
        produtoId: 'p1',
        depositoId: 'd1',
        tipo: TipoMovimentacaoEstoqueDto.ENTRADA,
        quantidade: 0.1,
        custoUnitario: 3,
      },
      usuario,
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const quantidadeAtual = tx.estoqueProduto.updateMany.mock.calls[0][0].data
      .quantidadeAtual as { increment: Prisma.Decimal };
    expect(quantidadeAtual.increment).toBeInstanceOf(Prisma.Decimal);
    expect(tx.movimentacaoEstoque.create).toHaveBeenCalled();
  });

  it('preserva precisão decimal no saldo posterior e custo médio', async () => {
    await service.criar(
      'e1',
      {
        produtoId: 'p1',
        depositoId: 'd1',
        tipo: TipoMovimentacaoEstoqueDto.ENTRADA,
        quantidade: 0.1,
        custoUnitario: 3,
      },
      usuario,
    );
    const data = tx.movimentacaoEstoque.create.mock.calls[0][0].data;
    expect(data.saldoPosterior.eq(new Prisma.Decimal('10.35'))).toBe(true);
    expect(
      tx.estoqueProduto.updateMany.mock.calls[0][0].data.custoMedio,
    ).toBeInstanceOf(Prisma.Decimal);
  });

  it('impede saldo negativo e não cria movimentação', async () => {
    tx.estoqueProduto.findUnique.mockResolvedValue(estoque('s1', 'd1', '1'));
    await expect(
      service.criar(
        'e1',
        {
          produtoId: 'p1',
          depositoId: 'd1',
          tipo: TipoMovimentacaoEstoqueDto.SAIDA,
          quantidade: 2,
        },
        usuario,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.movimentacaoEstoque.create).not.toHaveBeenCalled();
  });

  it('trata derrota do decremento condicional sem efeitos posteriores', async () => {
    tx.estoqueProduto.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.criar(
        'e1',
        {
          produtoId: 'p1',
          depositoId: 'd1',
          tipo: TipoMovimentacaoEstoqueDto.SAIDA,
          quantidade: 1,
        },
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
      'e1',
      {
        produtoId: 'p1',
        depositoOrigemId: 'z',
        depositoDestinoId: 'a',
        quantidade: 1,
      },
      usuario,
    );
    expect(tx.$executeRaw).toHaveBeenCalledTimes(2);
    expect(tx.$executeRaw.mock.invocationCallOrder[1]).toBeLessThan(
      tx.estoqueProduto.findUnique.mock.invocationCallOrder[0],
    );
    const textos = tx.$executeRaw.mock.calls.map(
      (call: [Prisma.Sql]) => call[0].values[0],
    );
    expect(textos).toEqual(['e1:p1:a', 'e1:p1:z']);
  });

  it('transferência usa decrement e increment atômicos', async () => {
    tx.estoqueProduto.findUnique
      .mockResolvedValueOnce(estoque('so', 'd1', '5'))
      .mockResolvedValueOnce(estoque('sd', 'd2', '1'));
    await service.transferir(
      'e1',
      {
        produtoId: 'p1',
        depositoOrigemId: 'd1',
        depositoDestinoId: 'd2',
        quantidade: 1.25,
      },
      usuario,
    );
    const atualizacaoOrigem = tx.estoqueProduto.updateMany.mock.calls[0][0].data
      .quantidadeAtual as { decrement: Prisma.Decimal };
    const atualizacaoDestino = tx.estoqueProduto.updateMany.mock.calls[1][0]
      .data.quantidadeAtual as { increment: Prisma.Decimal };
    expect(atualizacaoOrigem.decrement).toBeInstanceOf(Prisma.Decimal);
    expect(atualizacaoDestino.increment).toBeInstanceOf(Prisma.Decimal);
    expect(tx.movimentacaoEstoque.create).toHaveBeenCalledTimes(2);
  });

  it('isola empresa na validação de produto', async () => {
    tx.produto.findFirst.mockResolvedValue(null);
    await expect(
      service.criar(
        'e1',
        {
          produtoId: 'p1',
          depositoId: 'd1',
          tipo: TipoMovimentacaoEstoqueDto.ENTRADA,
          quantidade: 1,
        },
        usuario,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.produto.findFirst).toHaveBeenCalledWith({
      where: { id: 'p1', empresaId: 'e1' },
    });
    expect(tx.estoqueProduto.findUnique).not.toHaveBeenCalled();
  });

  it('converte somente P2002 da constraint de estoque conhecida', async () => {
    const erro = new Prisma.PrismaClientKnownRequestError('duplicado', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: 'EstoqueProduto_empresaId_produtoId_depositoId_key' },
    });
    tx.estoqueProduto.findUnique.mockResolvedValue(null);
    tx.estoqueProduto.create.mockRejectedValue(erro);
    await expect(
      service.criar(
        'e1',
        {
          produtoId: 'p1',
          depositoId: 'd1',
          tipo: TipoMovimentacaoEstoqueDto.ENTRADA,
          quantidade: 1,
        },
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
    tx.estoqueProduto.findUnique.mockResolvedValue(null);
    tx.estoqueProduto.create.mockRejectedValue(erro);
    await expect(
      service.criar(
        'e1',
        {
          produtoId: 'p1',
          depositoId: 'd1',
          tipo: TipoMovimentacaoEstoqueDto.ENTRADA,
          quantidade: 1,
        },
        usuario,
      ),
    ).rejects.toBe(erro);
  });
  it('cria saldo inexistente somente depois do advisory lock', async () => {
    tx.estoqueProduto.findUnique.mockResolvedValue(null);
    tx.estoqueProduto.create.mockResolvedValue(estoque('novo', 'd1', '0'));
    await service.criar(
      'e1',
      {
        produtoId: 'p1',
        depositoId: 'd1',
        tipo: TipoMovimentacaoEstoqueDto.ENTRADA,
        quantidade: 1,
      },
      usuario,
    );
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.estoqueProduto.findUnique.mock.invocationCallOrder[0],
    );
    expect(tx.estoqueProduto.create).toHaveBeenCalledTimes(1);
  });

  it('saída suficiente usa decrement e registra saldos Decimal', async () => {
    await service.criar(
      'e1',
      {
        produtoId: 'p1',
        depositoId: 'd1',
        tipo: TipoMovimentacaoEstoqueDto.SAIDA,
        quantidade: 1.1,
      },
      usuario,
    );
    const atualizacao = tx.estoqueProduto.updateMany.mock.calls[0][0].data
      .quantidadeAtual as { decrement: Prisma.Decimal };
    expect(atualizacao.decrement).toBeInstanceOf(Prisma.Decimal);
    expect(
      tx.movimentacaoEstoque.create.mock.calls[0][0].data.saldoPosterior.eq(
        '9.15',
      ),
    ).toBe(true);
  });

  it.each([
    [TipoMovimentacaoEstoqueDto.AJUSTE, 12.5],
    [TipoMovimentacaoEstoqueDto.INVENTARIO, 0.25],
  ])('%s atribui saldo absoluto sob lock', async (tipo, quantidade) => {
    await service.criar(
      'e1',
      { produtoId: 'p1', depositoId: 'd1', tipo, quantidade },
      usuario,
    );
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.estoqueProduto.findUnique.mock.invocationCallOrder[0],
    );
    expect(
      (
        tx.estoqueProduto.updateMany.mock.calls[0][0].data
          .quantidadeAtual as Prisma.Decimal
      ).eq(quantidade),
    ).toBe(true);
  });

  it('falha na movimentação impede retorno e propaga para rollback da transação', async () => {
    const erro = new Error('falha tardia');
    tx.movimentacaoEstoque.create.mockRejectedValue(erro);
    await expect(
      service.criar(
        'e1',
        {
          produtoId: 'p1',
          depositoId: 'd1',
          tipo: TipoMovimentacaoEstoqueDto.ENTRADA,
          quantidade: 1,
        },
        usuario,
      ),
    ).rejects.toBe(erro);
  });

  it.each([
    [TipoMovimentacaoEstoqueDto.ENTRADA, 'estoque.entradas.registrar'],
    [TipoMovimentacaoEstoqueDto.SAIDA, 'estoque.saidas.registrar'],
    [TipoMovimentacaoEstoqueDto.AJUSTE, 'estoque.ajustes.realizar'],
    [TipoMovimentacaoEstoqueDto.INVENTARIO, 'estoque.inventarios.finalizar'],
  ])('exige a permissão específica para %s', async (tipo, permissao) => {
    const usuarioSemPermissao = { ...usuario, permissoes: [] };
    await expect(
      service.criar(
        'e1',
        { produtoId: 'p1', depositoId: 'd1', tipo, quantidade: 1 },
        usuarioSemPermissao,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(permissao).not.toBe('');
  });

  it('depósito externo e inexistente retornam o mesmo 404 antes do saldo', async () => {
    tx.deposito.findFirst.mockResolvedValue(null);
    await expect(
      service.criar(
        'e1',
        {
          produtoId: 'p1',
          depositoId: 'externo',
          tipo: TipoMovimentacaoEstoqueDto.ENTRADA,
          quantidade: 1,
        },
        usuario,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.deposito.findFirst).toHaveBeenCalledWith({
      where: { id: 'externo', empresaId: 'e1' },
    });
    expect(tx.estoqueProduto.findUnique).not.toHaveBeenCalled();
  });

  it('falha do advisory lock impede leitura e movimentação de saldo', async () => {
    const erro = new Error('falha no lock');
    tx.$executeRaw.mockRejectedValue(erro);
    await expect(
      service.criar(
        'e1',
        {
          produtoId: 'p1',
          depositoId: 'd1',
          tipo: TipoMovimentacaoEstoqueDto.ENTRADA,
          quantidade: 1,
        },
        usuario,
      ),
    ).rejects.toBe(erro);
    expect(tx.estoqueProduto.findUnique).not.toHaveBeenCalled();
    expect(tx.movimentacaoEstoque.create).not.toHaveBeenCalled();
  });

  it('lista com tenant, mesmo where e fallback createdAt', async () => {
    const findMany = jest
      .fn<Promise<unknown[]>, [ListarMovimentacoesArgs]>()
      .mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prismaListagem = {
      movimentacaoEstoque: { findMany, count },
      $transaction: jest.fn((operacoes: Array<Promise<unknown>>) =>
        Promise.all(operacoes),
      ),
    };
    const servico = new MovimentacoesEstoqueService(
      prismaListagem as unknown as PrismaService,
    );
    await servico.listar('e1', {
      produtoId: 'p1',
      depositoId: 'd1',
      tipo: TipoMovimentacaoEstoque.ENTRADA,
      search: 'NF-1',
      sortBy: 'arbitrario',
    });
    const where = findMany.mock.calls[0][0].where;
    expect(where.empresaId).toBe('e1');
    expect(where.produtoId).toBe('p1');
    expect(where.depositoId).toBe('d1');
    expect(where.tipo).toBe(TipoMovimentacaoEstoque.ENTRADA);
    expect(count).toHaveBeenCalledWith({ where });
    expect(findMany.mock.calls[0][0].orderBy).toEqual({ createdAt: 'desc' });
  });

  it('usa somente $executeRaw parametrizado no advisory lock', async () => {
    await service.criar(
      'e1',
      {
        produtoId: 'p1',
        depositoId: 'd1',
        tipo: TipoMovimentacaoEstoqueDto.ENTRADA,
        quantidade: 1,
      },
      usuario,
    );
    expect(tx.$executeRaw).toHaveBeenCalled();
    const sql = tx.$executeRaw.mock.calls[0][0];
    expect(sql.sql).toContain('pg_advisory_xact_lock');
    expect(sql.values).toEqual(['e1:p1:d1']);
  });
});
