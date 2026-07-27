import { Test, TestingModule } from '@nestjs/testing';
import { UnidadesMedidaController } from './unidades-medida.controller';
import { UnidadesMedidaService } from './unidades-medida.service';

describe('UnidadesMedidaController', () => {
  let controller: UnidadesMedidaController;

  const serviceMock = {
    criar: jest.fn(),
    listar: jest.fn(),
    buscarPorId: jest.fn(),
    atualizar: jest.fn(),
    ativar: jest.fn(),
    desativar: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UnidadesMedidaController],
      providers: [
        {
          provide: UnidadesMedidaService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get<UnidadesMedidaController>(UnidadesMedidaController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
