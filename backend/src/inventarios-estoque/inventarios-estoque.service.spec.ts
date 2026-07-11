import { Test, TestingModule } from '@nestjs/testing';
import { InventariosEstoqueService } from './inventarios-estoque.service';

describe('InventariosEstoqueService', () => {
  let service: InventariosEstoqueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InventariosEstoqueService],
    }).compile();

    service = module.get<InventariosEstoqueService>(InventariosEstoqueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
