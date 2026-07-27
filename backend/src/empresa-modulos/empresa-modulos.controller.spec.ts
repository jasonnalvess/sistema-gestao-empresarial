import { Test, TestingModule } from '@nestjs/testing';
import { EmpresaModulosController } from './empresa-modulos.controller';
import { EmpresaModulosService } from './empresa-modulos.service';

describe('EmpresaModulosController', () => {
  let controller: EmpresaModulosController;

  const empresaModulosServiceMock = {
    vincular: jest.fn(),
    listarPorEmpresa: jest.fn(),
    ativar: jest.fn(),
    desativar: jest.fn(),
    buscarPorId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmpresaModulosController],
      providers: [
        {
          provide: EmpresaModulosService,
          useValue: empresaModulosServiceMock,
        },
      ],
    }).compile();

    controller = module.get<EmpresaModulosController>(EmpresaModulosController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });
});
