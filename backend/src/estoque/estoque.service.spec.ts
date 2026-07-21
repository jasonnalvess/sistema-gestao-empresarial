/* Testes unitários com mocks não comprovam rollback físico do PostgreSQL. */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, TipoMovimentacaoEstoque } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EstoqueService } from './estoque.service';

describe('EstoqueService - rastreabilidade de saldo', () => {
  const usuario = { id: 'u1', empresaId: 'e1' };
  const produto = { id: 'p1', empresaId: 'e1', ativo: true };
  const deposito = { id: 'd1', empresaId: 'e1', ativo: true };
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
  let tx: any;
  let prisma: any;
  let service: EstoqueService;

  beforeEach(() => {
    tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ pg_advisory_xact_lock: null }]),
      produto: { findUnique: jest.fn().mockResolvedValue(produto) },
      deposito: { findUnique: jest.fn().mockResolvedValue(deposito) },
      estoqueProduto: {
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue(estoque()),
        update: jest.fn().mockResolvedValue(estoque()),
      },
      movimentacaoEstoque: {
        create: jest.fn().mockResolvedValue({ id: 'm1' }),
      },
    };
    prisma = { $transaction: jest.fn((callback: any) => callback(tx)) };
    service = new EstoqueService(prisma as PrismaService);
  });

  const prepararAtualizacao = (saldo = '2.50') => {
    tx.estoqueProduto.findUnique
      .mockResolvedValueOnce({
        empresaId: 'e1',
        produtoId: 'p1',
        depositoId: 'd1',
      })
      .mockResolvedValueOnce(estoque(saldo));
  };

  it('criação com saldo zero não gera movimentação', async () => {
    tx.estoqueProduto.findUnique.mockResolvedValue(null);
    await service.criar(
      { produtoId: 'p1', depositoId: 'd1', quantidadeAtual: 0 },
      usuario,
    );
    expect(tx.estoqueProduto.create).toHaveBeenCalledTimes(1);
    expect(tx.movimentacaoEstoque.create).not.toHaveBeenCalled();
  });

  it('criação positiva gera entrada com saldos exatos, usuário e vínculo', async () => {
    tx.estoqueProduto.findUnique.mockResolvedValue(null);
    await service.criar(
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
      { produtoId: 'p1', depositoId: 'd1', quantidadeAtual: 1 },
      usuario,
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.estoqueProduto.findUnique.mock.invocationCallOrder[0],
    );
    expect(
      tx.estoqueProduto.findUnique.mock.invocationCallOrder[0],
    ).toBeLessThan(tx.estoqueProduto.create.mock.invocationCallOrder[0]);
  });

  it('motivo informado na criação é persistido', async () => {
    tx.estoqueProduto.findUnique.mockResolvedValue(null);
    await service.criar(
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
        { produtoId: 'p1', depositoId: 'd1', quantidadeAtual: 1 },
        usuario,
      ),
    ).rejects.toBe(erro);
  });

  it('criação rejeita quantidade negativa antes de abrir transação', async () => {
    await expect(
      service.criar(
        { produtoId: 'p1', depositoId: 'd1', quantidadeAtual: -1 },
        usuario,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('tenant inválido aborta criação antes do saldo', async () => {
    tx.produto.findUnique.mockResolvedValue({ ...produto, empresaId: 'outra' });
    await expect(
      service.criar(
        { produtoId: 'p1', depositoId: 'd1', quantidadeAtual: 1 },
        usuario,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.estoqueProduto.findUnique).not.toHaveBeenCalled();
  });

  it('atualização apenas cadastral não gera movimentação', async () => {
    prepararAtualizacao();
    await service.atualizar('s1', { estoqueMinimo: 1 }, usuario);
    expect(tx.estoqueProduto.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ quantidadeAtual: undefined }),
      }),
    );
    expect(tx.movimentacaoEstoque.create).not.toHaveBeenCalled();
  });

  it('aumento gera AJUSTE positivo com diferença Decimal', async () => {
    prepararAtualizacao('2.50');
    await service.atualizar(
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
    await service.atualizar('s1', { quantidadeAtual: 1.25 }, usuario);
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
    await service.atualizar('s1', { quantidadeAtual: 2.5 }, usuario);
    expect(
      tx.estoqueProduto.update.mock.calls[0][0].data.quantidadeAtual,
    ).toBeUndefined();
    expect(tx.movimentacaoEstoque.create).not.toHaveBeenCalled();
  });

  it('advisory lock antecede a releitura completa na atualização', async () => {
    prepararAtualizacao();
    await service.atualizar('s1', { quantidadeAtual: 3 }, usuario);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.estoqueProduto.findUnique.mock.invocationCallOrder[1],
    );
  });

  it('atualização negativa é rejeitada sem efeitos', async () => {
    await expect(
      service.atualizar('s1', { quantidadeAtual: -0.01 }, usuario),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('falha na movimentação rejeita a atualização de saldo', async () => {
    prepararAtualizacao();
    const erro = new Error('falha tardia');
    tx.movimentacaoEstoque.create.mockRejectedValue(erro);
    await expect(
      service.atualizar('s1', { quantidadeAtual: 3 }, usuario),
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
    prisma.$transaction.mockRejectedValue(erro);
    await expect(
      service.criar(
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
    prisma.$transaction.mockRejectedValue(erro);
    await expect(
      service.criar(
        { produtoId: 'p1', depositoId: 'd1', quantidadeAtual: 1 },
        usuario,
      ),
    ).rejects.toBe(erro);
  });
});
