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
  it('lista somente módulos ativos da empresa, ordenados e sem campos administrativos', async () => {
    prismaServiceMock.empresaModulo.findMany.mockResolvedValue([
      { modulo: { chave: 'agenda' } },
      { modulo: { chave: 'crm' } },
    ]);

    await expect(service.listarAtivosDaEmpresa('empresa-a')).resolves.toEqual({
      modulos: [{ chave: 'agenda' }, { chave: 'crm' }],
    });

    expect(prismaServiceMock.empresaModulo.findMany).toHaveBeenCalledWith({
      where: {
        empresaId: 'empresa-a',
        ativo: true,
        modulo: { is: { ativo: true } },
      },
      select: { modulo: { select: { chave: true } } },
      orderBy: { modulo: { chave: 'asc' } },
    });
  });
});
