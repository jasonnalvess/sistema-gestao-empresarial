import { MovimentacoesEstoqueController } from './movimentacoes-estoque.controller';
import { MovimentacoesEstoqueService } from './movimentacoes-estoque.service';

describe('MovimentacoesEstoqueController', () => {
  it('should be defined', () => {
    expect(
      new MovimentacoesEstoqueController({} as MovimentacoesEstoqueService),
    ).toBeDefined();
  });
});
