import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtPayload } from '../types/jwt-payload.type';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  const prisma = { usuario: { findUnique: jest.fn() } };
  const payload: JwtPayload = {
    id: 'usuario-1',
    email: 'usuario@sistema.com',
    tipo: 'USUARIO_EMPRESA',
    empresaId: 'empresa-1',
    versaoAutorizacao: 0,
    perfis: ['colaborador'],
    permissoes: ['agenda.visualizar', 'clientes.visualizar'],
  };
  const usuario = {
    ativo: true,
    versaoAutorizacao: 0,
    tipo: payload.tipo,
    empresaId: payload.empresaId,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.usuario.findUnique.mockResolvedValue(usuario);
    const configService = {
      getOrThrow: jest.fn().mockReturnValue('segredo-teste'),
    } as unknown as ConfigService;
    strategy = new JwtStrategy(
      configService,
      prisma as unknown as PrismaService,
    );
  });

  it('autentica usuário ativo com versão igual e preserva claims', async () => {
    await expect(strategy.validate(payload)).resolves.toEqual(payload);
    expect(prisma.usuario.findUnique).toHaveBeenCalledWith({
      where: { id: payload.id },
      select: {
        ativo: true,
        versaoAutorizacao: true,
        tipo: true,
        empresaId: true,
      },
    });
  });

  it.each([
    ['inexistente', null],
    ['inativo', { ...usuario, ativo: false }],
    ['versão divergente', { ...usuario, versaoAutorizacao: 1 }],
    ['tipo alterado', { ...usuario, tipo: 'ADMIN_EMPRESA' }],
    ['empresa alterada', { ...usuario, empresaId: 'empresa-2' }],
  ])('rejeita usuário %s', async (_cenario, estado) => {
    prisma.usuario.findUnique.mockResolvedValue(estado);
    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it.each([undefined, -1, 0.5, NaN])(
    'rejeita versão ausente ou inválida: %s',
    async (versaoAutorizacao) => {
      await expect(
        strategy.validate({ ...payload, versaoAutorizacao }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.usuario.findUnique).not.toHaveBeenCalled();
    },
  );

  it('não reabilita token anterior depois de reativação com versão incrementada', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      ...usuario,
      ativo: true,
      versaoAutorizacao: 1,
    });
    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(
      strategy.validate({ ...payload, versaoAutorizacao: 1 }),
    ).resolves.toMatchObject({ versaoAutorizacao: 1 });
  });

  it('não autentica quando a consulta persistida falha', async () => {
    prisma.usuario.findUnique.mockRejectedValue(
      new Error('banco indisponível'),
    );
    const resultado = strategy.validate(payload);
    await expect(resultado).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(resultado).rejects.toMatchObject({
      message: 'Sessão inválida. Faça login novamente.',
      response: {
        statusCode: 401,
        message: 'Sessão inválida. Faça login novamente.',
      },
    });
    await expect(resultado).rejects.not.toThrow('banco indisponível');
  });
});
