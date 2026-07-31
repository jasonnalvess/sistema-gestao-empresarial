import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { PrismaService } from '../../prisma/prisma.service';
import { EmpresaContextoGuard } from './empresa-contexto.guard';

const EMPRESA_ID = '11111111-1111-4111-8111-111111111111';
const OUTRA_EMPRESA_ID = '22222222-2222-4222-8222-222222222222';

describe('EmpresaContextoGuard', () => {
  const prisma = { empresa: { findUnique: jest.fn() } };
  const guard = new EmpresaContextoGuard(prisma as unknown as PrismaService);

  const contexto = (
    user: AuthenticatedUser,
    header?: string | string[],
  ): {
    executionContext: ExecutionContext;
    request: Record<string, unknown>;
  } => {
    const request = {
      user,
      headers: header === undefined ? {} : { 'x-empresa-id': header },
    };
    return {
      request,
      executionContext: {
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext,
    };
  };

  beforeEach(() => jest.clearAllMocks());

  it.each(['ADMIN_EMPRESA', 'USUARIO_EMPRESA'])(
    '%s usa exclusivamente a empresa ativa do JWT',
    async (tipo) => {
      prisma.empresa.findUnique.mockResolvedValue({
        id: EMPRESA_ID,
        ativa: true,
      });
      const { executionContext, request } = contexto({
        id: 'usuario-1',
        email: 'u@e.com',
        tipo,
        empresaId: EMPRESA_ID,
      });

      await expect(guard.canActivate(executionContext)).resolves.toBe(true);
      expect(request).toMatchObject({
        empresaContexto: { empresaId: EMPRESA_ID, origem: 'JWT' },
      });
    },
  );

  it('rejeita troca de tenant por usuário empresarial', async () => {
    const { executionContext } = contexto(
      {
        id: 'u',
        email: 'u@e.com',
        tipo: 'ADMIN_EMPRESA',
        empresaId: EMPRESA_ID,
      },
      OUTRA_EMPRESA_ID,
    );
    await expect(guard.canActivate(executionContext)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.empresa.findUnique).not.toHaveBeenCalled();
  });

  it('rejeita SUPER_ADMIN sem empresa selecionada', async () => {
    const { executionContext } = contexto({
      id: 's',
      email: 's@e.com',
      tipo: 'SUPER_ADMIN',
      empresaId: null,
    });
    await expect(guard.canActivate(executionContext)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejeita cabeçalho inválido de SUPER_ADMIN', async () => {
    const { executionContext } = contexto(
      { id: 's', email: 's@e.com', tipo: 'SUPER_ADMIN', empresaId: null },
      'empresa-invalida',
    );
    await expect(guard.canActivate(executionContext)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('retorna 404 para empresa inexistente', async () => {
    prisma.empresa.findUnique.mockResolvedValue(null);
    const { executionContext } = contexto(
      { id: 's', email: 's@e.com', tipo: 'SUPER_ADMIN', empresaId: null },
      EMPRESA_ID,
    );
    await expect(guard.canActivate(executionContext)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it.each(['SUPER_ADMIN', 'ADMIN_EMPRESA'])(
    'bloqueia empresa inativa para %s',
    async (tipo) => {
      prisma.empresa.findUnique.mockResolvedValue({
        id: EMPRESA_ID,
        ativa: false,
      });
      const { executionContext } = contexto(
        {
          id: 'u',
          email: 'u@e.com',
          tipo,
          empresaId: tipo === 'SUPER_ADMIN' ? null : EMPRESA_ID,
        },
        tipo === 'SUPER_ADMIN' ? EMPRESA_ID : undefined,
      );
      await expect(guard.canActivate(executionContext)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    },
  );

  it('rejeita usuário empresarial sem empresa no JWT', async () => {
    const { executionContext } = contexto({
      id: 'u',
      email: 'u.com',
      tipo: 'USUARIO_EMPRESA',
      empresaId: null,
    });
    await expect(guard.canActivate(executionContext)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('aceita header igual ao tenant do JWT sem substituir sua origem', async () => {
    prisma.empresa.findUnique.mockResolvedValue({
      id: EMPRESA_ID,
      ativa: true,
    });
    const { executionContext, request } = contexto(
      { id: 'u', email: 'u.com', tipo: 'ADMIN_EMPRESA', empresaId: EMPRESA_ID },
      EMPRESA_ID,
    );
    await guard.canActivate(executionContext);
    expect(request).toMatchObject({
      empresaContexto: { empresaId: EMPRESA_ID, origem: 'JWT' },
    });
  });

  it('retorna 404 também para empresa do JWT inexistente', async () => {
    prisma.empresa.findUnique.mockResolvedValue(null);
    const { executionContext } = contexto({
      id: 'u',
      email: 'u.com',
      tipo: 'ADMIN_EMPRESA',
      empresaId: EMPRESA_ID,
    });
    await expect(guard.canActivate(executionContext)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it.each([
    { tipo: 'SUPER_ADMIN', empresaId: null },
    { tipo: 'ADMIN_EMPRESA', empresaId: EMPRESA_ID },
  ])('rejeita header em formato array para ', async ({ tipo, empresaId }) => {
    const { executionContext } = contexto(
      { id: 'u', email: 'u.com', tipo, empresaId },
      [EMPRESA_ID],
    );
    await expect(guard.canActivate(executionContext)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it.each(['', '   '])(
    'trata header vazio de SUPER_ADMIN como ausente',
    async (header) => {
      const { executionContext } = contexto(
        { id: 's', email: 's.com', tipo: 'SUPER_ADMIN', empresaId: null },
        header,
      );
      await expect(guard.canActivate(executionContext)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    },
  );

  it('resolve empresa ativa selecionada pelo SUPER_ADMIN', async () => {
    prisma.empresa.findUnique.mockResolvedValue({
      id: EMPRESA_ID,
      ativa: true,
    });
    const { executionContext, request } = contexto(
      { id: 's', email: 's@e.com', tipo: 'SUPER_ADMIN', empresaId: null },
      ` ${EMPRESA_ID} `,
    );
    await expect(guard.canActivate(executionContext)).resolves.toBe(true);
    expect(request).toMatchObject({
      empresaContexto: {
        empresaId: EMPRESA_ID,
        origem: 'SUPER_ADMIN_HEADER',
      },
    });
  });
});
