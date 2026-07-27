import { Test, TestingModule } from '@nestjs/testing';
import { FornecedoresController } from './fornecedores.controller';
import { FornecedoresService } from './fornecedores.service';

describe('FornecedoresController', () => {
  let controller: FornecedoresController;

  const serviceMock = {
    criar: jest.fn(),
    listar: jest.fn(),
    buscarPorId: jest.fn(),
    atualizar: jest.fn(),
    ativar: jest.fn(),
    desativar: jest.fn(),
    adicionarHistorico: jest.fn(),
    listarHistorico: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FornecedoresController],
      providers: [
        {
          provide: FornecedoresService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get<FornecedoresController>(FornecedoresController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
