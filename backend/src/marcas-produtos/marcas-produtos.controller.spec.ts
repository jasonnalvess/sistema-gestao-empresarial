import { Test, TestingModule } from '@nestjs/testing';
import { MarcasProdutosController } from './marcas-produtos.controller';
import { MarcasProdutosService } from './marcas-produtos.service';

describe('MarcasProdutosController', () => {
  let controller: MarcasProdutosController;

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
      controllers: [MarcasProdutosController],
      providers: [
        {
          provide: MarcasProdutosService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get<MarcasProdutosController>(MarcasProdutosController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
