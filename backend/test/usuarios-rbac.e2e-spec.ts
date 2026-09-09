import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../src/auth/guards/permissions.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import type { AuthenticatedUser } from '../src/auth/types/authenticated-user.type';
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
  };

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
});
