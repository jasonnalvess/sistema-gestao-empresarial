import { Test, TestingModule } from '@nestjs/testing';
import { CategoriasProdutosController } from './categorias-produtos.controller';
import { CategoriasProdutosService } from './categorias-produtos.service';

describe('CategoriasProdutosController', () => {
  let controller: CategoriasProdutosController;

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
      controllers: [CategoriasProdutosController],
      providers: [
        {
          provide: CategoriasProdutosService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get<CategoriasProdutosController>(
      CategoriasProdutosController,
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
