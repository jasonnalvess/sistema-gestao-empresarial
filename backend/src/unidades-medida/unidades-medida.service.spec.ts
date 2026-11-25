import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { UnidadesMedidaService } from './unidades-medida.service';

describe('UnidadesMedidaService', () => {
  let service: UnidadesMedidaService;

  const prismaMock = {
    unidadeMedida: {
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
        UnidadesMedidaService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<UnidadesMedidaService>(UnidadesMedidaService);

    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(
      (operacoes: Promise<unknown>[]) => Promise.all(operacoes),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  it('normaliza sigla e limita listagem e detalhe ao tenant', async () => {
    prismaMock.unidadeMedida.create.mockResolvedValue({ id: 'u1' });
    prismaMock.unidadeMedida.findMany.mockResolvedValue([]);
    prismaMock.unidadeMedida.count.mockResolvedValue(0);
    prismaMock.unidadeMedida.findFirst.mockResolvedValue({ id: 'u1' });
    await service.criar('e1', { nome: 'Unidade', sigla: 'un' });
    await service.listar('e1', { page: 1 });
    await service.buscarPorId('e1', 'u1');
    expect(prismaMock.unidadeMedida.create).toHaveBeenCalledWith({
      data: { nome: 'Unidade', sigla: 'UN', empresaId: 'e1' },
    });
    expect(prismaMock.unidadeMedida.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { empresaId: 'e1' },
        orderBy: { createdAt: 'desc' },
      }),
    );
    expect(prismaMock.unidadeMedida.count).toHaveBeenCalledWith({
      where: { empresaId: 'e1' },
    });
    expect(prismaMock.unidadeMedida.findFirst).toHaveBeenCalledWith({
      where: { id: 'u1', empresaId: 'e1' },
    });
  });
  it('oculta unidade externa com 404', async () => {
    prismaMock.unidadeMedida.findFirst.mockResolvedValue(null);
    await expect(service.buscarPorId('e1', 'u2')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
  it.each([
    [['empresaId', 'sigla']],
    [['sigla', 'empresaId']],
    ['UnidadeMedida_empresaId_sigla_key'],
  ])('converte P2002 conhecido %p', async (target) => {
    const erro = new Prisma.PrismaClientKnownRequestError('erro', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target },
    });
    prismaMock.unidadeMedida.create.mockRejectedValue(erro);
    await expect(
      service.criar('e1', { nome: 'Unidade', sigla: 'UN' }),
    ).rejects.toThrow(ConflictException);
  });
  it('relança conflito diferente e preserva mutações tenant-aware', async () => {
    const erro = new Error('falha');
    prismaMock.unidadeMedida.create.mockRejectedValue(erro);
    await expect(
      service.criar('e1', { nome: 'Unidade', sigla: 'UN' }),
    ).rejects.toBe(erro);
    prismaMock.unidadeMedida.findFirst.mockResolvedValue({ id: 'u1' });
    prismaMock.unidadeMedida.update.mockResolvedValue({});
    await service.atualizar('e1', 'u1', { sigla: 'cx' });
    await service.ativar('e1', 'u1');
    await service.desativar('e1', 'u1');
    expect(prismaMock.unidadeMedida.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'u1' },
      data: { nome: undefined, sigla: 'CX' },
    });
  });
});
