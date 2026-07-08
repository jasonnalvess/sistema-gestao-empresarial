import { Test, TestingModule } from '@nestjs/testing';
import { OrdensServicoController } from './ordens-servico.controller';

describe('OrdensServicoController', () => {
  let controller: OrdensServicoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdensServicoController],
    }).compile();

    controller = module.get<OrdensServicoController>(OrdensServicoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
