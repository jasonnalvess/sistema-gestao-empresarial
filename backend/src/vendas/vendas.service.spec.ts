/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return -- Matchers assimetricos e mock.calls do Jest expoem valores como any. */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  CondicaoPagamentoVenda,
  FormaPagamentoVenda,
  Prisma,
  StatusContaReceber,
  StatusVenda,
  TipoMovimentacaoEstoque,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CriarVendaDto } from './dto/criar-venda.dto';
import { VendasService } from './vendas.service';

function criarPrismaMock() {
  const prisma = {
    cliente: { findFirst: jest.fn() },
    deposito: { findFirst: jest.fn() },
    produto: { findMany: jest.fn() },
    venda: {
      findUniqueOrThrow: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    vendaItem: {
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    vendaHistorico: { create: jest.fn() },
    estoqueProduto: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    movimentacaoEstoque: { create: jest.fn() },
    contaReceber: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    contaReceberHistorico: { create: jest.fn() },
    $queryRaw: jest.fn().mockResolvedValue([{ pg_advisory_xact_lock: null }]),
    $executeRaw: jest.fn().mockResolvedValue(1),
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(async (operacao: unknown) => {
    if (typeof operacao === 'function') {
      return (operacao as (tx: typeof prisma) => Promise<unknown>)(prisma);
    }
    return Promise.all(operacao as Promise<unknown>[]);
  });
  return prisma;
}

type PrismaMock = ReturnType<typeof criarPrismaMock>;

const usuario = {
  id: 'usuario-1',
  email: 'usuario@empresa.com',
  empresaId: 'empresa-1',
  tipo: 'ADMIN_EMPRESA',
};

const dtoCriacao = (itens?: CriarVendaDto['itens']): CriarVendaDto => ({
  clienteId: 'cliente-1',
  depositoId: 'deposito-1',
  condicaoPagamento: CondicaoPagamentoVenda.AVISTA,
  formaPagamento: FormaPagamentoVenda.PIX,
  valorDesconto: 3,
  valorFrete: 5,
  valorOutros: 2,
  itens: itens ?? [
    {
      produtoId: 'produto-1',
      quantidade: 2,
      valorUnitario: 10,
      valorDesconto: 1,
    },
    { produtoId: 'produto-2', quantidade: 3, valorUnitario: 4 },
  ],
});

const venda = (status: StatusVenda = StatusVenda.RASCUNHO) => ({
  id: 'venda-1',
  numero: 10,
  status,
  empresaId: 'empresa-1',
  clienteId: 'cliente-1',
  depositoId: 'deposito-1',
  dataVenda: new Date('2026-01-10T00:00:00.000Z'),
  condicaoPagamento: CondicaoPagamentoVenda.APRAZO,
  formaPagamento: FormaPagamentoVenda.BOLETO,
  quantidadeParcelas: 3,
  intervaloParcelas: 30,
  primeiroVencimento: new Date('2026-08-10T00:00:00.000Z'),
  valorProdutos: 100,
  valorDesconto: 0,
  valorFrete: 0,
  valorOutros: 0,
  valorTotal: 100,
  cliente: { id: 'cliente-1', ativo: true },
  deposito: { id: 'deposito-1', nome: 'Principal', ativo: true },
  itens: [
    {
      id: 'item-1',
      produtoId: 'produto-1',
      quantidade: 2,
      valorUnitario: 50,
      valorDesconto: 0,
      valorTotal: 100,
      observacao: null,
      produto: { id: 'produto-1', nome: 'Produto 1', ativo: true },
    },
  ],
  contasReceber: [],
});

describe('VendasService', () => {
  let prisma: PrismaMock;
  let service: VendasService;

  beforeEach(() => {
    prisma = criarPrismaMock();
    service = new VendasService(prisma as unknown as PrismaService);
    prisma.cliente.findFirst.mockResolvedValue({
      id: 'cliente-1',
      empresaId: 'empresa-1',
      ativo: true,
    });
    prisma.deposito.findFirst.mockResolvedValue({
      id: 'deposito-1',
      empresaId: 'empresa-1',
      ativo: true,
    });
    prisma.produto.findMany.mockResolvedValue([
      { id: 'produto-1', nome: 'Produto 1', ativo: true },
      { id: 'produto-2', nome: 'Produto 2', ativo: true },
    ]);
    prisma.venda.findFirst.mockResolvedValue({ numero: 9 });
    prisma.venda.create.mockResolvedValue({ id: 'venda-1', numero: 10 });
    prisma.vendaHistorico.create.mockResolvedValue({ id: 'historico-1' });
    prisma.venda.updateMany.mockResolvedValue({ count: 1 });
    prisma.venda.findUniqueOrThrow.mockResolvedValue(
      venda(StatusVenda.CANCELADA),
    );
  });

  describe('criação', () => {
    it('usa empresaId explícito na criação', async () => {
      await service.criar('empresa-1', dtoCriacao(), usuario.id);
      expect(prisma.cliente.findFirst).toHaveBeenCalledWith({
        where: { id: 'cliente-1', empresaId: 'empresa-1' },
      });
    });

    it('bloqueia a numeração por empresa antes de ler o último número', async () => {
      await service.criar('empresa-1', dtoCriacao(), usuario.id);
      const sql = prisma.$executeRaw.mock.calls[0][0] as Prisma.Sql;
      expect(sql.sql).toContain('pg_advisory_xact_lock');
      expect(sql.sql).toContain('hashtextextended');
      expect(sql.values).toEqual(['venda-numero:empresa-1']);
      expect(prisma.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
        prisma.venda.findFirst.mock.invocationCallOrder[0],
      );
    });

    it('interrompe sem persistência quando o lock de numeração falha', async () => {
      const erro = new Error('falha no lock');
      prisma.$executeRaw.mockRejectedValueOnce(erro);
      await expect(
        service.criar('empresa-1', dtoCriacao(), usuario.id),
      ).rejects.toBe(erro);
      expect(prisma.venda.findFirst).not.toHaveBeenCalled();
      expect(prisma.venda.create).not.toHaveBeenCalled();
      expect(prisma.vendaHistorico.create).not.toHaveBeenCalled();
    });
    it('estrutura duas criações simultâneas com números distintos na mesma empresa', async () => {
      prisma.venda.findFirst
        .mockResolvedValueOnce({ numero: 9 })
        .mockResolvedValueOnce({ numero: 10 });
      prisma.venda.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: `venda-${data.numero}`, numero: data.numero }),
      );

      const resultados = await Promise.all([
        service.criar('empresa-1', dtoCriacao(), usuario.id),
        service.criar('empresa-1', dtoCriacao(), usuario.id),
      ]);

      expect(resultados.map((resultado) => resultado.numero)).toEqual([10, 11]);
      expect(prisma.vendaHistorico.create).toHaveBeenCalledTimes(2);
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
    });

    it('usa locks e sequências independentes para empresas diferentes', async () => {
      prisma.venda.findFirst.mockResolvedValue(null);
      prisma.venda.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: `venda-${data.empresaId}`, numero: data.numero }),
      );

      const resultados = await Promise.all([
        service.criar('empresa-1', dtoCriacao(), usuario.id),
        service.criar('empresa-2', dtoCriacao(), usuario.id),
      ]);
      const chaves = prisma.$executeRaw.mock.calls.map(
        ([sql]) => (sql as Prisma.Sql).values[0],
      );

      expect(resultados.map((resultado) => resultado.numero)).toEqual([1, 1]);
      expect(chaves).toEqual([
        'venda-numero:empresa-1',
        'venda-numero:empresa-2',
      ]);
    });

    it('rejeita produtos duplicados', async () => {
      const itens = [
        { produtoId: 'produto-1', quantidade: 1, valorUnitario: 10 },
        { produtoId: 'produto-1', quantidade: 2, valorUnitario: 10 },
      ];
      await expect(
        service.criar('empresa-1', dtoCriacao(itens), usuario.id),
      ).rejects.toThrow('O mesmo produto não pode aparecer mais de uma vez');
    });

    it.each([
      [
        'cliente',
        (p: PrismaMock) => p.cliente.findFirst.mockResolvedValue(null),
        'Cliente não encontrado',
      ],
      [
        'depósito',
        (p: PrismaMock) => p.deposito.findFirst.mockResolvedValue(null),
        'Depósito não encontrado',
      ],
      [
        'produtos',
        (p: PrismaMock) => p.produto.findMany.mockResolvedValue([]),
        'Um ou mais produtos não foram encontrados',
      ],
    ])('valida %s da empresa', async (_nome, preparar, mensagem) => {
      preparar(prisma);
      await expect(
        service.criar('empresa-1', dtoCriacao(), usuario.id),
      ).rejects.toThrow(mensagem);
    });

    it('rejeita cliente de outra empresa', async () => {
      prisma.cliente.findFirst.mockResolvedValue(null);
      await expect(
        service.criar('empresa-1', dtoCriacao(), usuario.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('calcula valores e cria em RASCUNHO', async () => {
      await service.criar('empresa-1', dtoCriacao(), usuario.id);
      expect(prisma.venda.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: StatusVenda.RASCUNHO,
            empresaId: 'empresa-1',
            valorProdutos: 31,
            valorDesconto: 3,
            valorFrete: 5,
            valorOutros: 2,
            valorTotal: 35,
            itens: {
              create: [
                expect.objectContaining({
                  produtoId: 'produto-1',
                  valorTotal: 19,
                }),
                expect.objectContaining({
                  produtoId: 'produto-2',
                  valorTotal: 12,
                }),
              ],
            },
          }),
        }),
      );
    });
    it.each([
      [['empresaId', 'numero']],
      [['numero', 'empresaId']],
      ['Venda_empresaId_numero_key'],
    ])('converte P2002 exato da Venda para conflito: %p', async (target) => {
      const erro = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '6.19.3', meta: { target } },
      );
      prisma.venda.create.mockRejectedValueOnce(erro);
      await expect(
        service.criar('empresa-1', dtoCriacao(), usuario.id),
      ).rejects.toThrow('Conflito ao gerar a numeração da venda');
    });

    it.each([
      ['campos adicionais', { target: ['empresaId', 'numero', 'id'] }, 'P2002'],
      ['nome parcial', { target: 'Venda_empresaId_numero' }, 'P2002'],
      ['target ausente', {}, 'P2002'],
      ['meta ausente', undefined, 'P2002'],
      ['outro código', { target: ['empresaId', 'numero'] }, 'P2003'],
    ])('relança P2002 não exato: %s', async (_nome, meta, code) => {
      const erro = new Prisma.PrismaClientKnownRequestError('Erro Prisma', {
        code,
        clientVersion: '6.19.3',
        ...(meta ? { meta } : {}),
      });
      prisma.venda.create.mockRejectedValueOnce(erro);
      await expect(
        service.criar('empresa-1', dtoCriacao(), usuario.id),
      ).rejects.toBe(erro);
    });

    it('relança erro não Prisma e falha posterior sem converter', async () => {
      const erro = new Error('falha de histórico');
      prisma.vendaHistorico.create.mockRejectedValueOnce(erro);
      await expect(
        service.criar('empresa-1', dtoCriacao(), usuario.id),
      ).rejects.toBe(erro);
    });
  });

  describe('atualização', () => {
    it('permite alteração em RASCUNHO', async () => {
      prisma.venda.findFirst.mockResolvedValue(venda());
      prisma.produto.findMany.mockResolvedValue([
        { id: 'produto-1', nome: 'Produto 1', ativo: true },
      ]);
      prisma.venda.update.mockResolvedValue({ id: 'venda-1' });
      await service.atualizar(
        'empresa-1',
        'venda-1',
        { observacao: ' Nova ' },
        usuario.id,
      );
      expect(prisma.venda.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ observacao: 'Nova' }),
        }),
      );
    });

    it.each([StatusVenda.PENDENTE, StatusVenda.APROVADA, StatusVenda.FATURADA])(
      'rejeita alteração no status %s',
      async (status) => {
        prisma.venda.findFirst.mockResolvedValue(venda(status));
        await expect(
          service.atualizar('empresa-1', 'venda-1', {}, usuario.id),
        ).rejects.toThrow('Somente vendas em rascunho podem ser alteradas');
      },
    );
  });

  describe('aprovação', () => {
    it('envia somente RASCUNHO para PENDENTE', async () => {
      prisma.venda.findFirst.mockResolvedValue(venda());
      prisma.venda.update.mockResolvedValue({ status: StatusVenda.PENDENTE });
      await service.enviarParaAprovacao('empresa-1', 'venda-1', usuario.id);
      expect(prisma.venda.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: StatusVenda.PENDENTE },
        }),
      );
      prisma.venda.findFirst.mockResolvedValue(venda(StatusVenda.PENDENTE));
      await expect(
        service.enviarParaAprovacao('empresa-1', 'venda-1', usuario.id),
      ).rejects.toThrow('Somente vendas em rascunho');
    });

    it('aprova somente PENDENTE com estoque suficiente', async () => {
      prisma.venda.findFirst.mockResolvedValue(venda(StatusVenda.PENDENTE));
      prisma.estoqueProduto.findUnique.mockResolvedValue({
        quantidadeAtual: 10,
      });
      prisma.venda.update.mockResolvedValue({ status: StatusVenda.APROVADA });
      await service.aprovar('empresa-1', 'venda-1', usuario.id);
      expect(prisma.venda.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: StatusVenda.APROVADA }),
        }),
      );
    });

    it('rejeita aprovação fora de PENDENTE e com estoque insuficiente', async () => {
      prisma.venda.findFirst.mockResolvedValue(venda());
      await expect(
        service.aprovar('empresa-1', 'venda-1', usuario.id),
      ).rejects.toThrow('Somente vendas pendentes');
      prisma.venda.findFirst.mockResolvedValue(venda(StatusVenda.PENDENTE));
      prisma.estoqueProduto.findUnique.mockResolvedValue({
        quantidadeAtual: 1,
      });
      await expect(
        service.aprovar('empresa-1', 'venda-1', usuario.id),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('faturamento', () => {
    beforeEach(() => {
      prisma.venda.findFirst.mockResolvedValue(venda(StatusVenda.APROVADA));
      prisma.estoqueProduto.updateMany.mockResolvedValue({ count: 1 });
      prisma.estoqueProduto.findUniqueOrThrow.mockResolvedValue({
        id: 'estoque-1',
        quantidadeAtual: 8,
        custoMedio: 4,
      });
      prisma.contaReceber.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ numero: 20 });
      prisma.contaReceber.create
        .mockResolvedValueOnce({ id: 'conta-1' })
        .mockResolvedValueOnce({ id: 'conta-2' })
        .mockResolvedValueOnce({ id: 'conta-3' });
      prisma.venda.findUniqueOrThrow.mockResolvedValue(
        venda(StatusVenda.APROVADA),
      );
    });

    it('permite somente venda APROVADA sem efeitos colaterais', async () => {
      prisma.venda.findFirst.mockResolvedValue(venda(StatusVenda.PENDENTE));

      await expect(
        service.faturar('empresa-1', 'venda-1', {}, usuario.id),
      ).rejects.toThrow('Somente vendas aprovadas podem ser faturadas');

      expect(prisma.venda.updateMany).not.toHaveBeenCalled();
      expect(prisma.estoqueProduto.updateMany).not.toHaveBeenCalled();
      expect(prisma.movimentacaoEstoque.create).not.toHaveBeenCalled();
      expect(prisma.contaReceber.create).not.toHaveBeenCalled();
      expect(prisma.vendaHistorico.create).not.toHaveBeenCalled();
    });

    it('baixa atomicamente quando o saldo é exatamente igual', async () => {
      prisma.estoqueProduto.findUniqueOrThrow.mockResolvedValue({
        id: 'estoque-1',
        quantidadeAtual: 0,
        custoMedio: 4,
      });

      await service.faturar('empresa-1', 'venda-1', {}, usuario.id);

      expect(prisma.estoqueProduto.updateMany).toHaveBeenCalledWith({
        where: {
          empresaId: 'empresa-1',
          produtoId: 'produto-1',
          depositoId: 'deposito-1',
          quantidadeAtual: { gte: expect.any(Prisma.Decimal) },
        },
        data: { quantidadeAtual: { decrement: expect.any(Prisma.Decimal) } },
      });
      expect(prisma.movimentacaoEstoque.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tipo: TipoMovimentacaoEstoque.SAIDA,
          saldoAnterior: expect.any(Prisma.Decimal),
          saldoPosterior: expect.any(Prisma.Decimal),
        }),
      });
    });

    it('rejeita saldo menor pela condição atômica', async () => {
      prisma.estoqueProduto.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.faturar('empresa-1', 'venda-1', {}, usuario.id),
      ).rejects.toThrow('Estoque insuficiente ou inválido para o produto');

      expect(prisma.movimentacaoEstoque.create).not.toHaveBeenCalled();
      expect(prisma.contaReceber.create).not.toHaveBeenCalled();
      expect(prisma.vendaHistorico.create).not.toHaveBeenCalled();
    });

    it('trata updateMany count 0 como falha e não cria efeitos posteriores', async () => {
      prisma.estoqueProduto.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.faturar('empresa-1', 'venda-1', {}, usuario.id),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.estoqueProduto.findUniqueOrThrow).not.toHaveBeenCalled();
      expect(prisma.movimentacaoEstoque.create).not.toHaveBeenCalled();
      expect(prisma.vendaItem.update).not.toHaveBeenCalled();
      expect(prisma.contaReceber.create).not.toHaveBeenCalled();
      expect(prisma.contaReceberHistorico.create).not.toHaveBeenCalled();
      expect(prisma.vendaHistorico.create).not.toHaveBeenCalled();
    });

    it('gera saída, um conjunto de contas, distribui centavos e marca FATURADA', async () => {
      await service.faturar('empresa-1', 'venda-1', {}, usuario.id);

      const sqlLockVenda = prisma.$queryRaw.mock.calls[0][0] as Prisma.Sql;
      expect(sqlLockVenda.sql).toContain('FOR UPDATE');
      expect(sqlLockVenda.sql).toContain('"empresaId"');
      expect(sqlLockVenda.values).toEqual(['venda-1', 'empresa-1']);

      const locks = prisma.$executeRaw.mock.calls.map(
        ([sql]) => (sql as Prisma.Sql).values[0],
      );
      expect(locks.at(-1)).toBe('conta-receber-numero:empresa-1');

      expect(prisma.venda.findFirst).toHaveBeenCalledWith({
        where: { id: 'venda-1', empresaId: 'empresa-1' },
        select: { id: true, empresaId: true, status: true },
      });
      expect(prisma.venda.findUniqueOrThrow).toHaveBeenNthCalledWith(1, {
        where: { id: 'venda-1', empresaId: 'empresa-1' },
        include: expect.any(Object),
      });
      expect(prisma.estoqueProduto.updateMany).toHaveBeenCalledTimes(1);
      expect(prisma.movimentacaoEstoque.create).toHaveBeenCalledTimes(1);
      expect(prisma.contaReceber.create).toHaveBeenCalledTimes(3);
      const valores = prisma.contaReceber.create.mock.calls.map(
        ([arg]) => arg.data.valorOriginal,
      );
      expect(valores).toEqual([33.34, 33.33, 33.33]);
      expect(prisma.venda.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'venda-1',
          empresaId: 'empresa-1',
          status: StatusVenda.APROVADA,
        },
        data: expect.objectContaining({ status: StatusVenda.FATURADA }),
      });
    });

    it('rejeita segunda tentativa sem nova baixa ou efeitos colaterais', async () => {
      prisma.venda.findFirst.mockResolvedValue(venda(StatusVenda.FATURADA));

      await expect(
        service.faturar('empresa-1', 'venda-1', {}, usuario.id),
      ).rejects.toThrow('Somente vendas aprovadas podem ser faturadas');

      expect(prisma.venda.updateMany).not.toHaveBeenCalled();
      expect(prisma.estoqueProduto.updateMany).not.toHaveBeenCalled();
      expect(prisma.movimentacaoEstoque.create).not.toHaveBeenCalled();
      expect(prisma.contaReceber.create).not.toHaveBeenCalled();
      expect(prisma.vendaHistorico.create).not.toHaveBeenCalled();
    });

    it('a requisição derrotada não carrega a venda completa nem produz efeitos', async () => {
      prisma.venda.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.faturar('empresa-1', 'venda-1', {}, usuario.id),
      ).rejects.toThrow('A venda já foi faturada ou não está mais aprovada');

      expect(prisma.venda.findUniqueOrThrow).not.toHaveBeenCalled();
      expect(prisma.contaReceber.findFirst).not.toHaveBeenCalled();
      expect(prisma.estoqueProduto.updateMany).not.toHaveBeenCalled();
      expect(prisma.movimentacaoEstoque.create).not.toHaveBeenCalled();
      expect(prisma.contaReceber.create).not.toHaveBeenCalled();
      expect(prisma.vendaHistorico.create).not.toHaveBeenCalled();
    });

    it('duas chamadas concorrentes produzem somente uma baixa e um conjunto de contas', async () => {
      prisma.contaReceber.findFirst.mockReset();
      prisma.contaReceber.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ numero: 20 });
      prisma.venda.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });

      const resultados = await Promise.allSettled([
        service.faturar('empresa-1', 'venda-1', {}, usuario.id),
        service.faturar('empresa-1', 'venda-1', {}, usuario.id),
      ]);

      expect(
        resultados.filter((resultado) => resultado.status === 'fulfilled'),
      ).toHaveLength(1);
      expect(
        resultados.filter((resultado) => resultado.status === 'rejected'),
      ).toHaveLength(1);
      expect(prisma.venda.findUniqueOrThrow).toHaveBeenCalledTimes(2);
      expect(prisma.contaReceber.findFirst).toHaveBeenCalledTimes(2);
      expect(prisma.estoqueProduto.updateMany).toHaveBeenCalledTimes(1);
      expect(prisma.movimentacaoEstoque.create).toHaveBeenCalledTimes(1);
      expect(prisma.contaReceber.create).toHaveBeenCalledTimes(3);
      expect(prisma.vendaHistorico.create).toHaveBeenCalledTimes(1);
    });

    it('rejeita contas preexistentes após a transição e antes da baixa', async () => {
      prisma.contaReceber.findFirst.mockReset();
      prisma.contaReceber.findFirst.mockResolvedValue({
        id: 'conta-existente',
      });

      await expect(
        service.faturar('empresa-1', 'venda-1', {}, usuario.id),
      ).rejects.toThrow('A venda já possui contas a receber geradas');

      expect(prisma.venda.updateMany).toHaveBeenCalledTimes(1);
      expect(prisma.estoqueProduto.updateMany).not.toHaveBeenCalled();
      expect(prisma.movimentacaoEstoque.create).not.toHaveBeenCalled();
      expect(prisma.contaReceber.create).not.toHaveBeenCalled();
    });

    it('converte violação de unicidade das parcelas em erro de domínio', async () => {
      prisma.contaReceber.create.mockReset();
      prisma.contaReceber.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '6.19.3',
          meta: { target: ['vendaId', 'parcelaAtual'] },
        }),
      );

      await expect(
        service.faturar('empresa-1', 'venda-1', {}, usuario.id),
      ).rejects.toThrow('As contas a receber desta venda já foram geradas');
      expect(prisma.vendaHistorico.create).not.toHaveBeenCalled();
    });

    it('mantém o faturamento à vista com uma única parcela', async () => {
      const vendaAvista = {
        ...venda(StatusVenda.APROVADA),
        condicaoPagamento: CondicaoPagamentoVenda.AVISTA,
        quantidadeParcelas: 1,
      };
      prisma.venda.findUniqueOrThrow.mockResolvedValue(vendaAvista);
      prisma.contaReceber.create.mockReset();
      prisma.contaReceber.create.mockResolvedValue({ id: 'conta-1' });

      await service.faturar('empresa-1', 'venda-1', {}, usuario.id);

      expect(prisma.contaReceber.create).toHaveBeenCalledTimes(1);
      expect(prisma.contaReceber.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            parcelaAtual: 1,
            totalParcelas: 1,
          }),
        }),
      );
    });

    it('converte P2002 exato da numeração de Conta a Receber', async () => {
      const erro = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '6.19.3',
          meta: { target: ['empresaId', 'numero'] },
        },
      );
      prisma.contaReceber.create.mockReset();
      prisma.contaReceber.create.mockRejectedValue(erro);

      await expect(
        service.faturar('empresa-1', 'venda-1', {}, usuario.id),
      ).rejects.toThrow('Conflito ao gerar a numeração da conta a receber');
    });

    it('opera estoque e financeiro somente pela empresa contextual', async () => {
      const vendaOutraEmpresa = {
        ...venda(StatusVenda.APROVADA),
        empresaId: 'empresa-1',
      };
      prisma.venda.findFirst.mockResolvedValue(vendaOutraEmpresa);
      prisma.venda.findUniqueOrThrow.mockResolvedValue(vendaOutraEmpresa);

      await service.faturar('empresa-1', 'venda-1', {}, usuario.id);

      expect(prisma.venda.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ empresaId: 'empresa-1' }),
        }),
      );
      expect(prisma.estoqueProduto.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ empresaId: 'empresa-1' }),
        }),
      );
      expect(prisma.contaReceber.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ empresaId: 'empresa-1' }),
        }),
      );
    });

    it('não altera estoque de outra empresa', async () => {
      prisma.venda.findFirst.mockResolvedValue(null);

      await expect(
        service.faturar('empresa-1', 'venda-1', {}, usuario.id),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.venda.updateMany).not.toHaveBeenCalled();
      expect(prisma.estoqueProduto.updateMany).not.toHaveBeenCalled();
      expect(prisma.movimentacaoEstoque.create).not.toHaveBeenCalled();
    });
  });

  describe('cancelamento', () => {
    beforeEach(() => {
      prisma.contaReceber.findMany.mockResolvedValue([]);
      prisma.venda.findUniqueOrThrow.mockResolvedValue(
        venda(StatusVenda.FATURADA),
      );
      prisma.estoqueProduto.updateMany.mockResolvedValue({ count: 1 });
      prisma.estoqueProduto.findUniqueOrThrow.mockResolvedValue({
        id: 'estoque-1',
        quantidadeAtual: 10,
        custoMedio: 4,
      });
    });

    it.each([StatusVenda.RASCUNHO, StatusVenda.PENDENTE, StatusVenda.APROVADA])(
      'cancela %s sem estorno financeiro',
      async (status) => {
        prisma.venda.findFirst.mockResolvedValue(venda(status));

        await service.cancelar('empresa-1', 'venda-1', {}, usuario.id);

        expect(prisma.venda.updateMany).toHaveBeenCalledWith({
          where: {
            id: 'venda-1',
            empresaId: 'empresa-1',
            status,
          },
          data: expect.objectContaining({ status: StatusVenda.CANCELADA }),
        });
        expect(prisma.vendaItem.updateMany).toHaveBeenCalled();
        expect(prisma.estoqueProduto.updateMany).not.toHaveBeenCalled();
        expect(prisma.movimentacaoEstoque.create).not.toHaveBeenCalled();
        expect(prisma.contaReceber.update).not.toHaveBeenCalled();
      },
    );

    it('estorna estoque com increment e cancela contas de venda FATURADA', async () => {
      prisma.venda.findFirst.mockResolvedValue(venda(StatusVenda.FATURADA));
      prisma.contaReceber.findMany.mockResolvedValue([
        {
          id: 'conta-1',
          numero: 21,
          status: StatusContaReceber.PENDENTE,
          valorRecebido: 0,
          recebimentos: [],
        },
      ]);

      await service.cancelar(
        'empresa-1',
        'venda-1',
        { motivo: 'Erro operacional' },
        usuario.id,
      );

      expect(prisma.venda.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'venda-1',
          empresaId: 'empresa-1',
          status: StatusVenda.FATURADA,
        },
        data: expect.objectContaining({ status: StatusVenda.CANCELADA }),
      });
      expect(prisma.estoqueProduto.updateMany).toHaveBeenCalledWith({
        where: {
          empresaId: 'empresa-1',
          produtoId: 'produto-1',
          depositoId: 'deposito-1',
        },
        data: { quantidadeAtual: { increment: expect.any(Prisma.Decimal) } },
      });
      expect(prisma.movimentacaoEstoque.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tipo: TipoMovimentacaoEstoque.ENTRADA,
          saldoAnterior: expect.any(Prisma.Decimal),
          saldoPosterior: expect.any(Prisma.Decimal),
        }),
      });
      expect(prisma.contaReceber.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: StatusContaReceber.CANCELADA,
            valorAberto: 0,
          }),
        }),
      );
    });

    it('consulta contas e recebimentos da empresa dentro da transação', async () => {
      prisma.venda.findFirst.mockResolvedValue(venda(StatusVenda.FATURADA));

      await service.cancelar('empresa-1', 'venda-1', {}, usuario.id);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.contaReceber.findMany).toHaveBeenCalledWith({
        where: {
          vendaId: 'venda-1',
          empresaId: 'empresa-1',
        },
        include: {
          recebimentos: {
            select: { id: true, valor: true },
          },
        },
        orderBy: { parcelaAtual: 'asc' },
      });
    });

    it('segunda tentativa de cancelamento não devolve estoque novamente', async () => {
      prisma.venda.findFirst.mockResolvedValue(venda(StatusVenda.CANCELADA));

      await expect(
        service.cancelar('empresa-1', 'venda-1', {}, usuario.id),
      ).rejects.toThrow('A venda já está cancelada');

      expect(prisma.venda.updateMany).not.toHaveBeenCalled();
      expect(prisma.estoqueProduto.updateMany).not.toHaveBeenCalled();
      expect(prisma.movimentacaoEstoque.create).not.toHaveBeenCalled();
      expect(prisma.contaReceber.update).not.toHaveBeenCalled();
      expect(prisma.vendaHistorico.create).not.toHaveBeenCalled();
    });

    it('cancelamentos concorrentes devolvem estoque apenas uma vez', async () => {
      prisma.venda.findFirst.mockResolvedValue(venda(StatusVenda.FATURADA));
      prisma.venda.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });

      const resultados = await Promise.allSettled([
        service.cancelar('empresa-1', 'venda-1', {}, usuario.id),
        service.cancelar('empresa-1', 'venda-1', {}, usuario.id),
      ]);

      expect(
        resultados.filter((resultado) => resultado.status === 'fulfilled'),
      ).toHaveLength(1);
      expect(
        resultados.filter((resultado) => resultado.status === 'rejected'),
      ).toHaveLength(1);
      expect(prisma.venda.findUniqueOrThrow).toHaveBeenCalledTimes(2);
      expect(prisma.contaReceber.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.estoqueProduto.updateMany).toHaveBeenCalledTimes(1);
      expect(prisma.movimentacaoEstoque.create).toHaveBeenCalledTimes(1);
      expect(prisma.vendaHistorico.create).toHaveBeenCalledTimes(1);
    });

    it('recebimento existente impede cancelamento e qualquer devolução', async () => {
      prisma.venda.findFirst.mockResolvedValue(venda(StatusVenda.FATURADA));
      prisma.contaReceber.findMany.mockResolvedValue([
        {
          id: 'conta-1',
          numero: 21,
          status: StatusContaReceber.RECEBIDA,
          valorRecebido: 100,
          recebimentos: [{ id: 'recebimento-1', valor: 100 }],
        },
      ]);

      await expect(
        service.cancelar('empresa-1', 'venda-1', {}, usuario.id),
      ).rejects.toThrow('possui recebimento registrado');

      expect(prisma.estoqueProduto.updateMany).not.toHaveBeenCalled();
      expect(prisma.movimentacaoEstoque.create).not.toHaveBeenCalled();
      expect(prisma.contaReceber.update).not.toHaveBeenCalled();
      expect(prisma.vendaHistorico.create).not.toHaveBeenCalled();
    });

    it('falha na devolução não deixa efeitos posteriores do cancelamento', async () => {
      prisma.venda.findFirst.mockResolvedValue(venda(StatusVenda.FATURADA));
      prisma.estoqueProduto.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.cancelar('empresa-1', 'venda-1', {}, usuario.id),
      ).rejects.toThrow('não foi encontrado para realizar o estorno');

      expect(prisma.estoqueProduto.findUniqueOrThrow).not.toHaveBeenCalled();
      expect(prisma.movimentacaoEstoque.create).not.toHaveBeenCalled();
      expect(prisma.vendaItem.update).not.toHaveBeenCalled();
      expect(prisma.contaReceber.update).not.toHaveBeenCalled();
      expect(prisma.contaReceberHistorico.create).not.toHaveBeenCalled();
      expect(prisma.vendaHistorico.create).not.toHaveBeenCalled();
    });

    it.each([
      [StatusVenda.CONCLUIDA, 'Não é possível cancelar uma venda concluída'],
      [StatusVenda.CANCELADA, 'A venda já está cancelada'],
    ])('impede cancelamento de venda %s', async (status, mensagem) => {
      prisma.venda.findFirst.mockResolvedValue(venda(status));

      await expect(
        service.cancelar('empresa-1', 'venda-1', {}, usuario.id),
      ).rejects.toThrow(mensagem);
      expect(prisma.venda.updateMany).not.toHaveBeenCalled();
      expect(prisma.estoqueProduto.updateMany).not.toHaveBeenCalled();
    });

    it('não cancela venda nem estoque de outra empresa', async () => {
      prisma.venda.findFirst.mockResolvedValue(null);

      await expect(
        service.cancelar('empresa-1', 'venda-1', {}, usuario.id),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.venda.updateMany).not.toHaveBeenCalled();
      expect(prisma.estoqueProduto.updateMany).not.toHaveBeenCalled();
      expect(prisma.contaReceber.findMany).not.toHaveBeenCalled();
    });
  });

  it('impede acesso e alteração de venda de outra empresa', async () => {
    prisma.venda.findFirst.mockResolvedValue(null);
    await expect(
      service.buscarPorId('empresa-1', 'venda-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.atualizar('empresa-1', 'venda-1', {}, usuario.id),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.venda.update).not.toHaveBeenCalled();
  });

  describe('conclusão', () => {
    it('altera para CONCLUIDA somente com todas as contas quitadas', async () => {
      prisma.venda.findFirst
        .mockResolvedValueOnce({
          ...venda(StatusVenda.FATURADA),
          contasReceber: [
            {
              id: 'c1',
              numero: 1,
              status: StatusContaReceber.RECEBIDA,
              valorAberto: 0,
            },
            {
              id: 'c2',
              numero: 2,
              status: StatusContaReceber.RECEBIDA,
              valorAberto: 0,
            },
          ],
        })
        .mockResolvedValueOnce(venda(StatusVenda.CONCLUIDA));
      await service.concluirSeQuitada('empresa-1', 'venda-1', 'usuario-1');
      expect(prisma.venda.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'venda-1',
          empresaId: 'empresa-1',
          status: StatusVenda.FATURADA,
        },
        data: expect.objectContaining({
          status: StatusVenda.CONCLUIDA,
          usuarioConclusaoId: 'usuario-1',
        }),
      });
    });

    it.each([
      [
        [
          {
            id: 'c1',
            numero: 1,
            status: StatusContaReceber.PENDENTE,
            valorAberto: 10,
          },
        ],
      ],
      [[]],
    ])('não conclui com contas abertas ou ausentes', async (contasReceber) => {
      prisma.venda.findFirst.mockResolvedValue({
        ...venda(StatusVenda.FATURADA),
        contasReceber,
      });
      await service.concluirSeQuitada('empresa-1', 'venda-1', 'usuario-1');
      expect(prisma.venda.update).not.toHaveBeenCalled();
    });
  });
});
