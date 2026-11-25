import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../src/auth/guards/permissions.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import type { AuthenticatedUser } from '../src/auth/types/authenticated-user.type';
import { RecoveryService } from '../src/auth/recovery.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { RespostaInterceptor } from '../src/common/interceptors/resposta.interceptor';
import { RateLimitService } from '../src/common/services/rate-limit.service';
import { IpUtil } from '../src/common/utils/ip.util';
import { UsuariosController } from '../src/usuarios/usuarios.controller';
import { UsuariosService } from '../src/usuarios/usuarios.service';

describe('UsuariosController RBAC (e2e)', () => {
  let app: INestApplication<App>;

  let usuarioAutenticado: AuthenticatedUser | undefined;

  const usuariosServiceMock = {
    criar: jest.fn().mockResolvedValue({
      id: 'usuario-criado',
      email: 'novo@sistema.com',
    }),
    listar: jest.fn().mockResolvedValue({
      itens: [],
      total: 0,
    }),
    buscarPorId: jest.fn(),
    atualizar: jest.fn(),
    ativar: jest.fn(),
    desativar: jest.fn(),
    resetarSenhaAdministrativaManual: jest.fn(),
  };

  const recoveryServiceMock = {
    solicitarRedefinicaoAdministrativa: jest.fn().mockResolvedValue(undefined),
  };

  const rateLimitServiceMock = {
    checkLimit: jest.fn().mockResolvedValue(undefined),
  };

  const IP_VALIDADO = '203.0.113.10';

  // Este guard substitui apenas a autenticação para isolar a matriz de RBAC.
  // O fluxo real de JWT (assinatura, estratégia e revalidação no banco) é
  // exercitado em usuarios-reset-manual.e2e-spec.ts.
  class JwtAuthGuardTeste implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      if (!usuarioAutenticado) {
        throw new UnauthorizedException('Token não informado ou inválido.');
      }

      const requestHttp = context
        .switchToHttp()
        .getRequest<Request & { user?: AuthenticatedUser }>();

      requestHttp.user = usuarioAutenticado;

      return true;
    }
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UsuariosController],
      providers: [
        Reflector,
        RolesGuard,
        PermissionsGuard,
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
        IpUtil,
        {
          provide: APP_INTERCEPTOR,
          useClass: RespostaInterceptor,
        },
        {
          provide: APP_FILTER,
          useClass: HttpExceptionFilter,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(JwtAuthGuardTeste)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    usuarioAutenticado = undefined;
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve retornar 401 quando não houver usuário autenticado', async () => {
    await request(app.getHttpServer()).get('/usuarios').expect(401);

    expect(usuariosServiceMock.listar).not.toHaveBeenCalled();
  });

  it('deve retornar 403 quando o tipo do usuário não for permitido', async () => {
    usuarioAutenticado = {
      id: 'usuario-1',
      email: 'colaborador@sistema.com',
      tipo: 'COLABORADOR',
      empresaId: 'empresa-1',
      perfis: ['colaborador'],
      permissoes: ['usuarios.visualizar'],
    };

    await request(app.getHttpServer()).get('/usuarios').expect(403);

    expect(usuariosServiceMock.listar).not.toHaveBeenCalled();
  });

  it('deve retornar 403 quando faltar a permissão exigida', async () => {
    usuarioAutenticado = {
      id: 'usuario-2',
      email: 'admin@sistema.com',
      tipo: 'ADMIN_EMPRESA',
      empresaId: 'empresa-1',
      perfis: ['administrador_empresa'],
      permissoes: [],
    };

    await request(app.getHttpServer()).get('/usuarios').expect(403);

    expect(usuariosServiceMock.listar).not.toHaveBeenCalled();
  });

  it('deve permitir listar quando papel e permissão estiverem corretos', async () => {
    usuarioAutenticado = {
      id: 'usuario-3',
      email: 'admin@sistema.com',
      tipo: 'ADMIN_EMPRESA',
      empresaId: 'empresa-1',
      perfis: ['administrador_empresa'],
      permissoes: ['usuarios.visualizar'],
    };

    await request(app.getHttpServer()).get('/usuarios').expect(200);

    expect(usuariosServiceMock.listar).toHaveBeenCalledTimes(1);
  });

  it('deve impedir criação sem usuarios.criar', async () => {
    usuarioAutenticado = {
      id: 'usuario-4',
      email: 'admin@sistema.com',
      tipo: 'ADMIN_EMPRESA',
      empresaId: 'empresa-1',
      perfis: ['administrador_empresa'],
      permissoes: ['usuarios.visualizar'],
    };

    await request(app.getHttpServer())
      .post('/usuarios')
      .send({
        nome: 'Novo Usuário',
        email: 'novo@sistema.com',
        senha: 'SenhaForte123!',
        tipo: 'COLABORADOR',
      })
      .expect(403);

    expect(usuariosServiceMock.criar).not.toHaveBeenCalled();
  });

  it('deve permitir criação com usuarios.criar', async () => {
    usuarioAutenticado = {
      id: 'usuario-5',
      email: 'admin@sistema.com',
      tipo: 'ADMIN_EMPRESA',
      empresaId: 'empresa-1',
      perfis: ['administrador_empresa'],
      permissoes: ['usuarios.criar'],
    };

    await request(app.getHttpServer())
      .post('/usuarios')
      .send({
        nome: 'Novo Usuário',
        email: 'novo@sistema.com',
        senha: 'SenhaForte123!',
        tipo: 'COLABORADOR',
      })
      .expect(201);

    expect(usuariosServiceMock.criar).toHaveBeenCalledTimes(1);
  });

  it('deve retornar 403 ao redefinir senha sem usuarios.editar', async () => {
    usuarioAutenticado = {
      id: 'usuario-6',
      email: 'admin@sistema.com',
      tipo: 'ADMIN_EMPRESA',
      empresaId: 'empresa-1',
      perfis: ['administrador_empresa'],
      permissoes: [],
    };

    await request(app.getHttpServer())
      .post('/usuarios/usuario-alvo/redefinir-senha')
      .expect(403);

    expect(
      recoveryServiceMock.solicitarRedefinicaoAdministrativa,
    ).not.toHaveBeenCalled();
  });

  it('deve permitir redefinição administrativa com usuarios.editar', async () => {
    usuarioAutenticado = {
      id: 'usuario-7',
      email: 'admin@sistema.com',
      tipo: 'ADMIN_EMPRESA',
      empresaId: 'empresa-1',
      perfis: ['administrador_empresa'],
      permissoes: ['usuarios.editar'],
    };

    await request(app.getHttpServer())
      .post('/usuarios/usuario-alvo/redefinir-senha')
      .set('x-sge-validated-ip', IP_VALIDADO)
      .expect(201)
      .expect({
        success: true,
        data: {
          message:
            'Se o endereço informado estiver cadastrado e puder receber recuperação, você receberá as instruções por e-mail.',
        },
      });

    expect(rateLimitServiceMock.checkLimit).toHaveBeenCalledWith(
      expect.anything(),
      'auth/redefinir-senha-admin',
    );
    expect(
      recoveryServiceMock.solicitarRedefinicaoAdministrativa,
    ).toHaveBeenCalledWith('usuario-alvo', 'usuario-7', IP_VALIDADO);
  });

  it.each([
    ['ausente', undefined],
    ['inválido', 'cliente-malicioso'],
    ['em lista', '203.0.113.10, 198.51.100.1'],
  ])(
    'deve retornar 403 na redefinição administrativa com IP validado %s',
    async (_caso, valor) => {
      usuarioAutenticado = {
        id: 'usuario-8',
        email: 'admin@sistema.com',
        tipo: 'ADMIN_EMPRESA',
        empresaId: 'empresa-1',
        perfis: ['administrador_empresa'],
        permissoes: ['usuarios.editar'],
      };

      const requisicao = request(app.getHttpServer())
        .post('/usuarios/usuario-alvo/redefinir-senha')
        .set('cf-connecting-ip', '198.51.100.40');

      if (valor !== undefined) {
        requisicao.set('x-sge-validated-ip', valor);
      }

      await requisicao.expect(403);

      expect(rateLimitServiceMock.checkLimit).not.toHaveBeenCalled();
      expect(
        recoveryServiceMock.solicitarRedefinicaoAdministrativa,
      ).not.toHaveBeenCalled();
    },
  );

  describe('reset manual administrativo', () => {
    const ID_RESET = 'b3f0846b-3f58-4e62-bd87-e01ad7ba114e';

    it('deve retornar 401 sem autenticação', async () => {
      await request(app.getHttpServer())
        .post(`/usuarios/${ID_RESET}/redefinir-senha-manual`)
        .send({ versaoAutorizacao: 0 })
        .expect(401);

      expect(
        usuariosServiceMock.resetarSenhaAdministrativaManual,
      ).not.toHaveBeenCalled();
    });

    it('deve bloquear ADMIN_EMPRESA mesmo com usuarios.editar', async () => {
      usuarioAutenticado = {
        id: 'usuario-9',
        email: 'admin@sistema.com',
        tipo: 'ADMIN_EMPRESA',
        empresaId: 'empresa-1',
        perfis: ['administrador_empresa'],
        permissoes: ['usuarios.editar'],
      };

      await request(app.getHttpServer())
        .post(`/usuarios/${ID_RESET}/redefinir-senha-manual`)
        .send({ versaoAutorizacao: 0 })
        .set('x-sge-validated-ip', IP_VALIDADO)
        .expect(403);

      expect(
        usuariosServiceMock.resetarSenhaAdministrativaManual,
      ).not.toHaveBeenCalled();
    });

    it('deve rejeitar identificador inválido antes do service', async () => {
      usuarioAutenticado = {
        id: 'usuario-10',
        email: 'super@sistema.com',
        tipo: 'SUPER_ADMIN',
        empresaId: null,
        perfis: ['super_administrador'],
        permissoes: [],
      };

      await request(app.getHttpServer())
        .post('/usuarios/identificador-invalido/redefinir-senha-manual')
        .send({ versaoAutorizacao: 0 })
        .set('x-sge-validated-ip', IP_VALIDADO)
        .expect(400);

      expect(
        usuariosServiceMock.resetarSenhaAdministrativaManual,
      ).not.toHaveBeenCalled();
    });

    it('deve permitir SUPER_ADMIN e responder com Cache-Control no-store', async () => {
      usuarioAutenticado = {
        id: 'usuario-11',
        email: 'super@sistema.com',
        tipo: 'SUPER_ADMIN',
        empresaId: null,
        perfis: ['super_administrador'],
        permissoes: [],
      };
      const credencial = {
        usuarioId: ID_RESET,
        email: 'alvo@sistema.com',
        senhaTemporaria: 'SenhaTemp#1234567',
        versaoAutorizacao: 4,
      };
      usuariosServiceMock.resetarSenhaAdministrativaManual.mockResolvedValue(
        credencial,
      );

      const resposta = await request(app.getHttpServer())
        .post(`/usuarios/${ID_RESET}/redefinir-senha-manual`)
        .send({ versaoAutorizacao: 3 })
        .set('x-sge-validated-ip', IP_VALIDADO)
        .expect(201);

      expect(resposta.headers['cache-control']).toBe('no-store');
      expect(resposta.body).toEqual({ success: true, data: credencial });
      expect(
        usuariosServiceMock.resetarSenhaAdministrativaManual,
      ).toHaveBeenCalledWith(
        ID_RESET,
        expect.objectContaining({ id: 'usuario-11', tipo: 'SUPER_ADMIN' }),
        3,
        IP_VALIDADO,
      );
    });
  });
});
