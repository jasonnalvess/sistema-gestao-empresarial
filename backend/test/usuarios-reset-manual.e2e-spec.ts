import {
  ConflictException,
  INestApplication,
  Logger,
  ServiceUnavailableException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AuditoriaService } from '../src/auditoria/auditoria.service';
import { RecoveryService } from '../src/auth/recovery.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../src/auth/guards/permissions.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { AuditoriaInterceptor } from '../src/common/interceptors/auditoria.interceptor';
import { RespostaInterceptor } from '../src/common/interceptors/resposta.interceptor';
import { RateLimitService } from '../src/common/services/rate-limit.service';
import { IpUtil } from '../src/common/utils/ip.util';
import { PrismaService } from '../src/prisma/prisma.service';
import { UsuariosController } from '../src/usuarios/usuarios.controller';
import { UsuariosService } from '../src/usuarios/usuarios.service';

const SEGREDO_JWT = 'segredo-jwt-e2e-v363-reset-manual';
const ID_RESET = 'b3f0846b-3f58-4e62-bd87-e01ad7ba114e';
const IP_VALIDADO = '203.0.113.10';
const SENHA_TEMPORARIA = 'SenhaTemp#1234567';

type UsuarioToken = {
  id: string;
  email: string;
  tipo: string;
  empresaId: string | null;
  versaoAutorizacao: number;
  perfis?: string[];
  permissoes?: string[];
};

type UsuarioNoBanco = UsuarioToken & {
  ativo?: boolean;
  trocaSenhaObrigatoria?: boolean;
};

const configServiceMock = {
  getOrThrow: (chave: string): string => {
    if (chave === 'JWT_SECRET') return SEGREDO_JWT;
    throw new Error(`Configuração ausente no E2E: ${chave}`);
  },
  get: (chave: string): string | undefined =>
    chave === 'JWT_EXPIRES_IN' ? '1h' : undefined,
};

const prismaMock = {
  usuario: {
    findUnique: jest.fn(),
  },
};

const usuariosServiceMock = {
  resetarSenhaAdministrativaManual: jest.fn(),
};

const recoveryServiceMock = {};

const rateLimitServiceMock = {};

const auditoriaServiceMock = {
  registrar: jest.fn(),
};

function usuarioSuperAdmin(): UsuarioToken {
  return {
    id: 'usuario-super',
    email: 'super@sistema.com',
    tipo: 'SUPER_ADMIN',
    empresaId: null,
    versaoAutorizacao: 7,
    perfis: ['super_administrador'],
    permissoes: [],
  };
}

function usuarioAdminEmpresa(): UsuarioToken {
  return {
    id: 'usuario-admin',
    email: 'admin@sistema.com',
    tipo: 'ADMIN_EMPRESA',
    empresaId: 'empresa-1',
    versaoAutorizacao: 3,
    perfis: ['administrador_empresa'],
    permissoes: ['usuarios.editar'],
  };
}

