import { Test, TestingModule } from '@nestjs/testing';
import { EmpresaModulosController } from './empresa-modulos.controller';

describe('EmpresaModulosController', () => {
  let controller: EmpresaModulosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmpresaModulosController],
    }).compile();

    controller = module.get<EmpresaModulosController>(EmpresaModulosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
