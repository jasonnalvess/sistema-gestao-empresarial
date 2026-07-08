import { Test, TestingModule } from '@nestjs/testing';
import { MovimentacoesEstoqueService } from './movimentacoes-estoque.service';

describe('MovimentacoesEstoqueService', () => {
  let service: MovimentacoesEstoqueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MovimentacoesEstoqueService],
    }).compile();

    service = module.get<MovimentacoesEstoqueService>(MovimentacoesEstoqueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
