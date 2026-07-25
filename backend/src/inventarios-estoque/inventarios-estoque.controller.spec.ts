import { InventariosEstoqueController } from './inventarios-estoque.controller';
import { InventariosEstoqueService } from './inventarios-estoque.service';

describe('InventariosEstoqueController', () => {
  it('should be defined', () => {
    expect(
      new InventariosEstoqueController({} as InventariosEstoqueService),
    ).toBeDefined();
  });
});
