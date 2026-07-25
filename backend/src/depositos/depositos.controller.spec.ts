import { Test, TestingModule } from '@nestjs/testing';
import { DepositosController } from './depositos.controller';

describe('DepositosController', () => {
  let controller: DepositosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DepositosController],
    }).compile();

    controller = module.get<DepositosController>(DepositosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
