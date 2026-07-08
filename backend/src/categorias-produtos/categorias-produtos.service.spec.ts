import { Test, TestingModule } from '@nestjs/testing';
import { CategoriasProdutosService } from './categorias-produtos.service';

describe('CategoriasProdutosService', () => {
  let service: CategoriasProdutosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoriasProdutosService],
    }).compile();

    service = module.get<CategoriasProdutosService>(CategoriasProdutosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
