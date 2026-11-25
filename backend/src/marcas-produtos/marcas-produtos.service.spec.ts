import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { MarcasProdutosService } from './marcas-produtos.service';

describe('MarcasProdutosService', () => {
  let service: MarcasProdutosService;

  const prismaMock = {
    marcaProduto: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarcasProdutosService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<MarcasProdutosService>(MarcasProdutosService);

    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(
      (operacoes: Promise<unknown>[]) => Promise.all(operacoes),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  it('cria, lista e detalha somente no tenant explícito', async () => {
    prismaMock.marcaProduto.create.mockResolvedValue({ id: 'm1' });
    prismaMock.marcaProduto.findMany.mockResolvedValue([]);
    prismaMock.marcaProduto.count.mockResolvedValue(0);
    prismaMock.marcaProduto.findFirst.mockResolvedValue({ id: 'm1' });
    await service.criar('e1', { nome: 'Marca' });
    await service.listar('e1', { page: 1 });
    await service.buscarPorId('e1', 'm1');
    expect(prismaMock.marcaProduto.create).toHaveBeenCalledWith({
      data: { nome: 'Marca', descricao: undefined, empresaId: 'e1' },
    });
    expect(prismaMock.marcaProduto.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { empresaId: 'e1' },
        orderBy: { createdAt: 'desc' },
      }),
    );
    expect(prismaMock.marcaProduto.count).toHaveBeenCalledWith({
      where: { empresaId: 'e1' },
    });
    expect(prismaMock.marcaProduto.findFirst).toHaveBeenCalledWith({
      where: { id: 'm1', empresaId: 'e1' },
    });
  });
  it('oculta marca externa com 404', async () => {
    prismaMock.marcaProduto.findFirst.mockResolvedValue(null);
    await expect(service.buscarPorId('e1', 'm2')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
  it.each([
    [['empresaId', 'nome']],
    [['nome', 'empresaId']],
    ['MarcaProduto_empresaId_nome_key'],
  ])('converte P2002 conhecido %p', async (target) => {
    const erro = new Prisma.PrismaClientKnownRequestError('erro', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target },
    });
    prismaMock.marcaProduto.create.mockRejectedValue(erro);
    await expect(service.criar('e1', { nome: 'Marca' })).rejects.toThrow(
      ConflictException,
    );
  });
  it('relança conflito diferente e valida antes das mutações', async () => {
    const erro = new Prisma.PrismaClientKnownRequestError('erro', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target: ['outra'] },
    });
    prismaMock.marcaProduto.create.mockRejectedValue(erro);
    await expect(service.criar('e1', { nome: 'Marca' })).rejects.toBe(erro);
    prismaMock.marcaProduto.findFirst.mockResolvedValue({ id: 'm1' });
    prismaMock.marcaProduto.update.mockResolvedValue({});
    await service.atualizar('e1', 'm1', { nome: 'Nova' });
    await service.ativar('e1', 'm1');
    await service.desativar('e1', 'm1');
    expect(prismaMock.marcaProduto.findFirst).toHaveBeenCalledTimes(3);
  });
});
