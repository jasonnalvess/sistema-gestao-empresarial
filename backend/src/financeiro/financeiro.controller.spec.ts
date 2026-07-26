import { Test, TestingModule } from '@nestjs/testing';

import { FinanceiroController } from './financeiro.controller';
import { FinanceiroService } from './financeiro.service';

describe('FinanceiroController', () => {
  let controller: FinanceiroController;

  const financeiroServiceMock = {
    resumo: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FinanceiroController],
      providers: [
        {
          provide: FinanceiroService,
          useValue: financeiroServiceMock,
        },
      ],
    }).compile();

    controller = module.get<FinanceiroController>(FinanceiroController);

    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });
});
