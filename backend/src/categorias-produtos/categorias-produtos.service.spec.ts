import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriasProdutosService } from './categorias-produtos.service';

describe('CategoriasProdutosService', () => {
  let service: CategoriasProdutosService;

  const prismaMock = {
    categoriaProduto: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriasProdutosService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<CategoriasProdutosService>(CategoriasProdutosService);

    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(
      (operacoes: Promise<unknown>[]) => Promise.all(operacoes),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  it('cria e lista exclusivamente no tenant explícito', async () => {
    prismaMock.categoriaProduto.create.mockResolvedValue({ id: 'c1' });
    prismaMock.categoriaProduto.findMany.mockResolvedValue([]);
    prismaMock.categoriaProduto.count.mockResolvedValue(0);
    await service.criar('e1', { nome: 'Categoria' });
    await service.listar('e1', {
      search: 'cat',
      ativo: false,
      sortBy: 'nome',
      order: 'asc',
    });
    expect(prismaMock.categoriaProduto.create).toHaveBeenCalledWith({
      data: { nome: 'Categoria', descricao: undefined, empresaId: 'e1' },
    });
    const where = expect.objectContaining({
      empresaId: 'e1',
      ativo: false,
    }) as unknown;
    expect(prismaMock.categoriaProduto.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where, orderBy: { nome: 'asc' } }),
    );
    expect(prismaMock.categoriaProduto.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        empresaId: 'e1',
        ativo: false,
      }) as unknown,
    });
  });

  it('usa fallback seguro e busca detalhe por id + empresaId', async () => {
    prismaMock.categoriaProduto.findMany.mockResolvedValue([]);
    prismaMock.categoriaProduto.count.mockResolvedValue(0);
    prismaMock.categoriaProduto.findFirst.mockResolvedValue({ id: 'c1' });
    await service.listar('e1', { sortBy: 'empresaId', order: 'asc' });
    await service.buscarPorId('e1', 'c1');
    expect(prismaMock.categoriaProduto.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'asc' } }),
    );
    expect(prismaMock.categoriaProduto.findFirst).toHaveBeenCalledWith({
      where: { id: 'c1', empresaId: 'e1' },
    });
  });

  it('retorna o mesmo 404 para recurso inexistente ou externo', async () => {
    prismaMock.categoriaProduto.findFirst.mockResolvedValue(null);
    await expect(service.buscarPorId('e1', 'externa')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it.each([
    [['empresaId', 'nome']],
    [['nome', 'empresaId']],
    ['CategoriaProduto_empresaId_nome_key'],
  ])('converte somente P2002 conhecido %p', async (target) => {
    const erro = new Prisma.PrismaClientKnownRequestError('erro', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target },
    });
    prismaMock.categoriaProduto.create.mockRejectedValue(erro);
    await expect(service.criar('e1', { nome: 'Categoria' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('relança P2002 de outra constraint e erro não Prisma', async () => {
    const prismaErro = new Prisma.PrismaClientKnownRequestError('erro', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target: ['empresaId', 'nome', 'extra'] },
    });
    prismaMock.categoriaProduto.create.mockRejectedValueOnce(prismaErro);
    await expect(service.criar('e1', { nome: 'Categoria' })).rejects.toBe(
      prismaErro,
    );
    const erro = new Error('falha');
    prismaMock.categoriaProduto.create.mockRejectedValueOnce(erro);
    await expect(service.criar('e1', { nome: 'Categoria' })).rejects.toBe(erro);
  });

  it('valida tenant antes das mutações e preserva idempotência de status', async () => {
    prismaMock.categoriaProduto.findFirst.mockResolvedValue({ id: 'c1' });
    prismaMock.categoriaProduto.update.mockResolvedValue({ id: 'c1' });
    await service.atualizar('e1', 'c1', { nome: 'Nova' });
    await service.ativar('e1', 'c1');
    await service.desativar('e1', 'c1');
    expect(prismaMock.categoriaProduto.findFirst).toHaveBeenCalledTimes(3);
    expect(prismaMock.categoriaProduto.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'c1' },
      data: { ativo: true },
    });
    expect(prismaMock.categoriaProduto.update).toHaveBeenNthCalledWith(3, {
      where: { id: 'c1' },
      data: { ativo: false },
    });
  });
});
