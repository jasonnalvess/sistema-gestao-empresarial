import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;

  const prismaServiceMock = {
    $transaction: jest.fn(),
    empresa: {
      count: jest.fn(),
    },
    usuario: {
      count: jest.fn(),
    },
    produto: {
      count: jest.fn(),
    },
    categoriaProduto: {
      count: jest.fn(),
    },
    movimentacaoEstoque: {
      count: jest.fn(),
    },
    auditoriaLog: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('preserva as métricas e isola todas as contagens por empresa', async () => {
    prismaServiceMock.$transaction.mockResolvedValue([2, 3, 4, 5, 6]);

    await expect(service.resumo('empresa-1')).resolves.toEqual({
      empresas: 1,
      usuarios: 2,
      produtos: 3,
      categorias: 4,
      movimentacoesEstoque: 5,
      auditoriaLogs: 6,
    });

    for (const model of [
      prismaServiceMock.usuario,
      prismaServiceMock.produto,
      prismaServiceMock.categoriaProduto,
      prismaServiceMock.movimentacaoEstoque,
      prismaServiceMock.auditoriaLog,
    ]) {
      expect(model.count).toHaveBeenCalledWith({
        where: { empresaId: 'empresa-1' },
      });
    }
  });

  it('retorna dados vazios sem remover o filtro empresarial', async () => {
    prismaServiceMock.$transaction.mockResolvedValue([0, 0, 0, 0, 0]);

    await expect(service.resumo('empresa-vazia')).resolves.toEqual({
      empresas: 1,
      usuarios: 0,
      produtos: 0,
      categorias: 0,
      movimentacoesEstoque: 0,
      auditoriaLogs: 0,
    });
    expect(prismaServiceMock.usuario.count).toHaveBeenCalledWith({
      where: { empresaId: 'empresa-vazia' },
    });
  });
});
