import { Test, TestingModule } from '@nestjs/testing';
import { UnidadesMedidaService } from './unidades-medida.service';

describe('UnidadesMedidaService', () => {
  let service: UnidadesMedidaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UnidadesMedidaService],
    }).compile();

    service = module.get<UnidadesMedidaService>(UnidadesMedidaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
