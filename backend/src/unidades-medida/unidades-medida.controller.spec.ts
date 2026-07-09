import { Test, TestingModule } from '@nestjs/testing';
import { UnidadesMedidaController } from './unidades-medida.controller';

describe('UnidadesMedidaController', () => {
  let controller: UnidadesMedidaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UnidadesMedidaController],
    }).compile();

    controller = module.get<UnidadesMedidaController>(UnidadesMedidaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
