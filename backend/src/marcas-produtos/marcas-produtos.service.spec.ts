import { Test, TestingModule } from '@nestjs/testing';
import { MarcasProdutosService } from './marcas-produtos.service';

describe('MarcasProdutosService', () => {
  let service: MarcasProdutosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MarcasProdutosService],
    }).compile();

    service = module.get<MarcasProdutosService>(MarcasProdutosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
