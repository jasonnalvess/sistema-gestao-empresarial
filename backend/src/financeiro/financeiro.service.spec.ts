import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { FinanceiroService } from './financeiro.service';

describe('FinanceiroService', () => {
  let service: FinanceiroService;

  const prismaServiceMock = {
    $transaction: jest.fn(),
    contaPagar: {
      updateMany: jest.fn(),
      aggregate: jest.fn(),
      count: jest.fn(),
    },
    contaReceber: {
      updateMany: jest.fn(),
      aggregate: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanceiroService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    }).compile();

    service = module.get<FinanceiroService>(FinanceiroService);

    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });
});
