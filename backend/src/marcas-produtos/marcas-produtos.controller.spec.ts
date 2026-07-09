import { Test, TestingModule } from '@nestjs/testing';
import { MarcasProdutosController } from './marcas-produtos.controller';

describe('MarcasProdutosController', () => {
  let controller: MarcasProdutosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarcasProdutosController],
    }).compile();

    controller = module.get<MarcasProdutosController>(MarcasProdutosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
