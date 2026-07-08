import { Test, TestingModule } from '@nestjs/testing';
import { OrdensServicoService } from './ordens-servico.service';

describe('OrdensServicoService', () => {
  let service: OrdensServicoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrdensServicoService],
    }).compile();

    service = module.get<OrdensServicoService>(OrdensServicoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
