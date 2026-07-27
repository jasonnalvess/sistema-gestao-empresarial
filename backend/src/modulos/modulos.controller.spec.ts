import { Test, TestingModule } from '@nestjs/testing';
import { ModulosController } from './modulos.controller';
import { ModulosService } from './modulos.service';

describe('ModulosController', () => {
  let controller: ModulosController;

  const modulosServiceMock = {
    criar: jest.fn(),
    listar: jest.fn(),
    buscarPorId: jest.fn(),
    ativar: jest.fn(),
    desativar: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModulosController],
      providers: [
        {
          provide: ModulosService,
          useValue: modulosServiceMock,
        },
      ],
    }).compile();

    controller = module.get<ModulosController>(ModulosController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