describe('Reset manual administrativo — pipeline real (e2e)', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;
  let usuarioNoBanco: UsuarioNoBanco;
  let saidasDeLog: string[];

  const credencial = {
    usuarioId: ID_RESET,
    email: 'alvo@sistema.com',
    senhaTemporaria: SENHA_TEMPORARIA,
    versaoAutorizacao: 1,
  };

  const registrarLog = (...args: unknown[]) => {
    saidasDeLog.push(args.map((valor) => String(valor)).join(' '));
  };

  const autenticar = (usuario: UsuarioToken): string => {
    usuarioNoBanco = { ...usuario };
    return jwt.sign({
      id: usuario.id,
      email: usuario.email,
      tipo: usuario.tipo,
      empresaId: usuario.empresaId,
      versaoAutorizacao: usuario.versaoAutorizacao,
      perfis: usuario.perfis ?? [],
      permissoes: usuario.permissoes ?? [],
    });
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({
          secret: SEGREDO_JWT,
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [UsuariosController],
      providers: [
        Reflector,
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        PermissionsGuard,
        IpUtil,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
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
          provide: AuditoriaService,
          useValue: auditoriaServiceMock,
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: AuditoriaInterceptor,
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: RespostaInterceptor,
        },
        {
          provide: APP_FILTER,
          useClass: HttpExceptionFilter,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    jwt = moduleFixture.get(JwtService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    saidasDeLog = [];
    usuarioNoBanco = usuarioSuperAdmin();
    prismaMock.usuario.findUnique.mockImplementation(() =>
      Promise.resolve({
        ativo: usuarioNoBanco.ativo ?? true,
        trocaSenhaObrigatoria: usuarioNoBanco.trocaSenhaObrigatoria ?? false,
        emailVerificado: true,
        versaoAutorizacao: usuarioNoBanco.versaoAutorizacao,
        tipo: usuarioNoBanco.tipo,
        empresaId: usuarioNoBanco.empresaId,
      }),
    );
    usuariosServiceMock.resetarSenhaAdministrativaManual.mockResolvedValue(
      credencial,
    );

    jest.spyOn(console, 'log').mockImplementation(registrarLog);
    jest.spyOn(console, 'warn').mockImplementation(registrarLog);
    jest.spyOn(console, 'error').mockImplementation(registrarLog);
    for (const metodo of [
      'log',
      'warn',
      'error',
      'debug',
      'verbose',
    ] as const) {
      jest.spyOn(Logger.prototype, metodo).mockImplementation(registrarLog);
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  const postarReset = (
    caminho = `/usuarios/${ID_RESET}/redefinir-senha-manual`,
    corpo: object | null = { versaoAutorizacao: 0 },
  ) => {
    const requisicao = request(app.getHttpServer()).post(caminho);
    return corpo === null ? requisicao : requisicao.send(corpo);
  };

  it('retorna 401 no envelope global sem autenticação', async () => {
    const resposta = await postarReset().expect(401);

    expect(resposta.body).toEqual(
      expect.objectContaining({
        success: false,
        statusCode: 401,
        path: `/usuarios/${ID_RESET}/redefinir-senha-manual`,
      }),
    );
    expect(resposta.body).not.toHaveProperty('data');
    expect(
      usuariosServiceMock.resetarSenhaAdministrativaManual,
    ).not.toHaveBeenCalled();
  });

  it('retorna 401 para token assinado com outro segredo', async () => {
    const tokenForjado = new JwtService({ secret: 'outro-segredo' }).sign({
      ...usuarioSuperAdmin(),
    });

    await postarReset()
      .set('Authorization', `Bearer ${tokenForjado}`)
      .expect(401);

    expect(
      usuariosServiceMock.resetarSenhaAdministrativaManual,
    ).not.toHaveBeenCalled();
  });

  it('retorna 401 para token válido de usuário com e-mail não verificado', async () => {
    const token = autenticar(usuarioSuperAdmin());
    prismaMock.usuario.findUnique.mockImplementationOnce(() =>
      Promise.resolve({
        ativo: true,
        trocaSenhaObrigatoria: false,
        emailVerificado: false,
        versaoAutorizacao: usuarioNoBanco.versaoAutorizacao,
        tipo: usuarioNoBanco.tipo,
        empresaId: usuarioNoBanco.empresaId,
      }),
    );

    const resposta = await postarReset()
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    expect(resposta.body).toEqual(
      expect.objectContaining({ success: false, statusCode: 401 }),
    );
    expect(
      usuariosServiceMock.resetarSenhaAdministrativaManual,
    ).not.toHaveBeenCalled();
  });

  it('retorna 401 quando o token não possui versaoAutorizacao válida', async () => {
    const tokenSemVersao = jwt.sign({
      id: 'usuario-super',
      email: 'super@sistema.com',
      tipo: 'SUPER_ADMIN',
      empresaId: null,
    });

    await postarReset()
      .set('Authorization', `Bearer ${tokenSemVersao}`)
      .expect(401);

    expect(prismaMock.usuario.findUnique).not.toHaveBeenCalled();
  });

  it('retorna 401 quando a versão de autorização divergiu no banco', async () => {
    const token = autenticar(usuarioSuperAdmin());
    usuarioNoBanco = { ...usuarioSuperAdmin(), versaoAutorizacao: 99 };

    await postarReset().set('Authorization', `Bearer ${token}`).expect(401);

    expect(prismaMock.usuario.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'usuario-super' } }),
    );
    expect(
      usuariosServiceMock.resetarSenhaAdministrativaManual,
    ).not.toHaveBeenCalled();
  });

  it('retorna 401 quando o usuário autenticado está inativo', async () => {
    const token = autenticar(usuarioSuperAdmin());
    usuarioNoBanco = { ...usuarioSuperAdmin(), ativo: false };

    await postarReset().set('Authorization', `Bearer ${token}`).expect(401);
  });

  it('retorna 403 para ADMIN_EMPRESA mesmo com usuarios.editar', async () => {
    const token = autenticar(usuarioAdminEmpresa());

    const resposta = await postarReset()
      .set('Authorization', `Bearer ${token}`)
      .set('x-sge-validated-ip', IP_VALIDADO)
      .expect(403);

    expect(resposta.body).toEqual(
      expect.objectContaining({ success: false, statusCode: 403 }),
    );
    expect(
      usuariosServiceMock.resetarSenhaAdministrativaManual,
    ).not.toHaveBeenCalled();
  });

  it('retorna 400 para UUID inválido antes de chamar o service', async () => {
    const token = autenticar(usuarioSuperAdmin());

    const resposta = await postarReset(
      '/usuarios/identificador-invalido/redefinir-senha-manual',
    )
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    expect(resposta.body).toEqual(
      expect.objectContaining({ success: false, statusCode: 400 }),
    );
    expect(
      usuariosServiceMock.resetarSenhaAdministrativaManual,
    ).not.toHaveBeenCalled();
  });

  it('responde 201 com envelope real e Cache-Control no-store para SUPER_ADMIN', async () => {
    const usuario = usuarioSuperAdmin();
    const token = autenticar(usuario);

    const resposta = await postarReset(undefined, { versaoAutorizacao: 7 })
      .set('Authorization', `Bearer ${token}`)
      .set('x-sge-validated-ip', IP_VALIDADO)
      .expect(201);

    expect(resposta.headers['cache-control']).toBe('no-store');
    expect(resposta.headers['content-type']).toContain('application/json');
    expect(resposta.body).toEqual({ success: true, data: credencial });
    expect(
      (resposta.body as { data: { versaoAutorizacao: number } }).data
        .versaoAutorizacao,
    ).toBe(1);
    expect(
      usuariosServiceMock.resetarSenhaAdministrativaManual,
    ).toHaveBeenCalledWith(
      ID_RESET,
      expect.objectContaining({
        id: 'usuario-super',
        tipo: 'SUPER_ADMIN',
        versaoAutorizacao: 7,
      }),
      7,
      IP_VALIDADO,
    );
  });

  it('retorna 400 quando o corpo da requisição está ausente', async () => {
    const token = autenticar(usuarioSuperAdmin());

    const resposta = await postarReset(undefined, null)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    expect(resposta.body).toEqual(
      expect.objectContaining({ success: false, statusCode: 400 }),
    );
    expect(
      usuariosServiceMock.resetarSenhaAdministrativaManual,
    ).not.toHaveBeenCalled();
  });

  it('retorna 400 para versão em string sem conversão implícita', async () => {
    const token = autenticar(usuarioSuperAdmin());

    const resposta = await postarReset(undefined, {
      versaoAutorizacao: '3',
    })
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    expect(resposta.body).toEqual(
      expect.objectContaining({ success: false, statusCode: 400 }),
    );
    expect(
      usuariosServiceMock.resetarSenhaAdministrativaManual,
    ).not.toHaveBeenCalled();
  });

  it('retorna 400 para campo extra no corpo', async () => {
    const token = autenticar(usuarioSuperAdmin());

    await postarReset(undefined, {
      versaoAutorizacao: 0,
      campoExtra: true,
    })
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    expect(
      usuariosServiceMock.resetarSenhaAdministrativaManual,
    ).not.toHaveBeenCalled();
  });

  it('retorna 409 RESET_CONCORRENTE sem data, senha ou versão atual', async () => {
    const token = autenticar(usuarioSuperAdmin());
    usuariosServiceMock.resetarSenhaAdministrativaManual.mockRejectedValue(
      new ConflictException({
        error: 'RESET_CONCORRENTE',
        message:
          'O usuário foi alterado por outra operação. Recarregue os dados e confirme novamente.',
      }),
    );

    const resposta = await postarReset(undefined, { versaoAutorizacao: 5 })
      .set('Authorization', `Bearer ${token}`)
      .set('x-sge-validated-ip', IP_VALIDADO)
      .expect(409);

    expect(resposta.body).toEqual(
      expect.objectContaining({
        success: false,
        statusCode: 409,
        error: 'RESET_CONCORRENTE',
      }),
    );
    expect(String((resposta.body as { message?: unknown }).message)).toContain(
      'Recarregue',
    );
    expect(resposta.body).not.toHaveProperty('data');
    expect(resposta.body).not.toHaveProperty('senhaTemporaria');
    expect(resposta.body).not.toHaveProperty('versaoAutorizacao');
    expect(JSON.stringify(resposta.body)).not.toContain(SENHA_TEMPORARIA);
    expect(
      usuariosServiceMock.resetarSenhaAdministrativaManual,
    ).toHaveBeenCalledWith(
      ID_RESET,
      expect.objectContaining({ id: 'usuario-super' }),
      5,
      IP_VALIDADO,
    );
  });

  it('retorna 503 sem RESET_CONCORRENTE quando o retry esgota', async () => {
    const token = autenticar(usuarioSuperAdmin());
    usuariosServiceMock.resetarSenhaAdministrativaManual.mockRejectedValue(
      new ServiceUnavailableException(
        'Serviço temporariamente indisponível por concorrência. Tente novamente.',
      ),
    );

    const resposta = await postarReset()
      .set('Authorization', `Bearer ${token}`)
      .set('x-sge-validated-ip', IP_VALIDADO)
      .expect(503);

    expect(resposta.body).toEqual(
      expect.objectContaining({
        success: false,
        statusCode: 503,
        error: 'Service Unavailable',
      }),
    );
    expect(resposta.body).not.toHaveProperty('data');
    expect(resposta.body).not.toHaveProperty('senhaTemporaria');
    expect(JSON.stringify(resposta.body)).not.toContain(SENHA_TEMPORARIA);
    expect(String((resposta.body as { error?: unknown }).error)).not.toBe(
      'RESET_CONCORRENTE',
    );
  });

  it('encaminha IP ausente ou inválido como undefined', async () => {
    const token = autenticar(usuarioSuperAdmin());

    await postarReset()
      .set('Authorization', `Bearer ${token}`)
      .set('x-sge-validated-ip', '203.0.113.10, 198.51.100.1')
      .expect(201);

    expect(
      usuariosServiceMock.resetarSenhaAdministrativaManual,
    ).toHaveBeenCalledWith(ID_RESET, expect.anything(), 0, undefined);
  });

  it('retorna 403 TROCA_SENHA_OBRIGATORIA quando o fluxo real exige troca', async () => {
    const token = autenticar(usuarioSuperAdmin());
    usuarioNoBanco = { ...usuarioSuperAdmin(), trocaSenhaObrigatoria: true };

    const resposta = await postarReset()
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(resposta.body).toEqual(
      expect.objectContaining({
        success: false,
        statusCode: 403,
        error: 'TROCA_SENHA_OBRIGATORIA',
      }),
    );
    expect(
      usuariosServiceMock.resetarSenhaAdministrativaManual,
    ).not.toHaveBeenCalled();
  });

  it('não expõe a senha temporária em erros, auditoria ou logs', async () => {
    expect(auditoriaServiceMock.registrar).not.toHaveBeenCalled();

    const semToken = await postarReset().expect(401);
    const tokenAdmin = autenticar(usuarioAdminEmpresa());
    const comoAdmin = await postarReset()
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(403);
    const tokenSuper = autenticar(usuarioSuperAdmin());
    const autorizado = await postarReset()
      .set('Authorization', `Bearer ${tokenSuper}`)
      .set('x-sge-validated-ip', IP_VALIDADO)
      .expect(201);

    expect(auditoriaServiceMock.registrar).not.toHaveBeenCalled();

    const respostasNaoAutorizadas = JSON.stringify([
      semToken.body,
      comoAdmin.body,
    ]);
    expect(respostasNaoAutorizadas).not.toContain(SENHA_TEMPORARIA);

    expect(JSON.stringify(autorizado.body)).toContain(SENHA_TEMPORARIA);

    const logs = saidasDeLog.join('\n');
    expect(logs).not.toContain(SENHA_TEMPORARIA);
    expect(logs).not.toContain('SenhaTemp#');
  });
});
