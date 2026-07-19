import { Test, TestingModule } from '@nestjs/testing';
import { CaixasController } from './caixas.controller';

describe('CaixasController', () => {
  let controller: CaixasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CaixasController],
    }).compile();

    controller = module.get<CaixasController>(CaixasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
