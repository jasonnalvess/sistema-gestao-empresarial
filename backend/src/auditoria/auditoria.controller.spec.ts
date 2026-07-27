import { Test, TestingModule } from '@nestjs/testing';

import { AuditoriaController } from './auditoria.controller';
import { AuditoriaService } from './auditoria.service';

describe('AuditoriaController', () => {
  let controller: AuditoriaController;

  const auditoriaServiceMock = {
    listar: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditoriaController],
      providers: [
        {
          provide: AuditoriaService,
          useValue: auditoriaServiceMock,
        },
      ],
    }).compile();

    controller = module.get<AuditoriaController>(AuditoriaController);
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });
});
