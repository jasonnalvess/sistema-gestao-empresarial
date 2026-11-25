import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AuthController } from '../src/auth/auth.controller';
import {
  AuthService,
  CODIGO_EMAIL_NAO_VERIFICADO,
} from '../src/auth/auth.service';
import { RecoveryService } from '../src/auth/recovery.service';
import { TrocaSenhaService } from '../src/auth/troca-senha.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { RespostaInterceptor } from '../src/common/interceptors/resposta.interceptor';
import { RateLimitService } from '../src/common/services/rate-limit.service';
import { UsuariosService } from '../src/usuarios/usuarios.service';

/**
 * V3.6.5 / E4 — bloqueio de login por e-mail não confirmado, no contrato HTTP.
 *
 * Usa o `AuthController` e o `AuthService` reais; apenas a persistência
 * (`UsuariosService`) e a emissão do JWT (`JwtService`) são substituídas. O
 * `bcrypt.compare` é real: a senha do fixture é um hash verdadeiro. O objetivo
 * é provar, sobre a cadeia HTTP do NestJS (ValidationPipe de `main.ts` e
 * filtro/interceptor globais de `AppModule`), que:
 *  - conta verificada recebe 201 com token;
 *  - conta não verificada recebe 403 e NENHUM token;
 *  - usuário legado (default `true` da migration) continua entrando;
 *  - senha errada mantém a resposta genérica, sem revelar o estado da conta.
 */
const ROTA_LOGIN = '/auth/login';
const EMAIL = 'teste@sistema.com';
const SENHA = 'senha-correta';

const usuariosServiceMock = {
  buscarPorEmailComAutorizacao: jest.fn(),
};

const jwtServiceMock = {
  signAsync: jest.fn(),
};

const recuperacaoMock = {
  solicitarRecuperacao: jest.fn(),
  redefinirSenha: jest.fn(),
};

const rateLimitMock = {
  checkLimit: jest.fn(),
};

