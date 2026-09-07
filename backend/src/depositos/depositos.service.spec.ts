import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { DepositosService } from './depositos.service';

describe('DepositosService', () => {
  let service: DepositosService;

  const prismaMock = {
    deposito: {
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
        DepositosService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<DepositosService>(DepositosService);

    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(
      (operacoes: Promise<unknown>[]) => Promise.all(operacoes),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  it('cria, lista e detalha somente no tenant explícito', async () => {
    prismaMock.deposito.create.mockResolvedValue({ id: 'd1' });
    prismaMock.deposito.findMany.mockResolvedValue([]);
    prismaMock.deposito.count.mockResolvedValue(0);
    prismaMock.deposito.findFirst.mockResolvedValue({ id: 'd1' });
    await service.criar('e1', { nome: 'Depósito', codigo: 'DEP' });
    await service.listar('e1', {
      search: 'dep',
      ativo: true,
      sortBy: 'codigo',
      order: 'asc',
    });
    await service.buscarPorId('e1', 'd1');
    expect(prismaMock.deposito.create).toHaveBeenCalledWith({
      data: { nome: 'Depósito', codigo: 'DEP', empresaId: 'e1' },
    });
    expect(prismaMock.deposito.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          empresaId: 'e1',
          ativo: true,
        }) as unknown,
        orderBy: { codigo: 'asc' },
      }),
    );
    expect(prismaMock.deposito.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        empresaId: 'e1',
        ativo: true,
      }) as unknown,
    });
    expect(prismaMock.deposito.findFirst).toHaveBeenCalledWith({
      where: { id: 'd1', empresaId: 'e1' },
    });
  });
  it('usa fallback seguro e oculta depósito externo com 404', async () => {
    prismaMock.deposito.findMany.mockResolvedValue([]);
    prismaMock.deposito.count.mockResolvedValue(0);
    await service.listar('e1', { sortBy: 'empresaId' });
    expect(prismaMock.deposito.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
    );
    prismaMock.deposito.findFirst.mockResolvedValue(null);
    await expect(service.buscarPorId('e1', 'd2')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
  it.each([
    [['empresaId', 'codigo'], 'código'],
    [['codigo', 'empresaId'], 'código'],
    ['Deposito_empresaId_codigo_key', 'código'],
    [['empresaId', 'nome'], 'nome'],
    ['Deposito_empresaId_nome_key', 'nome'],
  ] as const)('converte P2002 %p de %s', async (target, mensagem) => {
    const erro = new Prisma.PrismaClientKnownRequestError('erro', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target },
    });
    prismaMock.deposito.create.mockRejectedValue(erro);
    await expect(
      service.criar('e1', { nome: 'Depósito', codigo: 'DEP' }),
    ).rejects.toThrow(new RegExp(mensagem));
  });
  it('relança constraint diferente e valida tenant antes das mutações', async () => {
    const erro = new Prisma.PrismaClientKnownRequestError('erro', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target: ['empresaId', 'nome', 'extra'] },
    });
    prismaMock.deposito.create.mockRejectedValue(erro);
    await expect(
      service.criar('e1', { nome: 'Depósito', codigo: 'DEP' }),
    ).rejects.toBe(erro);
    prismaMock.deposito.findFirst.mockResolvedValue({ id: 'd1' });
    prismaMock.deposito.update.mockResolvedValue({});
    await service.atualizar('e1', 'd1', { nome: 'Novo' });
    await service.ativar('e1', 'd1');
    await service.desativar('e1', 'd1');
    expect(prismaMock.deposito.findFirst).toHaveBeenCalledTimes(3);
  });
});
