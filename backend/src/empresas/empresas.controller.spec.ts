import { Test, TestingModule } from '@nestjs/testing';
import { EmpresasController } from './empresas.controller';
import { EmpresasService } from './empresas.service';

describe('EmpresasController', () => {
  let controller: EmpresasController;

  const empresasServiceMock = {
    criar: jest.fn(),
    listar: jest.fn(),
    buscarPorId: jest.fn(),
    atualizar: jest.fn(),
    ativar: jest.fn(),
    desativar: jest.fn(),
    excluir: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmpresasController],
      providers: [
        {
          provide: EmpresasService,
          useValue: empresasServiceMock,
        },
      ],
    }).compile();

    controller = module.get<EmpresasController>(EmpresasController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });
});
