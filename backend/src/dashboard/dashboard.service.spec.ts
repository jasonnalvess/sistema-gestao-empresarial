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
});