describe('Login bloqueado por e-mail não verificado (e2e)', () => {
  let app: INestApplication<App>;
  let senhaHash: string;

  /** Linha no formato de `buscarPorEmailComAutorizacao`. */
  const usuario = (emailVerificado: boolean) => ({
    id: 'usuario-1',
    nome: 'Usuário Teste',
    email: EMAIL,
    senha: senhaHash,
    tipo: 'ADMIN_EMPRESA',
    ativo: true,
    emailVerificado,
    trocaSenhaObrigatoria: false,
    versaoAutorizacao: 0,
    empresaId: 'empresa-1',
    perfis: [
      {
        perfil: {
          id: 'perfil-1',
          nome: 'Administrador',
          chave: 'administrador_empresa',
          escopo: 'EMPRESA',
          empresaId: 'empresa-1',
          permissoes: [{ permissao: { chave: 'usuarios.visualizar' } }],
        },
      },
    ],
  });

  beforeAll(async () => {
    // Hash real (custo baixo apenas para o teste) consumido pelo AuthService.
    senhaHash = await bcrypt.hash(SENHA, 4);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        {
          provide: UsuariosService,
          useValue: usuariosServiceMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
        {
          provide: TrocaSenhaService,
          useValue: { trocar: jest.fn() },
        },
        {
          provide: RecoveryService,
          useValue: recuperacaoMock,
        },
        {
          provide: RateLimitService,
          useValue: rateLimitMock,
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

    // Mesma configuração de `src/main.ts`.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jwtServiceMock.signAsync.mockResolvedValue('token-jwt');
  });

  afterAll(async () => {
    await app.close();
  });

  const postarLogin = (corpo: object) =>
    request(app.getHttpServer()).post(ROTA_LOGIN).send(corpo);

  it('autentica usuário verificado com 201 e token', async () => {
    usuariosServiceMock.buscarPorEmailComAutorizacao.mockResolvedValue(
      usuario(true),
    );

    const resposta = await postarLogin({ email: EMAIL, senha: SENHA });

    expect(resposta.status).toBe(201);

    const corpo = resposta.body as {
      success: boolean;
      data: { access_token: string; usuario: Record<string, unknown> };
    };
    expect(corpo.success).toBe(true);
    expect(corpo.data.access_token).toBe('token-jwt');
    expect(corpo.data.usuario).toEqual(
      expect.objectContaining({
        id: 'usuario-1',
        email: EMAIL,
        empresaId: 'empresa-1',
      }),
    );
    expect(jwtServiceMock.signAsync).toHaveBeenCalledTimes(1);

    // O formato do JWT não muda nesta etapa: `emailVerificado` fica fora do
    // payload e a autoridade continua sendo o banco na `JwtStrategy`.
    expect(jwtServiceMock.signAsync).toHaveBeenCalledWith({
      trocaSenhaObrigatoria: false,
      versaoAutorizacao: 0,
      id: 'usuario-1',
      email: EMAIL,
      tipo: 'ADMIN_EMPRESA',
      empresaId: 'empresa-1',
      perfis: ['administrador_empresa'],
      permissoes: ['usuarios.visualizar'],
    });
  });

  it('bloqueia usuário não verificado com 403 e sem token', async () => {
    usuariosServiceMock.buscarPorEmailComAutorizacao.mockResolvedValue(
      usuario(false),
    );

    const resposta = await postarLogin({ email: EMAIL, senha: SENHA });

    expect(resposta.status).toBe(403);
    expect(resposta.status).not.toBe(500);
    expect(resposta.body).toEqual(
      expect.objectContaining({
        success: false,
        statusCode: 403,
        error: CODIGO_EMAIL_NAO_VERIFICADO,
        message: 'Confirme seu e-mail antes de acessar o sistema.',
        path: ROTA_LOGIN,
      }),
    );

    expect(resposta.body).not.toHaveProperty('data');
    expect(JSON.stringify(resposta.body)).not.toContain('token-jwt');
    expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
  });

  it('mantém usuário legado autenticando (default true da migration)', async () => {
    usuariosServiceMock.buscarPorEmailComAutorizacao.mockResolvedValue(
      usuario(true),
    );

    await postarLogin({ email: EMAIL, senha: SENHA }).expect(201);

    expect(jwtServiceMock.signAsync).toHaveBeenCalledTimes(1);
  });

  it('não distingue conta verificada de não verificada quando a senha está errada', async () => {
    usuariosServiceMock.buscarPorEmailComAutorizacao.mockResolvedValueOnce(
      usuario(true),
    );
    const verificada = await postarLogin({
      email: EMAIL,
      senha: 'senha-errada',
    });

    usuariosServiceMock.buscarPorEmailComAutorizacao.mockResolvedValueOnce(
      usuario(false),
    );
    const naoVerificada = await postarLogin({
      email: EMAIL,
      senha: 'senha-errada',
    });

    expect(verificada.status).toBe(401);
    expect(naoVerificada.status).toBe(401);
    expect(naoVerificada.body).toEqual(
      expect.objectContaining({
        success: false,
        statusCode: 401,
        message: 'E-mail ou senha inválidos',
      }),
    );
    expect((naoVerificada.body as { message?: unknown }).message).toBe(
      (verificada.body as { message?: unknown }).message,
    );
    expect(JSON.stringify(naoVerificada.body)).not.toContain('verificado');
    expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
  });

  it('mantém 401 genérico para e-mail inexistente', async () => {
    usuariosServiceMock.buscarPorEmailComAutorizacao.mockResolvedValue(null);

    const resposta = await postarLogin({ email: EMAIL, senha: SENHA });

    expect(resposta.status).toBe(401);
    expect(resposta.body).toEqual(
      expect.objectContaining({
        message: 'E-mail ou senha inválidos',
      }),
    );
    expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
  });

  it('preserva a validação do DTO no login (400)', async () => {
    await postarLogin({ email: 'invalido', senha: SENHA }).expect(400);

    expect(
      usuariosServiceMock.buscarPorEmailComAutorizacao,
    ).not.toHaveBeenCalled();
  });
});
