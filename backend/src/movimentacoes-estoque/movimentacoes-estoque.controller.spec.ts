import { Test, TestingModule } from '@nestjs/testing';
import { MovimentacoesEstoqueController } from './movimentacoes-estoque.controller';

describe('MovimentacoesEstoqueController', () => {
  let controller: MovimentacoesEstoqueController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MovimentacoesEstoqueController],
    }).compile();

    controller = module.get<MovimentacoesEstoqueController>(MovimentacoesEstoqueController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
