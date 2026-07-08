import { Test, TestingModule } from '@nestjs/testing';
import { EmpresaModulosService } from './empresa-modulos.service';

describe('EmpresaModulosService', () => {
  let service: EmpresaModulosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmpresaModulosService],
    }).compile();

    service = module.get<EmpresaModulosService>(EmpresaModulosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
