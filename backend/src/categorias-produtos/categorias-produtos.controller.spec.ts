import { Test, TestingModule } from '@nestjs/testing';
import { CategoriasProdutosController } from './categorias-produtos.controller';

describe('CategoriasProdutosController', () => {
  let controller: CategoriasProdutosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriasProdutosController],
    }).compile();

    controller = module.get<CategoriasProdutosController>(CategoriasProdutosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
