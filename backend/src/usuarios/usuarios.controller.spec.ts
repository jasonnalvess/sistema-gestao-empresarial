import {
  BadRequestException,
  ForbiddenException,
  ValidationPipe,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AtualizarPerfisUsuarioDto } from './dto/atualizar-perfis-usuario.dto';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
import { RecoveryService } from '../auth/recovery.service';
import { RateLimitService } from '../common/services/rate-limit.service';
import { IpUtil } from '../common/utils/ip.util';

describe('UsuariosController', () => {
  let controller: UsuariosController;

  const usuariosServiceMock = {
    criar: jest.fn(),
    listar: jest.fn(),
    buscarPorId: jest.fn(),
    atualizar: jest.fn(),
    ativar: jest.fn(),
    desativar: jest.fn(),
    buscarPorEmail: jest.fn(),
  };

  const recoveryServiceMock = {
    solicitarRedefinicaoAdministrativa: jest.fn(),
  };

  const rateLimitServiceMock = {
    checkLimit: jest.fn(),
  };

  const ipUtilMock = {
    getRealIp: jest.fn(),
    getTrustedIp: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsuariosController],
      providers: [
        {
          provide: UsuariosService,
          useValue: usuariosServiceMock,
        },
        {
          provide: RecoveryService,
          useValue: recoveryServiceMock,
        },
        {
          provide: RateLimitService,
          useValue: rateLimitServiceMock,
        },
        {
          provide: IpUtil,
          useValue: ipUtilMock,
        },
      ],
    }).compile();

    controller = module.get<UsuariosController>(UsuariosController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('CE-3D — contrato dos endpoints de perfis', () => {
    const ator = {
      id: 'ator',
      email: 'ator@example.invalid',
      tipo: 'ADMIN_EMPRESA' as const,
      empresaId: 'empresa-a',
      versaoAutorizacao: 0,
      permissoes: ['usuarios.perfis.gerenciar'],
    };
    const service = { listarPerfis: jest.fn(), atualizarPerfis: jest.fn() };
    const controller = new UsuariosController(
      service as unknown as UsuariosService,
      {} as unknown as RecoveryService,
      {} as unknown as RateLimitService,
      {} as unknown as IpUtil,
    );
    beforeEach(() => jest.clearAllMocks());
    it('GET encaminha alvo e ator ao service', async () => {
      service.listarPerfis.mockResolvedValue([]);
      await expect(controller.listarPerfis('alvo', ator)).resolves.toEqual([]);
      expect(service.listarPerfis).toHaveBeenCalledWith('alvo', ator);
    });
    it('PUT encaminha DTO vazio válido e ator ao service', async () => {
      service.atualizarPerfis.mockResolvedValue([]);
      await expect(
        controller.atualizarPerfis('alvo', { perfisIds: [] }, ator),
      ).resolves.toEqual([]);
      expect(service.atualizarPerfis).toHaveBeenCalledWith(
        'alvo',
        { perfisIds: [] },
        ator,
      );
    });
    it.each(['listarPerfis', 'atualizarPerfis'] as const)(
      '%s exige permissão no guard existente',
      (metodo) => {
        const reflector = new Reflector();
        expect(reflector.get(PERMISSIONS_KEY, controller[metodo])).toEqual([
          'usuarios.perfis.gerenciar',
        ]);
        const request = { user: { ...ator, permissoes: [] as string[] } };
        const context = {
          getHandler: () => controller[metodo],
          getClass: () => UsuariosController,
          switchToHttp: () => ({ getRequest: () => request }),
        } as unknown as ExecutionContext;
        const guard = new PermissionsGuard(reflector);
        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
        request.user.permissoes = [...ator.permissoes];
        expect(guard.canActivate(context)).toBe(true);
        expect(reflector.get('roles', controller[metodo])).toEqual([
          'SUPER_ADMIN',
          'ADMIN_EMPRESA',
        ]);
      },
    );
    it('mantém os três guards no controller', () => {
      const guards: { name: string }[] = Reflect.getMetadata(
        '__guards__',
        UsuariosController,
      ) as { name: string }[];
      expect(guards.map((guard) => guard.name)).toEqual([
        'JwtAuthGuard',
        'RolesGuard',
        'PermissionsGuard',
      ]);
    });
    const uuid = 'b3f0846b-3f58-4e62-bd87-e01ad7ba114e';
    const validar = (value: unknown) =>
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }).transform(value, {
        type: 'body',
        metatype: AtualizarPerfisUsuarioDto,
      });
    it.each([
      { caso: 'ausente', body: {} },
      { caso: 'nulo', body: { perfisIds: null } },
      { caso: 'não array', body: { perfisIds: uuid } },
      { caso: 'item não string', body: { perfisIds: [123] } },
      { caso: 'UUID inválido', body: { perfisIds: ['invalido'] } },
      { caso: 'duplicatas', body: { perfisIds: [uuid, uuid] } },
      { caso: 'campo extra', body: { perfisIds: [], empresaId: uuid } },
    ])('DTO rejeita $caso', async ({ body }) => {
      await expect(validar(body)).rejects.toBeInstanceOf(BadRequestException);
    });
    it.each([{ ids: [] }, { ids: [uuid] }])(
      'DTO aceita $ids',
      async ({ ids }) => {
        await expect(validar({ perfisIds: ids })).resolves.toEqual({
          perfisIds: ids,
        });
      },
    );
  });

  describe('POST /usuarios/:id/redefinir-senha', () => {
    const IP_VALIDADO = '203.0.113.10';

    const atorSuperAdmin = {
      id: 'ator-super-admin',
      email: 'super-admin@example.invalid',
      tipo: 'SUPER_ADMIN' as const,
      empresaId: null,
      versaoAutorizacao: 0,
      permissoes: ['usuarios.editar'],
    };

    const atorAdminEmpresa = {
      id: 'ator-admin-empresa',
      email: 'admin-empresa@example.invalid',
      tipo: 'ADMIN_EMPRESA' as const,
      empresaId: 'empresa-a',
      versaoAutorizacao: 0,
      permissoes: ['usuarios.editar'],
    };

    const ipUtilReal = new IpUtil();
    const MENSAGEM_ORIGEM = 'Origem da requisição não verificada.';

    const criarRequest = (headers: Record<string, string | string[]> = {}) =>
      ({
        headers,
        socket: { remoteAddress: '127.0.0.1' },
      }) as unknown as Request;

    const requestValido = () =>
      criarRequest({ 'x-sge-validated-ip': IP_VALIDADO });

    // IP efetivamente usado pelo rate limit (o serviço real resolve via
    // IpUtil.getRealIp a partir da mesma request).
    let ipRateLimit: string | undefined;

    beforeEach(() => {
      jest.clearAllMocks();
      ipRateLimit = undefined;
      recoveryServiceMock.solicitarRedefinicaoAdministrativa.mockResolvedValue(
        undefined,
      );
      ipUtilMock.getTrustedIp.mockImplementation((req: Request) =>
        ipUtilReal.getTrustedIp(req),
      );
      ipUtilMock.getRealIp.mockImplementation((req: Request) =>
        ipUtilReal.getRealIp(req),
      );
      rateLimitServiceMock.checkLimit.mockImplementation((req: Request) => {
        ipRateLimit = ipUtilMock.getRealIp(req) as string;
        return Promise.resolve();
      });
    });

    it.each([
      ['ausente', {}],
      ['vazio', { 'x-sge-validated-ip': '' }],
      ['inválido', { 'x-sge-validated-ip': 'cliente-malicioso' }],
      ['IPv4 fora do intervalo', { 'x-sge-validated-ip': '256.0.0.1' }],
      ['em lista', { 'x-sge-validated-ip': '203.0.113.10, 198.51.100.1' }],
      ['array', { 'x-sge-validated-ip': ['203.0.113.10', '198.51.100.1'] }],
      [
        'substituído por headers públicos',
        {
          'cf-connecting-ip': '203.0.113.30',
          'x-forwarded-for': '198.51.100.31',
        },
      ],
    ])(
      'rejeita com 403 quando o cabeçalho validado está %s',
      async (_caso, headers) => {
        const request = criarRequest(headers);

        const erro: unknown = await controller
          .redefinirSenhaAdministrativa('usuario-alvo', atorSuperAdmin, request)
          .catch((e: unknown) => e);

        expect(erro).toBeInstanceOf(ForbiddenException);
        expect((erro as ForbiddenException).getStatus()).toBe(403);
        expect((erro as ForbiddenException).message).toBe(MENSAGEM_ORIGEM);
        expect(rateLimitServiceMock.checkLimit).not.toHaveBeenCalled();
        expect(
          recoveryServiceMock.solicitarRedefinicaoAdministrativa,
        ).not.toHaveBeenCalled();
      },
    );

    it.each([
      ['IPv4', '203.0.113.10'],
      ['IPv6 completo', '2001:0db8:85a3:0000:0000:8a2e:0370:7334'],
      ['IPv6 comprimido', '2001:db8::10'],
    ])('permite o fluxo com %s válido', async (_caso, ip) => {
      const request = criarRequest({ 'x-sge-validated-ip': ip });

      await controller.redefinirSenhaAdministrativa(
        'usuario-alvo',
        atorAdminEmpresa,
        request,
      );

      expect(rateLimitServiceMock.checkLimit).toHaveBeenCalledTimes(1);
      expect(
        recoveryServiceMock.solicitarRedefinicaoAdministrativa,
      ).toHaveBeenCalledWith('usuario-alvo', atorAdminEmpresa.id, ip);
    });

    it('aplica rate limit com a chave dedicada do endpoint', async () => {
      const request = requestValido();

      await controller.redefinirSenhaAdministrativa(
        'usuario-alvo',
        atorSuperAdmin,
        request,
      );

      expect(rateLimitServiceMock.checkLimit).toHaveBeenCalledTimes(1);
      expect(rateLimitServiceMock.checkLimit).toHaveBeenCalledWith(
        request,
        'auth/redefinir-senha-admin',
      );
    });

    it('resolve o IP pelo getTrustedIp e repassa alvo, ator e IP ao service', async () => {
      const request = criarRequest({
        'x-sge-validated-ip': IP_VALIDADO,
        'x-forwarded-for': '198.51.100.1, 198.51.100.2',
      });

      await controller.redefinirSenhaAdministrativa(
        'usuario-alvo',
        atorAdminEmpresa,
        request,
      );

      expect(ipUtilMock.getTrustedIp).toHaveBeenCalledWith(request);
      expect(
        recoveryServiceMock.solicitarRedefinicaoAdministrativa,
      ).toHaveBeenCalledTimes(1);
      expect(
        recoveryServiceMock.solicitarRedefinicaoAdministrativa,
      ).toHaveBeenCalledWith('usuario-alvo', atorAdminEmpresa.id, IP_VALIDADO);
    });

    it.each([
      ['IPv4', '203.0.113.10'],
      ['IPv6 completo', '2001:0db8:85a3:0000:0000:8a2e:0370:7334'],
      ['IPv6 comprimido', '2001:db8::10'],
      ['IPv4 com espaços', '  203.0.113.10  '],
    ])(
      'usa o mesmo IP validado no rate limit e na auditoria (%s)',
      async (_caso, header) => {
        const request = criarRequest({ 'x-sge-validated-ip': header });

        await controller.redefinirSenhaAdministrativa(
          'usuario-alvo',
          atorAdminEmpresa,
          request,
        );

        const ipAuditoria = (
          recoveryServiceMock.solicitarRedefinicaoAdministrativa.mock
            .calls[0] as unknown[]
        )[2];
        expect(ipRateLimit).toBe(header.trim());
        expect(ipAuditoria).toBe(ipRateLimit);
        expect(ipAuditoria).not.toBe('127.0.0.1');
        expect(ipAuditoria).not.toBe('0.0.0.0');
      },
    );

    it('retorna mensagem genérica de sucesso', async () => {
      const request = requestValido();

      const resultado = await controller.redefinirSenhaAdministrativa(
        'usuario-alvo',
        atorSuperAdmin,
        request,
      );

      expect(resultado).toEqual({
        message:
          'Se o endereço informado estiver cadastrado e puder receber recuperação, você receberá as instruções por e-mail.',
      });
    });

    it('não chama o service quando o rate limit falha', async () => {
      const request = requestValido();
      rateLimitServiceMock.checkLimit.mockRejectedValueOnce(
        new ForbiddenException('Limite de solicitações excedido.'),
      );

      await expect(
        controller.redefinirSenhaAdministrativa(
          'usuario-alvo',
          atorSuperAdmin,
          request,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(
        recoveryServiceMock.solicitarRedefinicaoAdministrativa,
      ).not.toHaveBeenCalled();
    });

    it('propaga erro do service', async () => {
      const request = requestValido();
      recoveryServiceMock.solicitarRedefinicaoAdministrativa.mockRejectedValueOnce(
        new Error('falha inesperada'),
      );

      await expect(
        controller.redefinirSenhaAdministrativa(
          'usuario-alvo',
          atorSuperAdmin,
          request,
        ),
      ).rejects.toThrow('falha inesperada');
    });

    it('exige permissão usuarios.editar', () => {
      const reflector = new Reflector();
      const metodo = 'redefinirSenhaAdministrativa' as const;
      expect(reflector.get(PERMISSIONS_KEY, controller[metodo])).toEqual([
        'usuarios.editar',
      ]);

      const request = {
        user: { ...atorSuperAdmin, permissoes: [] as string[] },
      };
      const context = {
        getHandler: () => controller[metodo],
        getClass: () => UsuariosController,
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext;
      const guard = new PermissionsGuard(reflector);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);

      request.user.permissoes = [...atorSuperAdmin.permissoes];
      expect(guard.canActivate(context)).toBe(true);
    });

    it('restringe o endpoint a SUPER_ADMIN e ADMIN_EMPRESA', () => {
      const reflector = new Reflector();
      const metodo = 'redefinirSenhaAdministrativa' as const;
      expect(reflector.get(ROLES_KEY, controller[metodo])).toEqual([
        'SUPER_ADMIN',
        'ADMIN_EMPRESA',
      ]);
    });
  });
});
