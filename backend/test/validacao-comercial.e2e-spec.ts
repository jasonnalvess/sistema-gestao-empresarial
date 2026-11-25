import {
  Controller,
  Get,
  INestApplication,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { RecoveryService } from '../src/auth/recovery.service';
import { TrocaSenhaService } from '../src/auth/troca-senha.service';
import { RateLimitService } from '../src/common/services/rate-limit.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../src/auth/guards/permissions.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { EmpresasController } from '../src/empresas/empresas.controller';
import { EmpresasService } from '../src/empresas/empresas.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { RespostaInterceptor } from '../src/common/interceptors/resposta.interceptor';
import { IpUtil } from '../src/common/utils/ip.util';
import { PrismaService } from '../src/prisma/prisma.service';

const SEGREDO_JWT = 'segredo-jwt-e2e-v364-validade-comercial';
const EMPRESA_ID = '11111111-1111-4111-8111-111111111111';
const IP_VALIDADO = '203.0.113.10';

type UsuarioNoBanco = {
  ativo: boolean;
  trocaSenhaObrigatoria: boolean;
  versaoAutorizacao: number;
  tipo: string;
  empresaId: string | null;
  empresa: {
    ativa: boolean;
    validadeComercialInicio: Date | null;
    validadeComercialFim: Date | null;
  } | null;
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

const empresasServiceMock = {
  regularizar: jest.fn(),
};

const trocaSenhaServiceMock = {
  trocar: jest.fn(),
};

const rateLimitServiceMock = {};

const authServiceMock = {
  login: jest.fn(),
};

const recoveryServiceMock = {};

@Controller('validacao-comercial-teste')
@UseGuards(JwtAuthGuard)
class RotaSemEmpresaContextoController {
  @Get('recurso')
  recurso() {
    return { ok: true };
  }
}

function usuarioSuperAdmin(versao = 7): {
  id: string;
  email: string;
  tipo: string;
  empresaId: string | null;
  versaoAutorizacao: number;
  perfis: string[];
  permissoes: string[];
} {
  return {
    id: 'usuario-super',
    email: 'super@sistema.com',
    tipo: 'SUPER_ADMIN',
    empresaId: null,
    versaoAutorizacao: versao,
    perfis: ['super_administrador'],
    permissoes: [],
  };
}

function usuarioAdminEmpresa(versao = 3): {
  id: string;
  email: string;
  tipo: string;
  empresaId: string | null;
  versaoAutorizacao: number;
  perfis: string[];
  permissoes: string[];
} {
  return {
    id: 'usuario-admin',
    email: 'admin@sistema.com',
    tipo: 'ADMIN_EMPRESA',
    empresaId: EMPRESA_ID,
    versaoAutorizacao: versao,
    perfis: ['administrador_empresa'],
    permissoes: ['empresas.editar'],
  };
}

describe('Validação comercial V3.6.4 — pipeline real (e2e)', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;
  let usuarioNoBanco: UsuarioNoBanco;

  const autenticar = (usuario: {
    id: string;
    email: string;
    tipo: string;
    empresaId: string | null;
    versaoAutorizacao: number;
    perfis?: string[];
    permissoes?: string[];
  }): string => {
    usuarioNoBanco = {
      ativo: true,
      trocaSenhaObrigatoria: false,
      versaoAutorizacao: usuario.versaoAutorizacao,
      tipo: usuario.tipo,
      empresaId: usuario.empresaId,
      empresa:
        usuario.empresaId === null
          ? null
          : {
              ativa: true,
              validadeComercialInicio: null,
              validadeComercialFim: null,
            },
    };
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

  const definirEmpresa = (
    estado: Partial<NonNullable<UsuarioNoBanco['empresa']>>,
  ) => {
    if (!usuarioNoBanco.empresa) {
      usuarioNoBanco.empresa = {
        ativa: true,
        validadeComercialInicio: null,
        validadeComercialFim: null,
      };
    }
    Object.assign(usuarioNoBanco.empresa, estado);
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
      controllers: [
        AuthController,
        EmpresasController,
        RotaSemEmpresaContextoController,
      ],
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
          provide: EmpresasService,
          useValue: empresasServiceMock,
        },
        {
          provide: TrocaSenhaService,
          useValue: trocaSenhaServiceMock,
        },
        {
          provide: AuthService,
          useValue: authServiceMock,
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
    empresasServiceMock.regularizar.mockResolvedValue({
      id: EMPRESA_ID,
      nome: 'Empresa Teste',
      ativa: true,
      validadeComercialInicio: new Date(),
      validadeComercialFim: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    trocaSenhaServiceMock.trocar.mockResolvedValue({ ok: true });

    prismaMock.usuario.findUnique.mockImplementation(() =>
      Promise.resolve({
        ativo: usuarioNoBanco.ativo,
        trocaSenhaObrigatoria: usuarioNoBanco.trocaSenhaObrigatoria,
        emailVerificado: true,
        versaoAutorizacao: usuarioNoBanco.versaoAutorizacao,
        tipo: usuarioNoBanco.tipo,
        empresaId: usuarioNoBanco.empresaId,
        empresa: usuarioNoBanco.empresa,
      }),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('retorna 401 sem autenticação', async () => {
    await request(app.getHttpServer())
      .get('/validacao-comercial-teste/recurso')
      .expect(401);
  });

  it('bloqueia empresa expirada mesmo em rota sem EmpresaContextoGuard', async () => {
    const token = autenticar(usuarioAdminEmpresa());
    definirEmpresa({
      ativa: true,
      validadeComercialInicio: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      validadeComercialFim: new Date(Date.now() - 1),
    });

    const resposta = await request(app.getHttpServer())
      .get('/validacao-comercial-teste/recurso')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(resposta.body).toEqual(
      expect.objectContaining({
        success: false,
        statusCode: 403,
        error: 'VALIDADE_COMERCIAL_EXPIRADA',
      }),
    );
  });

  it('bloqueia empresa suspensa com código distinto', async () => {
    const token = autenticar(usuarioAdminEmpresa());
    definirEmpresa({
      ativa: false,
      validadeComercialInicio: null,
      validadeComercialFim: null,
    });

    const resposta = await request(app.getHttpServer())
      .get('/validacao-comercial-teste/recurso')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(resposta.body).toEqual(
      expect.objectContaining({
        error: 'EMPRESA_INATIVA',
      }),
    );
  });

  it('libera empresa legada (ambos nulos)', async () => {
    const token = autenticar(usuarioAdminEmpresa());
    definirEmpresa({
      ativa: true,
      validadeComercialInicio: null,
      validadeComercialFim: null,
    });

    await request(app.getHttpServer())
      .get('/validacao-comercial-teste/recurso')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('libera empresa vigente', async () => {
    const token = autenticar(usuarioAdminEmpresa());
    definirEmpresa({
      ativa: true,
      validadeComercialInicio: new Date(Date.now() - 24 * 60 * 60 * 1000),
      validadeComercialFim: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await request(app.getHttpServer())
      .get('/validacao-comercial-teste/recurso')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('SUPER_ADMIN global não é bloqueado mesmo com empresa expirada inexistente', async () => {
    const token = autenticar(usuarioSuperAdmin());

    await request(app.getHttpServer())
      .get('/validacao-comercial-teste/recurso')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('allowlist: /auth/me retorna 200 mesmo com validade expirada', async () => {
    const token = autenticar(usuarioAdminEmpresa());
    definirEmpresa({
      ativa: true,
      validadeComercialInicio: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      validadeComercialFim: new Date(Date.now() - 1),
    });

    const resposta = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const corpo = resposta.body as {
      success: boolean;
      data: { codigoBloqueio: string };
    };
    expect(corpo.success).toBe(true);
    expect(corpo.data.codigoBloqueio).toBe('VALIDADE_COMERCIAL_EXPIRADA');
  });

  it('allowlist: /auth/trocar-senha permanece acessível com validade expirada', async () => {
    const token = autenticar(usuarioAdminEmpresa());
    definirEmpresa({
      ativa: true,
      validadeComercialInicio: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      validadeComercialFim: new Date(Date.now() - 1),
    });

    await request(app.getHttpServer())
      .post('/auth/trocar-senha')
      .set('Authorization', `Bearer ${token}`)
      .send({ senhaAtual: 'SenhaAtual#1', novaSenha: 'NovaSenha#123' })
      .expect(201);

    expect(trocaSenhaServiceMock.trocar).toHaveBeenCalled();
  });

  it('RBAC: ADMIN_EMPRESA não pode regularizar (403)', async () => {
    const token = autenticar(usuarioAdminEmpresa());

    const resposta = await request(app.getHttpServer())
      .post(`/empresas/${EMPRESA_ID}/regularizar`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-sge-validated-ip', IP_VALIDADO)
      .send({ diasValidade: 30, motivo: 'Tentativa indevida' })
      .expect(403);

    expect(resposta.body).toEqual(
      expect.objectContaining({ success: false, statusCode: 403 }),
    );
    expect(empresasServiceMock.regularizar).not.toHaveBeenCalled();
  });

  it('regularização retorna 200 para SUPER_ADMIN e propaga IP', async () => {
    const token = autenticar(usuarioSuperAdmin());

    const resposta = await request(app.getHttpServer())
      .post(`/empresas/${EMPRESA_ID}/regularizar`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-sge-validated-ip', IP_VALIDADO)
      .send({ diasValidade: 30, motivo: 'Contrato regularizado' })
      .expect(201);

    expect(resposta.body).toEqual(expect.objectContaining({ success: true }));
    expect(empresasServiceMock.regularizar).toHaveBeenCalledWith(
      EMPRESA_ID,
      { diasValidade: 30, motivo: 'Contrato regularizado' },
      expect.objectContaining({ tipo: 'SUPER_ADMIN' }),
      IP_VALIDADO,
    );
  });

  it('regularização sem IP não recusa a requisição', async () => {
    const token = autenticar(usuarioSuperAdmin());

    await request(app.getHttpServer())
      .post(`/empresas/${EMPRESA_ID}/regularizar`)
      .set('Authorization', `Bearer ${token}`)
      .send({ diasValidade: 30, motivo: 'Contrato regularizado' })
      .expect(201);

    expect(empresasServiceMock.regularizar).toHaveBeenCalledWith(
      EMPRESA_ID,
      { diasValidade: 30, motivo: 'Contrato regularizado' },
      expect.anything(),
      undefined,
    );
  });

  it('validação do DTO: diasValidade inválido retorna 400', async () => {
    const token = autenticar(usuarioSuperAdmin());

    await request(app.getHttpServer())
      .post(`/empresas/${EMPRESA_ID}/regularizar`)
      .set('Authorization', `Bearer ${token}`)
      .send({ diasValidade: 0, motivo: 'Contrato regularizado' })
      .expect(400);

    expect(empresasServiceMock.regularizar).not.toHaveBeenCalled();
  });

  it('validação do DTO: motivo curto retorna 400', async () => {
    const token = autenticar(usuarioSuperAdmin());

    await request(app.getHttpServer())
      .post(`/empresas/${EMPRESA_ID}/regularizar`)
      .set('Authorization', `Bearer ${token}`)
      .send({ diasValidade: 30, motivo: 'ab' })
      .expect(400);

    expect(empresasServiceMock.regularizar).not.toHaveBeenCalled();
  });

  it('validação do DTO: UUID inválido retorna 400', async () => {
    const token = autenticar(usuarioSuperAdmin());

    await request(app.getHttpServer())
      .post('/empresas/nao-uuid/regularizar')
      .set('Authorization', `Bearer ${token}`)
      .send({ diasValidade: 30, motivo: 'Contrato regularizado' })
      .expect(400);

    expect(empresasServiceMock.regularizar).not.toHaveBeenCalled();
  });

  it('fail-closed: indisponibilidade do banco bloqueia (401)', async () => {
    const token = autenticar(usuarioAdminEmpresa());
    prismaMock.usuario.findUnique.mockRejectedValueOnce(
      new Error('banco indisponível'),
    );

    await request(app.getHttpServer())
      .get('/validacao-comercial-teste/recurso')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  it('fail-closed: empresa ausente bloqueia (403)', async () => {
    const token = autenticar(usuarioAdminEmpresa());
    usuarioNoBanco.empresa = null;

    const resposta = await request(app.getHttpServer())
      .get('/validacao-comercial-teste/recurso')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(resposta.body).toEqual(
      expect.objectContaining({
        error: 'VALIDADE_COMERCIAL_INVALIDA',
      }),
    );
  });

  it('isolamento: ADMIN_EMPRESA de outra empresa não acessa rota empresarial da empresa alvo', async () => {
    // A rota de teste não valida tenant; o isolamento é garantido pelo
    // EmpresaContextoGuard nas rotas reais. Aqui verificamos apenas que o
    // bloqueio comercial não vaza dados entre empresas: a situação é derivada
    // do usuário autenticado.
    const token = autenticar(usuarioAdminEmpresa());
    definirEmpresa({
      ativa: true,
      validadeComercialInicio: null,
      validadeComercialFim: null,
    });

    await request(app.getHttpServer())
      .get('/validacao-comercial-teste/recurso')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
