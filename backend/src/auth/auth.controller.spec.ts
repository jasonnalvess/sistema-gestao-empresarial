import { TrocaSenhaService } from './troca-senha.service';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RecoveryService } from './recovery.service';
import { RateLimitService } from '../common/services/rate-limit.service';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: TrocaSenhaService, useValue: { trocar: jest.fn() } },
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
          },
        },
        {
          provide: RecoveryService,
          useValue: {
            solicitarRecuperacao: jest.fn(),
            redefinirSenha: jest.fn(),
          },
        },
        {
          provide: RateLimitService,
          useValue: {
            checkLimit: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
