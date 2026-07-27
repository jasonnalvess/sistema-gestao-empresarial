import { EstoqueController } from './estoque.controller';
import { EstoqueService } from './estoque.service';

describe('EstoqueController', () => {
  it('should be defined', () => {
    expect(new EstoqueController({} as EstoqueService)).toBeDefined();
  });
});
