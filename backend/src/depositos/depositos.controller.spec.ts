import { Test, TestingModule } from '@nestjs/testing';
import { DepositosController } from './depositos.controller';
import { DepositosService } from './depositos.service';

describe('DepositosController', () => {
  let controller: DepositosController;

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
      controllers: [DepositosController],
      providers: [
        {
          provide: DepositosService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get<DepositosController>(DepositosController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
