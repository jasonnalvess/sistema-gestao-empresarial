import { Test, TestingModule } from '@nestjs/testing';
import { InventariosEstoqueController } from './inventarios-estoque.controller';

describe('InventariosEstoqueController', () => {
  let controller: InventariosEstoqueController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventariosEstoqueController],
    }).compile();

    controller = module.get<InventariosEstoqueController>(InventariosEstoqueController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
