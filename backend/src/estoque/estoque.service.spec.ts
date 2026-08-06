/* Testes unitários com mocks não comprovam rollback físico do PostgreSQL. */
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TipoMovimentacaoEstoque } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EstoqueService } from './estoque.service';
import { isP2002Estoque } from './estoque-transacional';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

describe('EstoqueService - rastreabilidade de saldo', () => {
  const usuario: AuthenticatedUser = {
    id: 'u1',
    email: 'admin@empresa.com',
    tipo: 'ADMIN_EMPRESA',
    empresaId: 'e1',
  };
  const produto = { id: 'p1', empresaId: 'e1', ativo: true };
  const deposito = { id: 'd1', empresaId: 'e1', ativo: true };
  type CriarMovimentacaoArgs = {
    data: {
      tipo: TipoMovimentacaoEstoque;
      quantidade: Prisma.Decimal;
      saldoAnterior: Prisma.Decimal;
      saldoPosterior: Prisma.Decimal;
      usuarioId: string;
      documentoReferencia?: string;
      observacao?: string;
    };
  };
  type AtualizarEstoqueArgs = {
    data: { quantidadeAtual?: unknown };
  };
  type ListarEstoqueArgs = {
    where: Prisma.EstoqueProdutoWhereInput;
    orderBy: Prisma.EstoqueProdutoOrderByWithRelationInput;
  };

  const estoque = (quantidade = '2.50') => ({
    id: 's1',
    empresaId: 'e1',
    produtoId: 'p1',
    depositoId: 'd1',
    quantidadeAtual: new Prisma.Decimal(quantidade),
    estoqueMinimo: new Prisma.Decimal(0),
    estoqueMaximo: null,
    custoMedio: new Prisma.Decimal(0),
    ultimoCusto: new Prisma.Decimal(0),
    produto,
    deposito,
  });
  let tx: {
    $executeRaw: jest.Mock;
    produto: { findFirst: jest.Mock };
    deposito: { findFirst: jest.Mock };
    estoqueProduto: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findFirstOrThrow: jest.Mock;
      create: jest.Mock;
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
  let service: EstoqueService;

  beforeEach(() => {
    tx = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      produto: { findFirst: jest.fn().mockResolvedValue(produto) },
      deposito: { findFirst: jest.fn().mockResolvedValue(deposito) },
      estoqueProduto: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findFirstOrThrow: jest.fn().mockResolvedValue(estoque()),
        create: jest.fn().mockResolvedValue(estoque()),
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
    service = new EstoqueService(prisma as unknown as PrismaService);
  });

  const prepararAtualizacao = (saldo = '2.50') => {
    tx.estoqueProduto.findFirst
      .mockResolvedValueOnce({
        produtoId: 'p1',
        depositoId: 'd1',
      })
      .mockResolvedValueOnce(estoque(saldo));
  };

  it('criação com saldo zero não gera movimentação', async () => {
    tx.estoqueProduto.findUnique.mockResolvedValue(null);
    await service.criar(
      'e1',
      { produtoId: 'p1', depositoId: 'd1', quantidadeAtual: 0 },
      usuario,
    );
    expect(tx.estoqueProduto.create).toHaveBeenCalledTimes(1);
    expect(tx.movimentacaoEstoque.create).not.toHaveBeenCalled();
  });

  it('criação positiva gera entrada com saldos exatos, usuário e vínculo', async () => {
    tx.estoqueProduto.findUnique.mockResolvedValue(null);
    await service.criar(
      'e1',
      { produtoId: 'p1', depositoId: 'd1', quantidadeAtual: 3.75 },
      usuario,
    );
    const movimento = tx.movimentacaoEstoque.create.mock.calls[0][0].data;
    expect(movimento.tipo).toBe(TipoMovimentacaoEstoque.ENTRADA);
    expect(movimento.quantidade.eq('3.75')).toBe(true);
    expect(movimento.saldoAnterior.eq(0)).toBe(true);
    expect(movimento.saldoPosterior.eq('3.75')).toBe(true);
    expect(movimento.usuarioId).toBe('u1');
    expect(movimento.documentoReferencia).toBe('ESTOQUE-s1');
    expect(movimento.observacao).toBe(
      'Saldo inicial informado no cadastro do estoque.',
    );
  });

  it('criação usa um único tx e bloqueia antes de consultar/criar saldo', async () => {
    tx.estoqueProduto.findUnique.mockResolvedValue(null);
    await service.criar(
      'e1',
      { produtoId: 'p1', depositoId: 'd1', quantidadeAtual: 1 },
      usuario,
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.estoqueProduto.findUnique.mock.invocationCallOrder[0],
    );
    expect(
      tx.estoqueProduto.findUnique.mock.invocationCallOrder[0],
    ).toBeLessThan(tx.estoqueProduto.create.mock.invocationCallOrder[0]);
  });

  it('motivo informado na criação é persistido', async () => {
    tx.estoqueProduto.findUnique.mockResolvedValue(null);
    await service.criar(
      'e1',
      {
        produtoId: 'p1',
        depositoId: 'd1',
        quantidadeAtual: 1,
        motivoAjuste: 'Carga inicial auditada',
      },
      usuario,
    );
    expect(tx.movimentacaoEstoque.create.mock.calls[0][0].data.observacao).toBe(
      'Carga inicial auditada',
    );
  });

  it('falha na movimentação rejeita a transação de criação', async () => {
    const erro = new Error('falha na movimentação');
    tx.estoqueProduto.findUnique.mockResolvedValue(null);
    tx.movimentacaoEstoque.create.mockRejectedValue(erro);
    await expect(
      service.criar(
        'e1',
        { produtoId: 'p1', depositoId: 'd1', quantidadeAtual: 1 },
        usuario,
      ),
    ).rejects.toBe(erro);
  });

  it('criação rejeita quantidade negativa antes de abrir transação', async () => {
    await expect(
      service.criar(
        'e1',
        { produtoId: 'p1', depositoId: 'd1', quantidadeAtual: -1 },
        usuario,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('tenant inválido aborta criação antes do saldo', async () => {
    tx.produto.findFirst.mockResolvedValue(null);
    await expect(
      service.criar(
        'e1',
        { produtoId: 'p1', depositoId: 'd1', quantidadeAtual: 1 },
        usuario,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.produto.findFirst).toHaveBeenCalledWith({
      where: { id: 'p1', empresaId: 'e1' },
    });
    expect(tx.estoqueProduto.findUnique).not.toHaveBeenCalled();
  });

  it('atualização apenas cadastral não gera movimentação', async () => {
    prepararAtualizacao();
    await service.atualizar('e1', 's1', { estoqueMinimo: 1 }, usuario);
    expect(
      tx.estoqueProduto.updateMany.mock.calls[0][0].data.quantidadeAtual,
    ).toBeUndefined();
    expect(tx.movimentacaoEstoque.create).not.toHaveBeenCalled();
  });

  it('aumento gera AJUSTE positivo com diferença Decimal', async () => {
    prepararAtualizacao('2.50');
    await service.atualizar(
      'e1',
      's1',
      { quantidadeAtual: 4.75, motivoAjuste: 'Contagem manual' },
      usuario,
    );
    const movimento = tx.movimentacaoEstoque.create.mock.calls[0][0].data;
    expect(movimento.tipo).toBe(TipoMovimentacaoEstoque.AJUSTE);
    expect(movimento.quantidade.eq('2.25')).toBe(true);
    expect(movimento.saldoAnterior.eq('2.50')).toBe(true);
    expect(movimento.saldoPosterior.eq('4.75')).toBe(true);
    expect(movimento.observacao).toBe('Contagem manual');
    expect(movimento.usuarioId).toBe('u1');
  });

  it('redução gera AJUSTE com diferença positiva e saldos corretos', async () => {
    prepararAtualizacao('4.75');
    await service.atualizar('e1', 's1', { quantidadeAtual: 1.25 }, usuario);
    const movimento = tx.movimentacaoEstoque.create.mock.calls[0][0].data;
    expect(movimento.quantidade.eq('3.50')).toBe(true);
    expect(movimento.saldoAnterior.eq('4.75')).toBe(true);
    expect(movimento.saldoPosterior.eq('1.25')).toBe(true);
    expect(movimento.observacao).toBe(
      'Ajuste manual realizado pelo cadastro de estoque (redução de saldo).',
    );
  });

  it('saldo igual é idempotente e não gera movimentação', async () => {
    prepararAtualizacao('2.50');
    await service.atualizar('e1', 's1', { quantidadeAtual: 2.5 }, usuario);
    expect(
      tx.estoqueProduto.updateMany.mock.calls[0][0].data.quantidadeAtual,
    ).toBeUndefined();
    expect(tx.movimentacaoEstoque.create).not.toHaveBeenCalled();
  });

  it('advisory lock antecede a releitura completa na atualização', async () => {
    prepararAtualizacao();
    await service.atualizar('e1', 's1', { quantidadeAtual: 3 }, usuario);
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.estoqueProduto.findFirst.mock.invocationCallOrder[1],
    );
  });

  it('atualização negativa é rejeitada sem efeitos', async () => {
    await expect(
      service.atualizar('e1', 's1', { quantidadeAtual: -0.01 }, usuario),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('falha na movimentação rejeita a atualização de saldo', async () => {
    prepararAtualizacao();
    const erro = new Error('falha tardia');
    tx.movimentacaoEstoque.create.mockRejectedValue(erro);
    await expect(
      service.atualizar('e1', 's1', { quantidadeAtual: 3 }, usuario),
    ).rejects.toBe(erro);
  });

  it('P2002 conhecido é convertido em conflito de domínio', async () => {
    const erro = new Prisma.PrismaClientKnownRequestError('duplicado', {
      code: 'P2002',
      clientVersion: 'test',
      meta: {
        target: 'EstoqueProduto_empresaId_produtoId_depositoId_key',
      },
    });
    tx.estoqueProduto.findUnique.mockResolvedValue(null);
    tx.estoqueProduto.create.mockRejectedValue(erro);
    await expect(
      service.criar(
        'e1',
        { produtoId: 'p1', depositoId: 'd1', quantidadeAtual: 1 },
        usuario,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('P2002 desconhecido é propagado sem conversão', async () => {
    const erro = new Prisma.PrismaClientKnownRequestError('duplicado', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: 'OutraConstraint_key' },
    });
    tx.estoqueProduto.findUnique.mockResolvedValue(null);
    tx.estoqueProduto.create.mockRejectedValue(erro);
    await expect(
      service.criar(
        'e1',
        { produtoId: 'p1', depositoId: 'd1', quantidadeAtual: 1 },
        usuario,
      ),
    ).rejects.toBe(erro);
  });

  it('lista sempre com o mesmo where tenant-aware e fallback updatedAt', async () => {
    const findMany = jest
      .fn<Promise<unknown[]>, [ListarEstoqueArgs]>()
      .mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prismaListagem = {
      estoqueProduto: { findMany, count },
      $transaction: jest.fn((operacoes: Array<Promise<unknown>>) =>
        Promise.all(operacoes),
      ),
    };
    const servico = new EstoqueService(
      prismaListagem as unknown as PrismaService,
    );
    await servico.listar('e1', {
      produtoId: 'p1',
      depositoId: 'd1',
      search: 'Produto',
      sortBy: 'campo-invalido',
    });
    const where = findMany.mock.calls[0][0].where;
    expect(where).toEqual({
      empresaId: 'e1',
      produtoId: 'p1',
      depositoId: 'd1',
      produto: {
        OR: [
          { nome: { contains: 'Produto', mode: 'insensitive' } },
          { codigo: { contains: 'Produto', mode: 'insensitive' } },
        ],
      },
    });
    expect(count).toHaveBeenCalledWith({ where });
    expect(findMany.mock.calls[0][0].orderBy).toEqual({ updatedAt: 'desc' });
  });

  it('busca detalhe por id + empresaId e não distingue tenant externo', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const servico = new EstoqueService({
      estoqueProduto: { findFirst },
    } as unknown as PrismaService);
    await expect(servico.buscarPorId('e1', 's-externo')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 's-externo', empresaId: 'e1' },
      include: { produto: true, deposito: true },
    });
  });

  it('falha do advisory lock interrompe o fluxo antes do saldo', async () => {
    const erro = new Error('lock indisponível');
    tx.$executeRaw.mockRejectedValue(erro);
    await expect(
      service.criar(
        'e1',
        { produtoId: 'p1', depositoId: 'd1', quantidadeAtual: 1 },
        usuario,
      ),
    ).rejects.toBe(erro);
    expect(tx.estoqueProduto.findUnique).not.toHaveBeenCalled();
    expect(tx.movimentacaoEstoque.create).not.toHaveBeenCalled();
  });

  it('P2002 exige exatamente os três campos, em qualquer ordem', () => {
    const prismaError = (target: unknown) =>
      new Prisma.PrismaClientKnownRequestError('duplicado', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target },
      });
    expect(
      isP2002Estoque(prismaError(['depositoId', 'empresaId', 'produtoId'])),
    ).toBe(true);
    expect(
      isP2002Estoque(
        prismaError(['empresaId', 'produtoId', 'depositoId', 'extra']),
      ),
    ).toBe(false);
    expect(isP2002Estoque(prismaError('prefixo_da_constraint'))).toBe(false);
  });
});
