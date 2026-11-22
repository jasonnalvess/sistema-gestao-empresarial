import {
  ConflictException,
  RequestMethod,
  type ExecutionContext,
} from '@nestjs/common';
import {
  HEADERS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AUDITORIA_KEY } from '../common/decorators/auditar.decorator';
import { RateLimitService } from '../common/services/rate-limit.service';
import { IpUtil } from '../common/utils/ip.util';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { RecoveryService } from '../auth/recovery.service';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';

const ID_ALVO = 'b3f0846b-3f58-4e62-bd87-e01ad7ba114e';
const IP_VALIDADO = '203.0.113.10';

describe('UsuariosController — reset manual administrativo', () => {
  const resultado = {
    usuarioId: ID_ALVO,
    email: 'alvo@example.invalid',
    senhaTemporaria: 'SenhaTemp#1234567',
    versaoAutorizacao: 1,
  };
  const corpo = { versaoAutorizacao: 0 };

  const usuariosServiceMock = {
    resetarSenhaAdministrativaManual: jest.fn(),
  };
  const ipUtilMock = {
    getTrustedIp: jest.fn(),
  };

  let controller: UsuariosController;

  const atorSuperAdmin: AuthenticatedUser = {
    id: 'ator-super',
    email: 'super@example.invalid',
    tipo: 'SUPER_ADMIN',
    empresaId: null,
    versaoAutorizacao: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usuariosServiceMock.resetarSenhaAdministrativaManual.mockResolvedValue(
      resultado,
    );
    ipUtilMock.getTrustedIp.mockReturnValue(IP_VALIDADO);

    controller = new UsuariosController(
      usuariosServiceMock as unknown as UsuariosService,
      {} as unknown as RecoveryService,
      {} as unknown as RateLimitService,
      ipUtilMock as unknown as IpUtil,
    );
  });

  const request = () => ({ headers: {} }) as unknown as Request;

  it('expõe POST /usuarios/:id/redefinir-senha-manual', () => {
    const metodo = 'resetarSenhaManual' as const;
    expect(Reflect.getMetadata(PATH_METADATA, controller[metodo])).toBe(
      ':id/redefinir-senha-manual',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, controller[metodo])).toBe(
      RequestMethod.POST,
    );
    expect(Reflect.getMetadata(PATH_METADATA, UsuariosController)).toBe(
      'usuarios',
    );
  });

  it('não declara @Auditar no handler nem na classe (ADR-026)', () => {
    const metodo = 'resetarSenhaManual' as const;
    const reflector = new Reflector();

    expect(reflector.get(AUDITORIA_KEY, controller[metodo])).toBeUndefined();
    expect(reflector.get(AUDITORIA_KEY, UsuariosController)).toBeUndefined();
    expect(
      reflector.getAllAndOverride(AUDITORIA_KEY, [
        controller[metodo],
        UsuariosController,
      ]),
    ).toBeUndefined();
  });

  it('restringe o endpoint a SUPER_ADMIN, sem permissão adicional', () => {
    const metodo = 'resetarSenhaManual' as const;
    const reflector = new Reflector();

    expect(reflector.get(ROLES_KEY, controller[metodo])).toEqual([
      'SUPER_ADMIN',
    ]);
    expect(reflector.get(PERMISSIONS_KEY, controller[metodo])).toBeUndefined();
  });

  it('bloqueia ADMIN_EMPRESA e USUARIO_EMPRESA no guard de papéis', () => {
    const metodo = 'resetarSenhaManual' as const;
    const reflector = new Reflector();
    const guard = new RolesGuard(reflector);

    const criarContexto = (tipo: string) =>
      ({
        getHandler: () => controller[metodo],
        getClass: () => UsuariosController,
        switchToHttp: () => ({
          getRequest: () => ({ user: { ...atorSuperAdmin, tipo } }),
        }),
      }) as unknown as ExecutionContext;

    expect(guard.canActivate(criarContexto('SUPER_ADMIN'))).toBe(true);
    expect(guard.canActivate(criarContexto('ADMIN_EMPRESA'))).toBe(false);
    expect(guard.canActivate(criarContexto('USUARIO_EMPRESA'))).toBe(false);
  });

  it('permite a operação sem permissão declarada (papel já validado)', () => {
    const metodo = 'resetarSenhaManual' as const;
    const reflector = new Reflector();
    const guard = new PermissionsGuard(reflector);
    const contexto = {
      getHandler: () => controller[metodo],
      getClass: () => UsuariosController,
      switchToHttp: () => ({
        getRequest: () => ({ user: { ...atorSuperAdmin, permissoes: [] } }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(contexto)).toBe(true);
  });

  it('aplica Cache-Control: no-store na resposta', () => {
    const metodo = 'resetarSenhaManual' as const;
    const cabecalhos = Reflect.getMetadata(
      HEADERS_METADATA,
      controller[metodo],
    ) as Array<{ name: string; value: string }>;

    expect(cabecalhos).toContainEqual({
      name: 'Cache-Control',
      value: 'no-store',
    });
  });

  it('encaminha alvo, versão esperada, ator e IP confiável ao service', async () => {
    await expect(
      controller.resetarSenhaManual(ID_ALVO, corpo, atorSuperAdmin, request()),
    ).resolves.toEqual(resultado);

    expect(ipUtilMock.getTrustedIp).toHaveBeenCalledTimes(1);
    expect(
      usuariosServiceMock.resetarSenhaAdministrativaManual,
    ).toHaveBeenCalledWith(
      ID_ALVO,
      atorSuperAdmin,
      corpo.versaoAutorizacao,
      IP_VALIDADO,
    );
  });

  it('encaminha IP indefinido quando o ingresso não o fornece', async () => {
    ipUtilMock.getTrustedIp.mockReturnValue(null);

    await controller.resetarSenhaManual(
      ID_ALVO,
      corpo,
      atorSuperAdmin,
      request(),
    );

    expect(
      usuariosServiceMock.resetarSenhaAdministrativaManual,
    ).toHaveBeenCalledWith(
      ID_ALVO,
      atorSuperAdmin,
      corpo.versaoAutorizacao,
      undefined,
    );
  });

  it('propaga o resultado do service sem alterá-lo', async () => {
    const resposta = await controller.resetarSenhaManual(
      ID_ALVO,
      corpo,
      atorSuperAdmin,
      request(),
    );

    expect(resposta).toBe(resultado);
  });

  it('propaga o conflito de versão do service', async () => {
    const conflito = new ConflictException({
      error: 'RESET_CONCORRENTE',
      message: 'Recarregue os dados e confirme novamente.',
    });
    usuariosServiceMock.resetarSenhaAdministrativaManual.mockRejectedValue(
      conflito,
    );

    await expect(
      controller.resetarSenhaManual(ID_ALVO, corpo, atorSuperAdmin, request()),
    ).rejects.toBe(conflito);
  });
});
