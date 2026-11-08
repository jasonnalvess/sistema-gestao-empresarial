import { Test, TestingModule } from '@nestjs/testing';
import { RecoveryService } from './recovery.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../common/services/mail.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';

describe('RecoveryService', () => {
  let service: RecoveryService;
  let prisma: any;
  let mailService: jest.Mocked<MailService>;
  let auditoriaService: jest.Mocked<AuditoriaService>;
  let txMock: any;

  beforeEach(async () => {
    // Create a shared transaction mock that will be passed to the transaction callback
    txMock = {
      passwordResetToken: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      usuario: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      $queryRaw: jest.fn(),
      $executeRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecoveryService,
        {
          provide: PrismaService,
          useValue: {
            usuario: {
              findUnique: jest.fn(),
            },
            passwordResetToken: {
              // These are for non-transactional calls (not used currently but kept for completeness)
              deleteMany: jest.fn(),
              create: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            $transaction: jest.fn(
              async (callback: (tx: any) => Promise<any>) => {
                return await callback(txMock);
              },
            ),
            $queryRaw: jest.fn(),
            $executeRaw: jest.fn(),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendPasswordResetEmail: jest.fn(),
          },
        },
        {
          provide: AuditoriaService,
          useValue: {
            registrar: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RecoveryService>(RecoveryService);
    prisma = module.get(PrismaService);
    mailService = module.get(MailService);
    auditoriaService = module.get(AuditoriaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('solicitarRecuperacao', () => {
    it('deve gerar token e enviar e-mail se usuário existir e estiver ativo', async () => {
      const email = 'teste@email.com';
      prisma.usuario.findUnique.mockResolvedValue({
        id: 'user-1',
        email: email,
        ativo: true,
        empresaId: null,
      });

      await service.solicitarRecuperacao(email);

      // Verify transaction methods were called
      expect(txMock.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(txMock.passwordResetToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
          }),
        }),
      );
      expect(mailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        email,
        expect.any(String), // raw token
      );
      expect(auditoriaService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          acao: 'SOLICITACAO_RECUPERACAO_SENHA',
        }),
      );
    });

    it('não deve enviar e-mail se usuário não existir', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);

      await service.solicitarRecuperacao('inexistente@email.com');

      expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled();
      expect(auditoriaService.registrar).not.toHaveBeenCalled();
    });

    it('não deve enviar e-mail se usuário estiver inativo', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'teste@email.com',
        ativo: false,
      });

      await service.solicitarRecuperacao('teste@email.com');

      expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled();
      expect(auditoriaService.registrar).not.toHaveBeenCalled();
    });
  });

  describe('redefinirSenha', () => {
    const token = 'token-123';
    const novaSenha = 'NovaSenha123!';
    const hashedToken = createHash('sha256').update(token).digest('hex');

    beforeEach(() => {
      // Reset specific mocks for each test
      txMock.$queryRaw.mockReset();
      txMock.passwordResetToken.findUnique.mockReset();
      txMock.usuario.findUnique.mockReset();
      txMock.usuario.update.mockReset();
      txMock.passwordResetToken.update.mockReset();
    });

    it('deve redefinir a senha se o token for válido', async () => {
      // Setup: queryRaw returns the token ID (FOR UPDATE lock)
      txMock.$queryRaw.mockResolvedValue([{ id: 'token-1' }]);

      // Setup: findUnique returns valid token
      txMock.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        usedAt: null,
        expiresAt: new Date(Date.now() + 10000),
      });

      // Setup: user exists and is active
      txMock.usuario.findUnique.mockResolvedValue({
        id: 'user-1',
        ativo: true,
        empresaId: null,
      });

      await service.redefinirSenha(token, novaSenha);

      // Verify $queryRaw was called with FOR UPDATE
      expect(txMock.$queryRaw).toHaveBeenCalled();

      // Verify token validation
      expect(txMock.passwordResetToken.findUnique).toHaveBeenCalledWith({
        where: { id: 'token-1' },
      });

      // Verify user lookup
      expect(txMock.usuario.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });

      // Verify password update with versaoAutorizacao increment
      expect(txMock.usuario.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            versaoAutorizacao: { increment: 1 },
          }),
        }),
      );

      // Verify token marked as used
      expect(txMock.passwordResetToken.update).toHaveBeenCalledWith({
        where: { id: 'token-1' },
        data: { usedAt: expect.any(Date) },
      });

      // Verify audit log
      expect(auditoriaService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          acao: 'REDEFINICAO_SENHA_CONCLUIDA',
        }),
      );
    });

    it('deve lançar erro se o token estiver expirado', async () => {
      txMock.$queryRaw.mockResolvedValue([{ id: 'token-1' }]);

      txMock.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        usedAt: null,
        expiresAt: new Date(Date.now() - 10000), // expired
      });

      await expect(service.redefinirSenha(token, novaSenha)).rejects.toThrow(
        BadRequestException,
      );

      // Verify password was NOT updated
      expect(txMock.usuario.update).not.toHaveBeenCalled();
      // Verify token was NOT marked as used
      expect(txMock.passwordResetToken.update).not.toHaveBeenCalled();
    });

    it('deve lançar erro se o token já tiver sido utilizado', async () => {
      txMock.$queryRaw.mockResolvedValue([{ id: 'token-1' }]);

      txMock.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        usedAt: new Date(), // already used
        expiresAt: new Date(Date.now() + 10000),
      });

      await expect(service.redefinirSenha(token, novaSenha)).rejects.toThrow(
        BadRequestException,
      );

      expect(txMock.usuario.update).not.toHaveBeenCalled();
      expect(txMock.passwordResetToken.update).not.toHaveBeenCalled();
    });

    it('deve lançar erro se o token for inexistente', async () => {
      txMock.$queryRaw.mockResolvedValue([]); // empty result - token not found

      await expect(
        service.redefinirSenha('token-inexistente', novaSenha),
      ).rejects.toThrow(BadRequestException);

      expect(txMock.passwordResetToken.findUnique).not.toHaveBeenCalled();
      expect(txMock.usuario.update).not.toHaveBeenCalled();
    });

    it('deve lançar erro se o usuário não existir ou estiver inativo', async () => {
      txMock.$queryRaw.mockResolvedValue([{ id: 'token-1' }]);

      txMock.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-1',
        userId: 'user-999',
        usedAt: null,
        expiresAt: new Date(Date.now() + 10000),
      });

      txMock.usuario.findUnique.mockResolvedValue(null); // user not found

      await expect(service.redefinirSenha(token, novaSenha)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(txMock.usuario.update).not.toHaveBeenCalled();
    });
  });
});
