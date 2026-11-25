import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { ProdutosService } from './produtos.service';

type PrismaMock = {
  $transaction: jest.Mock;
  produto: {
    create: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
  };
  produtoHistorico: { create: jest.Mock; findMany: jest.Mock };
  categoriaProduto: { findFirst: jest.Mock };
  marcaProduto: { findFirst: jest.Mock };
  unidadeMedida: { findFirst: jest.Mock };
};

const usuario: AuthenticatedUser = {
  id: 'u1',
  email: 'u@e.com',
  tipo: 'ADMIN_EMPRESA',
  empresaId: 'e1',
};
const produto = (ativo = true) => ({
  id: 'p1',
  nome: 'Produto',
  descricao: null,
  codigo: 'P1',
  codigoBarras: null,
  ncm: null,
  precoCusto: new Prisma.Decimal(5),
  precoVenda: new Prisma.Decimal(10),
  peso: null,
  altura: null,
  largura: null,
  comprimento: null,
  estoqueMinimo: new Prisma.Decimal(0),
  estoqueMaximo: null,
  ativo,
  empresaId: 'e1',
  categoriaId: null,
  marcaId: null,
  unidadeMedidaId: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  categoria: null,
  marca: null,
  unidadeMedida: null,
  estoques: [],
});
const p2002 = (target?: unknown, code = 'P2002') =>
  new Prisma.PrismaClientKnownRequestError('erro', {
    code,
    clientVersion: '6.19.3',
    ...(target === undefined ? {} : { meta: { target } }),
  });

