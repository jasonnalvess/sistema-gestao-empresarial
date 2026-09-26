import {
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'http';
import { PerfisModule } from './perfis.module';
import { PerfisService } from './perfis.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

const empresaId = '11111111-1111-4111-8111-111111111111';
const outra = '22222222-2222-4222-8222-222222222222';
const id = '33333333-3333-4333-8333-333333333333';
const rotas = [
  {
    metodo: 'post',
    rota: '/perfis',
    permissao: 'perfis.criar',
    body: { nome: 'Nome', chave: 'nome' },
    status: 201,
  },
  {
    metodo: 'patch',
    rota: `/perfis/${id}`,
    permissao: 'perfis.editar',
    body: { nome: 'Novo' },
    status: 200,
  },
  {
    metodo: 'patch',
    rota: `/perfis/${id}/ativar`,
    permissao: 'perfis.ativar',
    body: {},
    status: 200,
  },
  {
    metodo: 'patch',
    rota: `/perfis/${id}/inativar`,
    permissao: 'perfis.inativar',
    body: {},
    status: 200,
  },
  {
    metodo: 'put',
    rota: `/perfis/${id}/permissoes`,
    permissao: 'perfis.permissoes.gerenciar',
    body: { permissoes: [] },
    status: 200,
  },
] as const;

describe('Perfis escritas HTTP: guards reais e DTOs', () => {
  let app: INestApplication;
  let server: Server;
  let ator: AuthenticatedUser;
  const service = {
    criar: jest.fn(),
    editar: jest.fn(),
    alterarAtivo: jest.fn(),
    configurarPermissoes: jest.fn(),
  };
  const empresa = { findUnique: jest.fn() };
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [PerfisModule] })
      .overrideProvider(PerfisService)
      .useValue(service)
      .overrideProvider(PrismaService)
      .useValue({ empresa })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(ctx: ExecutionContext) {
          ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>().user =
            ator;
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    server = app.getHttpServer() as Server;
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.resetAllMocks();
    ator = {
      id,
      email: 'a@example.invalid',
      tipo: 'ADMIN_EMPRESA',
      empresaId,
      versaoAutorizacao: 0,
      permissoes: rotas.map((r) => r.permissao),
    };
    empresa.findUnique.mockResolvedValue({ id: empresaId, ativa: true });
  });
  it.each(rotas)(
    '$metodo $rota exige sua permissão, não perfis.visualizar',
    async (r) => {
      for (const tipo of ['SUPER_ADMIN', 'ADMIN_EMPRESA']) {
        ator.tipo = tipo;
        ator.permissoes = [r.permissao];
        await request(server)
          [r.metodo](r.rota)
          .set('X-Empresa-Id', empresaId)
          .send(r.body)
          .expect(r.status);
      }
      ator.permissoes = ['perfis.visualizar'];
      await request(server)
        [r.metodo](r.rota)
        .set('X-Empresa-Id', empresaId)
        .send(r.body)
        .expect(403);
    },
  );
  it.each(rotas)(
    '$metodo $rota bloqueia usuário comum e contexto inválido',
    async (r) => {
      ator.tipo = 'USUARIO_EMPRESA';
      await request(server)[r.metodo](r.rota).send(r.body).expect(403);
      ator.tipo = 'SUPER_ADMIN';
      ator.empresaId = null;
      await request(server)[r.metodo](r.rota).send(r.body).expect(400);
      ator.tipo = 'ADMIN_EMPRESA';
      ator.empresaId = empresaId;
      await request(server)
        [r.metodo](r.rota)
        .set('X-Empresa-Id', outra)
        .send(r.body)
        .expect(403);
    },
  );
  it('normaliza criação e passa exclusivamente contexto resolvido', async () => {
    await request(server)
      .post('/perfis')
      .send({ nome: '  Vendas  ', chave: ' VENDAS_1 ', descricao: 'Equipe' })
      .expect(201);
    expect(service.criar).toHaveBeenCalledWith(empresaId, ator, {
      nome: 'Vendas',
      chave: 'vendas_1',
      descricao: 'Equipe',
    });
  });
  it.each(['empresaId', 'escopo', 'sistema', 'ativo'])(
    'POST rejeita atributo estrutural %s',
    async (campo) => {
      await request(server)
        .post('/perfis')
        .send({ nome: 'A', chave: 'a', [campo]: 'injetado' })
        .expect(400);
      expect(service.criar).not.toHaveBeenCalled();
    },
  );
  it.each(['chave', 'empresaId', 'escopo', 'sistema', 'ativo'])(
    'PATCH rejeita %s',
    async (campo) => {
      await request(server)
        .patch(`/perfis/${id}`)
        .send({ nome: 'A', [campo]: 'injetado' })
        .expect(400);
      expect(service.editar).not.toHaveBeenCalled();
    },
  );
  it.each([
    {},
    { nome: '', chave: 'a' },
    { nome: '  ', chave: 'a' },
    { nome: null, chave: 'a' },
    { nome: 'A', chave: '' },
    { nome: 'A', chave: 'a-b' },
    { nome: 'A', chave: '1abc' },
    { nome: 'A'.repeat(121), chave: 'a' },
    { nome: 'A', chave: 'a'.repeat(81) },
    { nome: 'A', chave: 'a', descricao: 'x'.repeat(1001) },
  ])('POST rejeita dados inválidos %j', async (dados) => {
    await request(server).post('/perfis').send(dados).expect(400);
  });
  it('PATCH aceita descrição null e rejeita nome null', async () => {
    await request(server)
      .patch(`/perfis/${id}`)
      .send({ descricao: null })
      .expect(200);
    expect(service.editar).toHaveBeenCalledWith(empresaId, ator, id, {
      descricao: null,
    });
    await request(server)
      .patch(`/perfis/${id}`)
      .send({ nome: null })
      .expect(400);
  });
  it.each([
    {},
    { permissoes: null },
    { permissoes: {} },
    { permissoes: [null] },
    { permissoes: [{ permissaoId: 'invalido', permitido: true }] },
    { permissoes: [{ permissaoId: id, permitido: 'false' }] },
    { permissoes: [{ permissaoId: id, permitido: true, chave: 'extra' }] },
    {
      permissoes: [
        { permissaoId: id, permitido: true },
        { permissaoId: id, permitido: false },
      ],
    },
  ])('PUT rejeita configuração inválida %j', async (dados) => {
    await request(server)
      .put(`/perfis/${id}/permissoes`)
      .send(dados)
      .expect(400);
    expect(service.configurarPermissoes).not.toHaveBeenCalled();
  });
  it.each([true, false])('PUT preserva boolean real %s', async (permitido) => {
    const dados = { permissoes: [{ permissaoId: id, permitido }] };
    await request(server)
      .put(`/perfis/${id}/permissoes`)
      .send(dados)
      .expect(200);
    expect(service.configurarPermissoes).toHaveBeenCalledWith(
      empresaId,
      ator,
      id,
      dados,
    );
  });
  it('UUID inválido retorna 400', async () => {
    await request(server)
      .patch('/perfis/invalido')
      .send({ nome: 'Novo' })
      .expect(400);
  });
  it.each([
    { descricao: '  Equipe  ', esperado: 'Equipe' },
    { descricao: '   ', esperado: '' },
  ])('DTOs aplicam trim na descrição %j', async ({ descricao, esperado }) => {
    await request(server)
      .post('/perfis')
      .send({ nome: 'A', chave: 'a', descricao })
      .expect(201);
    expect(service.criar).toHaveBeenCalledWith(
      empresaId,
      ator,
      expect.objectContaining({ descricao: esperado }),
    );
    await request(server)
      .patch(`/perfis/${id}`)
      .send({ descricao })
      .expect(200);
    expect(service.editar).toHaveBeenCalledWith(
      empresaId,
      ator,
      id,
      expect.objectContaining({ descricao: esperado }),
    );
  });

  it('POST mantém rejeição de descrição null e PATCH preserva ausência', async () => {
    await request(server)
      .post('/perfis')
      .send({ nome: 'A', chave: 'a', descricao: null })
      .expect(400);
    expect(service.criar).not.toHaveBeenCalled();
    await request(server)
      .patch(`/perfis/${id}`)
      .send({ nome: 'Novo' })
      .expect(200);
    expect(service.editar).toHaveBeenCalledWith(empresaId, ator, id, {
      nome: 'Novo',
    });
  });
});
