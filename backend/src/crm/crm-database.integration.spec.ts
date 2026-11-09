import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import type { Server } from 'http';
import request from 'supertest';
import { AppModule } from '../app.module';
import {
  assertTestDatabase,
  CRM_DATABASE_TEST_PASSWORD,
  criarFixturesCrm,
  CrmDatabaseFixtures,
  limparFixturesCrm,
} from './testing/crm-database-fixtures';

const describeBanco =
  process.env.RUN_CRM_DATABASE_TESTS === 'true' ? describe : describe.skip;

type LoginResponse = {
  success: true;
  data: { access_token: string; usuario: { email: string } };
};
type PaginatedResponse = {
  success: boolean;
  data: unknown;
  meta: { total: number; page: number; limit: number; totalPages: number };
};
type ModulosResponse = { success: boolean; data: { modulos: unknown[] } };

describeBanco('CRM — homologação HTTP com PostgreSQL real', () => {
  const prisma = new PrismaClient();
  let app: INestApplication;
  let server: Server;
  let fixtures: CrmDatabaseFixtures | undefined;
  let tokenSuperAdmin: string;
  let tokenEmpresaA: string;
  let tokenEmpresaASemVisualizacao: string;

  async function loginAs(email: string) {
    const resposta = await request(server)
      .post('/auth/login')
      .send({ email, senha: CRM_DATABASE_TEST_PASSWORD })
      .expect(201);

    const body = resposta.body as unknown as LoginResponse;
    expect(body.success).toBe(true);
    expect(typeof body.data.access_token).toBe('string');
    expect(body.data.usuario.email).toBe(email);
    return body.data.access_token;
  }

  beforeAll(async () => {
    await assertTestDatabase(prisma);
    fixtures = await criarFixturesCrm(prisma);

    const modulo = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = modulo.createNestApplication();
    app.useLogger(false);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    server = app.getHttpServer() as Server;

    tokenSuperAdmin = await loginAs(fixtures.usuarios.superAdmin.email);
    tokenEmpresaA = await loginAs(
      fixtures.usuarios.empresaAComVisualizacao.email,
    );
    tokenEmpresaASemVisualizacao = await loginAs(
      fixtures.usuarios.empresaASemVisualizacao.email,
    );
  }, 30000);

  afterAll(async () => {
    try {
      if (app) await app.close();
    } finally {
      try {
        await limparFixturesCrm(prisma, fixtures);
      } finally {
        await prisma.$disconnect();
      }
    }
  }, 30000);

  it('sobe AppModule e responde por Supertest sem usar porta externa', async () => {
    await request(server)
      .get('/')
      .expect(200)
      .expect({ success: true, data: 'Hello World!' });
  });

  it('faz login real e devolve JWT no envelope global', async () => {
    const token = await loginAs(
      fixtures!.usuarios.empresaBComVisualizacao.email,
    );
    expect(token).toEqual(expect.any(String));
  });

  it('exige empresa selecionada para SUPER_ADMIN no CRM', async () => {
    const resposta = await request(server)
      .get('/crm/etapas')
      .auth(tokenSuperAdmin, { type: 'bearer' })
      .expect(400);

    const body = resposta.body as unknown as {
      success: boolean;
      statusCode: number;
      message: string;
      path: string;
      timestamp: unknown;
    };
    expect(body).toMatchObject({
      success: false,
      statusCode: 400,
      message: 'Selecione uma empresa para realizar esta operação.',
      path: '/crm/etapas',
    });
    expect(typeof body.timestamp).toBe('string');
  });

  it('permite CRM ativo da Empresa A pelo contexto real de SUPER_ADMIN', async () => {
    const resposta = await request(server)
      .get('/crm/etapas')
      .auth(tokenSuperAdmin, { type: 'bearer' })
      .set('x-empresa-id', fixtures!.empresaA)
      .expect(200);

    const body = resposta.body as unknown as {
      success: boolean;
      data: unknown;
    };
    expect(body).toMatchObject({ success: true });
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('bloqueia CRM inativo da Empresa B pelo ModuloAtivoGuard', async () => {
    const resposta = await request(server)
      .get('/crm/etapas')
      .auth(tokenSuperAdmin, { type: 'bearer' })
      .set('x-empresa-id', fixtures!.empresaB)
      .expect(403);

    expect(resposta.body).toMatchObject({
      success: false,
      statusCode: 403,
      message: 'Módulo não está ativo para esta empresa.',
    });
  });

  it('não expõe etapa da Empresa B para usuário da Empresa A', async () => {
    const resposta = await request(server)
      .get(`/crm/etapas/${fixtures!.etapaB}`)
      .auth(tokenEmpresaA, { type: 'bearer' })
      .expect(404);

    const body = resposta.body as Record<string, unknown>;
    expect(body).toMatchObject({
      success: false,
      statusCode: 404,
      error: 'Not Found',
      message: 'Etapa CRM não encontrada',
      path: `/crm/etapas/${fixtures!.etapaB}`,
    });
    expect(typeof body.timestamp).toBe('string');
    expect(body.data).toBeUndefined();
    expect(body.empresaId).toBeUndefined();
    expect(body.nome).toBeUndefined();
    expect(body.ordem).toBeUndefined();
    expect(body.tipo).toBeUndefined();
    expect(body.ativo).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain(fixtures!.empresaB);
    expect(JSON.stringify(body)).not.toContain(fixtures!.prefixo);
  });

  it('rejeita header de outra empresa para usuário empresarial', async () => {
    const resposta = await request(server)
      .get('/crm/etapas')
      .auth(tokenEmpresaA, { type: 'bearer' })
      .set('x-empresa-id', fixtures!.empresaB)
      .expect(403);

    expect(resposta.body).toMatchObject({
      success: false,
      statusCode: 403,
      message: 'Não é permitido acessar dados de outra empresa.',
    });
  });

  it('aplica PermissionsGuard para usuário sem crm.visualizar', async () => {
    const resposta = await request(server)
      .get('/crm/etapas')
      .auth(tokenEmpresaASemVisualizacao, { type: 'bearer' })
      .expect(403);

    expect(resposta.body).toMatchObject({
      success: false,
      statusCode: 403,
      message:
        'Usuário não possui as permissões necessárias para esta operação.',
    });
  });

  it('mantém envelope paginado de etapas sem aninhar data', async () => {
    const resposta = await request(server)
      .get('/crm/etapas?page=1&limit=10')
      .auth(tokenSuperAdmin, { type: 'bearer' })
      .set('x-empresa-id', fixtures!.empresaA)
      .expect(200);

    const body = resposta.body as unknown as PaginatedResponse;
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.meta.total).toBe('number');
    expect(typeof body.meta.page).toBe('number');
    expect(typeof body.meta.limit).toBe('number');
    expect(typeof body.meta.totalPages).toBe('number');
    expect((body.data as { data?: unknown }).data).toBeUndefined();
  });

  it('lista módulos ativos pelo mesmo contexto empresarial do SUPER_ADMIN', async () => {
    const resposta = await request(server)
      .get('/empresa-modulos/me')
      .auth(tokenSuperAdmin, { type: 'bearer' })
      .set('x-empresa-id', fixtures!.empresaA)
      .expect(200);

    const body = resposta.body as unknown as ModulosResponse;
    expect(body).toMatchObject({ success: true });
    expect(body.data.modulos).toEqual(
      expect.arrayContaining([expect.objectContaining({ chave: 'crm' })]),
    );
  });
});