describe('ProdutosService', () => {
  let service: ProdutosService;
  let prisma: PrismaMock;
  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      produto: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      produtoHistorico: { create: jest.fn(), findMany: jest.fn() },
      categoriaProduto: { findFirst: jest.fn() },
      marcaProduto: { findFirst: jest.fn() },
      unidadeMedida: { findFirst: jest.fn() },
    };
    prisma.$transaction.mockImplementation((operacao: unknown) =>
      typeof operacao === 'function'
        ? (operacao as (tx: PrismaMock) => unknown)(prisma)
        : Promise.all(operacao as Promise<unknown>[]),
    );
    service = new ProdutosService(prisma as unknown as PrismaService);
  });

  it('cria no tenant explícito e grava histórico na mesma transação', async () => {
    prisma.categoriaProduto.findFirst.mockResolvedValue({
      id: 'c1',
      ativo: true,
    });
    prisma.marcaProduto.findFirst.mockResolvedValue({ id: 'm1', ativo: true });
    prisma.unidadeMedida.findFirst.mockResolvedValue({ id: 'u1', ativo: true });
    prisma.produto.create.mockResolvedValue(produto());
    prisma.produtoHistorico.create.mockResolvedValue({ id: 'h1' });
    await service.criar(
      'e1',
      {
        nome: 'Produto',
        precoVenda: 10,
        categoriaId: 'c1',
        marcaId: 'm1',
        unidadeMedidaId: 'u1',
      },
      usuario,
    );
    expect(prisma.categoriaProduto.findFirst).toHaveBeenCalledWith({
      where: { id: 'c1', empresaId: 'e1' },
    });
    expect(prisma.marcaProduto.findFirst).toHaveBeenCalledWith({
      where: { id: 'm1', empresaId: 'e1' },
    });
    expect(prisma.unidadeMedida.findFirst).toHaveBeenCalledWith({
      where: { id: 'u1', empresaId: 'e1' },
    });
    expect(prisma.produto.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          empresaId: 'e1',
          nome: 'Produto',
        }) as unknown,
      }) as unknown,
    );
    expect(prisma.produtoHistorico.create).toHaveBeenCalledWith({
      data: {
        produtoId: 'p1',
        descricao: 'Produto criado com preço de venda de R$ 10.00.',
        usuarioId: 'u1',
      },
    });
  });

  it.each([
    ['categoriaProduto', 'categoriaId', 'Categoria'],
    ['marcaProduto', 'marcaId', 'Marca'],
    ['unidadeMedida', 'unidadeMedidaId', 'Unidade de medida'],
  ] as const)(
    'relação %s externa ou inexistente retorna 404',
    async (repositorio, campo, mensagem) => {
      prisma[repositorio].findFirst.mockResolvedValue(null);
      await expect(
        service.criar(
          'e1',
          { nome: 'Produto', precoVenda: 10, [campo]: 'externo' },
          usuario,
        ),
      ).rejects.toThrow(new RegExp(mensagem));
    },
  );

  it.each([
    ['categoriaProduto', 'categoriaId'],
    ['marcaProduto', 'marcaId'],
    ['unidadeMedida', 'unidadeMedidaId'],
  ] as const)(
    'preserva regra de relação inativa em %s',
    async (repositorio, campo) => {
      prisma[repositorio].findFirst.mockResolvedValue({
        id: 'x',
        ativo: false,
      });
      await expect(
        service.criar(
          'e1',
          { nome: 'Produto', precoVenda: 10, [campo]: 'x' },
          usuario,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('lista com o mesmo where tenant-aware no findMany e count', async () => {
    await service.listar('e1', {
      search: 'abc',
      ativo: false,
      categoriaId: 'c1',
      marcaId: 'm1',
      unidadeMedidaId: 'u1',
      sortBy: 'nome',
      order: 'asc',
    });
    const whereEsperado = expect.objectContaining({
      empresaId: 'e1',
      ativo: false,
      categoriaId: 'c1',
      marcaId: 'm1',
      unidadeMedidaId: 'u1',
    }) as unknown;
    expect(prisma.produto.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: whereEsperado,
        orderBy: { nome: 'asc' },
      }) as unknown,
    );
    expect(prisma.produto.count).toHaveBeenCalledWith({ where: whereEsperado });
  });

  it('usa fallback createdAt para sortBy inválido', async () => {
    await service.listar('e1', { sortBy: 'empresaId', order: 'asc' });
    expect(prisma.produto.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'asc' } }) as unknown,
    );
  });

  it('detalha por id + empresaId e oculta produto externo', async () => {
    prisma.produto.findFirst
      .mockResolvedValueOnce(produto())
      .mockResolvedValueOnce(null);
    await service.buscarPorId('e1', 'p1');
    expect(prisma.produto.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p1', empresaId: 'e1' } }),
    );
    await expect(service.buscarPorId('e2', 'p1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('atualiza e registra alterações atomicamente', async () => {
    prisma.produto.findFirst.mockResolvedValue(produto());
    prisma.produto.update.mockResolvedValue({ ...produto(), nome: 'Novo' });
    prisma.produtoHistorico.create.mockResolvedValue({});
    await service.atualizar('e1', 'p1', { nome: 'Novo' }, usuario);
    expect(prisma.produto.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: expect.objectContaining({ nome: 'Novo' }) as unknown,
      }) as unknown,
    );
    expect(prisma.produtoHistorico.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          produtoId: 'p1',
          usuarioId: 'u1',
        }) as unknown,
      }) as unknown,
    );
  });

  it('ativação e desativação são idempotentes e registram histórico somente na mudança', async () => {
    prisma.produto.findFirst.mockResolvedValueOnce(produto(true));
    const ativo = await service.ativar('e1', 'p1', usuario);
    expect(ativo).toEqual(produto(true));
    expect(prisma.produto.update).not.toHaveBeenCalled();
    prisma.produto.findFirst.mockResolvedValueOnce(produto(true));
    prisma.produto.update.mockResolvedValue(produto(false));
    prisma.produtoHistorico.create.mockResolvedValue({});
    await service.desativar('e1', 'p1', usuario);
    expect(prisma.produtoHistorico.create).toHaveBeenCalledWith({
      data: {
        produtoId: 'p1',
        descricao: 'Produto desativado.',
        usuarioId: 'u1',
      },
    });
  });

  it('histórico manual e leitura começam pela validação tenant-aware', async () => {
    prisma.produto.findFirst.mockResolvedValue(produto());
    prisma.produtoHistorico.create.mockResolvedValue({});
    prisma.produtoHistorico.findMany.mockResolvedValue([]);
    await service.adicionarHistorico(
      'e1',
      'p1',
      { descricao: 'Nota' },
      usuario,
    );
    await service.listarHistorico('e1', 'p1');
    expect(prisma.produto.findFirst).toHaveBeenCalledTimes(2);
    expect(prisma.produtoHistorico.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { produtoId: 'p1' },
        orderBy: { createdAt: 'desc' },
      }),
    );
  });

  it.each([
    [['empresaId', 'nome'], 'nome'],
    [['nome', 'empresaId'], 'nome'],
    ['Produto_empresaId_nome_key', 'nome'],
    [['empresaId', 'codigo'], 'código'],
    ['Produto_empresaId_codigo_key', 'código'],
    [['empresaId', 'codigoBarras'], 'código de barras'],
    ['Produto_empresaId_codigoBarras_key', 'código de barras'],
  ] as const)('converte P2002 conhecido %p', async (target, mensagem) => {
    prisma.produto.create.mockRejectedValue(p2002(target));
    await expect(
      service.criar('e1', { nome: 'Produto', precoVenda: 10 }, usuario),
    ).rejects.toThrow(new RegExp(mensagem));
  });

  it.each([
    [['empresaId', 'nome', 'extra']],
    [['outra']],
    ['outra_constraint'],
    [undefined],
  ])('relança target inválido %p', async (target) => {
    const erro = p2002(target);
    prisma.produto.create.mockRejectedValue(erro);
    await expect(
      service.criar('e1', { nome: 'Produto', precoVenda: 10 }, usuario),
    ).rejects.toBe(erro);
  });

  it('relança outro código, erro não Prisma e falha de histórico', async () => {
    const outro = p2002(['empresaId', 'nome'], 'P2003');
    prisma.produto.create.mockRejectedValueOnce(outro);
    await expect(
      service.criar('e1', { nome: 'Produto', precoVenda: 10 }, usuario),
    ).rejects.toBe(outro);
    const comum = new Error('falha');
    prisma.produto.create.mockRejectedValueOnce(comum);
    await expect(
      service.criar('e1', { nome: 'Produto', precoVenda: 10 }, usuario),
    ).rejects.toBe(comum);
    prisma.produto.create.mockResolvedValue(produto());
    const historico = new Error('histórico');
    prisma.produtoHistorico.create.mockRejectedValue(historico);
    await expect(
      service.criar('e1', { nome: 'Produto', precoVenda: 10 }, usuario),
    ).rejects.toBe(historico);
  });
});
