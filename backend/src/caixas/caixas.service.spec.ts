import { Test, TestingModule } from '@nestjs/testing';
import { CaixasService } from './caixas.service';

describe('CaixasService', () => {
  let service: CaixasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CaixasService],
    }).compile();

    service = module.get<CaixasService>(CaixasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
