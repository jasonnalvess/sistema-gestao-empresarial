import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { EmpresaModulosService } from './empresa-modulos.service';

describe('EmpresaModulosService', () => {
  let service: EmpresaModulosService;

  const prismaServiceMock = {
    empresa: {
      findUnique: jest.fn(),
    },
    moduloSistema: {
      findUnique: jest.fn(),
    },
    empresaModulo: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmpresaModulosService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    }).compile();

    service = module.get<EmpresaModulosService>(EmpresaModulosService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });
});
