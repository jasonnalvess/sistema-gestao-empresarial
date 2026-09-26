import {
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'http';
import { PerfisModule } from './perfis.module';
import { PermissoesModule } from '../permissoes/permissoes.module';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RespostaInterceptor } from '../common/interceptors/resposta.interceptor';

const empresaId = '11111111-1111-4111-8111-111111111111';
const outraEmpresa = '22222222-2222-4222-8222-222222222222';
const id = '33333333-3333-4333-8333-333333333333';
const perfil = {
  id,
  nome: 'Administrador',
  chave: 'admin',
  descricao: null,
  sistema: true,
  escopo: 'EMPRESA',
  ativo: false,
  empresaId,
};
const permissao = {
  id,
  chave: 'sistema.editar',
  nome: 'Sistema',
  descricao: null,
  modulo: 'sistema',
  ativo: false,
};

describe('API de consulta administrativa de perfis e permissões', () => {
  let app: INestApplication;
  let server: Server;
  let usuario: { tipo: string; empresaId: string | null; permissoes: string[] };
  const prisma = {
    empresa: { findUnique: jest.fn() },
    perfil: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn() },
    permissao: { findMany: jest.fn(), count: jest.fn() },
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [PerfisModule, PermissoesModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          context.switchToHttp().getRequest<{ user: typeof usuario }>().user =
            usuario;
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
    app.useGlobalInterceptors(new RespostaInterceptor());
    await app.init();
    server = app.getHttpServer() as Server;
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.resetAllMocks();
    usuario = {
      tipo: 'ADMIN_EMPRESA',
      empresaId,
      permissoes: ['perfis.visualizar'],
    };
    prisma.empresa.findUnique.mockResolvedValue({ id: empresaId, ativa: true });
    prisma.perfil.findMany.mockResolvedValue([perfil]);
    prisma.perfil.count.mockResolvedValue(1);
    prisma.perfil.findFirst.mockResolvedValue({
      ...perfil,
      permissoes: [{ permitido: false, permissao }],
    });
    prisma.permissao.findMany.mockResolvedValue([permissao]);
    prisma.permissao.count.mockResolvedValue(1);
  });

  it.each(['SUPER_ADMIN', 'ADMIN_EMPRESA'])(
    '%s autorizado consulta empresa e catálogo',
    async (tipo) => {
      usuario.tipo = tipo;
      await request(server)
        .get('/perfis')
        .set('X-Empresa-Id', empresaId)
        .expect(200);
      await request(server).get('/permissoes').expect(200);
    },
  );
  it.each(['SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA'])(
    '%s sem permissão é bloqueado',
    async (tipo) => {
      usuario.tipo = tipo;
      usuario.permissoes = [];
      for (const rota of [
        '/perfis',
        `/perfis/${id}`,
        '/perfis/globais',
        `/perfis/globais/${id}`,
        '/permissoes',
      ]) {
        await request(server)
          .get(rota)
          .set('X-Empresa-Id', empresaId)
          .expect(403);
      }
      expect(prisma.perfil.findMany).not.toHaveBeenCalled();
    },
  );
  it('usuário empresarial é bloqueado mesmo com permissão', async () => {
    usuario.tipo = 'USUARIO_EMPRESA';
    for (const rota of [
      '/perfis',
      `/perfis/${id}`,
      '/perfis/globais',
      `/perfis/globais/${id}`,
      '/permissoes',
    ]) {
      await request(server).get(rota).expect(403);
    }
  });
  it('SUPER_ADMIN precisa selecionar empresa', async () => {
    usuario.tipo = 'SUPER_ADMIN';
    usuario.empresaId = null;
    await request(server).get('/perfis').expect(400);
    await request(server).get(`/perfis/${id}`).expect(400);
  });
  it('administrador não pode trocar tenant por header', async () => {
    await request(server)
      .get('/perfis')
      .set('X-Empresa-Id', outraEmpresa)
      .expect(403);
    expect(prisma.perfil.findMany).not.toHaveBeenCalled();
  });
  it('lista e COUNT exigem simultaneamente empresa e escopo, preservando padrão inativo', async () => {
    const resposta = await request(server).get('/perfis').expect(200);
    expect(resposta.body).toEqual({
      success: true,
      data: [perfil],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });
    const where = {
      empresaId,
      escopo: 'EMPRESA',
      ativo: undefined,
      sistema: undefined,
    };
    expect(prisma.perfil.findMany).toHaveBeenCalledWith({
      where,
      select: {
        id: true,
        nome: true,
        chave: true,
        descricao: true,
        sistema: true,
        escopo: true,
        ativo: true,
        empresaId: true,
      },
      skip: 0,
      take: 10,
      orderBy: [{ nome: 'asc' }, { id: 'asc' }],
    });
    expect(prisma.perfil.count).toHaveBeenCalledWith({ where });
  });
  it.each(['inexistente', 'de outra empresa', 'global'])(
    'detalhe %s retorna 404 com consulta contextual',
    async () => {
      prisma.perfil.findFirst.mockResolvedValue(null);
      const resposta = await request(server).get(`/perfis/${id}`).expect(404);
      expect(resposta.body).toMatchObject({
        message: 'Perfil não encontrado.',
      });
      expect(prisma.perfil.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id, empresaId, escopo: 'EMPRESA' },
        }),
      );
    },
  );
  it('preserva permitido=false e permissão inativa sem expor usuários', async () => {
    const resposta = await request(server).get(`/perfis/${id}`).expect(200);
    expect(resposta.body).toEqual({
      success: true,
      data: { ...perfil, permissoes: [{ ...permissao, permitido: false }] },
    });
    expect(prisma.perfil.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        select: {
          id: true,
          nome: true,
          chave: true,
          descricao: true,
          sistema: true,
          escopo: true,
          ativo: true,
          empresaId: true,
          permissoes: {
            orderBy: { permissao: { chave: 'asc' } },
            select: {
              permitido: true,
              permissao: {
                select: {
                  id: true,
                  chave: true,
                  nome: true,
                  descricao: true,
                  modulo: true,
                  ativo: true,
                },
              },
            },
          },
        },
      }),
    );
  });
  it('ADMIN_EMPRESA não consulta globais', async () => {
    await request(server).get('/perfis/globais').expect(403);
    await request(server).get(`/perfis/globais/${id}`).expect(403);
  });
  it('globais têm rota estática, filtro estrito e não usam header', async () => {
    usuario.tipo = 'SUPER_ADMIN';
    usuario.empresaId = null;
    await request(server)
      .get('/perfis/globais')
      .set('X-Empresa-Id', 'ignorado')
      .expect(200);
    expect(prisma.perfil.count).toHaveBeenCalledWith({
      where: {
        empresaId: null,
        escopo: 'SISTEMA',
        ativo: undefined,
        sistema: undefined,
      },
    });
    await request(server).get(`/perfis/globais/${id}`).expect(200);
    expect(prisma.perfil.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id, empresaId: null, escopo: 'SISTEMA' },
      }),
    );
    expect(prisma.empresa.findUnique).not.toHaveBeenCalled();
  });
  it('global inexistente retorna 404', async () => {
    usuario.tipo = 'SUPER_ADMIN';
    prisma.perfil.findFirst.mockResolvedValue(null);
    await request(server).get(`/perfis/globais/${id}`).expect(404);
  });
  it('filtros false e busca preservam COUNT e paginação', async () => {
    await request(server)
      .get('/perfis?ativo=false&sistema=false&search=admin&page=2&limit=3')
      .expect(200);
    const where = {
      empresaId,
      escopo: 'EMPRESA',
      ativo: false,
      sistema: false,
      OR: [
        { nome: { contains: 'admin', mode: 'insensitive' } },
        { chave: { contains: 'admin', mode: 'insensitive' } },
      ],
    };
    expect(prisma.perfil.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where, skip: 3, take: 3 }),
    );
    expect(prisma.perfil.count).toHaveBeenCalledWith({ where });
  });
  it('catálogo retorna apenas metadados e não usa contexto nem filtra pelo JWT', async () => {
    const resposta = await request(server)
      .get('/permissoes?ativo=false&modulo=sistema&search=editar')
      .set('X-Empresa-Id', outraEmpresa)
      .expect(200);
    expect(resposta.body).toMatchObject({ data: [permissao] });
    const where = {
      ativo: false,
      modulo: 'sistema',
      OR: [
        { nome: { contains: 'editar', mode: 'insensitive' } },
        { chave: { contains: 'editar', mode: 'insensitive' } },
      ],
    };
    expect(prisma.permissao.findMany).toHaveBeenCalledWith({
      where,
      skip: 0,
      take: 10,
      orderBy: { chave: 'asc' },
      select: {
        id: true,
        chave: true,
        nome: true,
        descricao: true,
        modulo: true,
        ativo: true,
      },
    });
    expect(prisma.permissao.count).toHaveBeenCalledWith({ where });
    expect(prisma.empresa.findUnique).not.toHaveBeenCalled();
  });
  it.each([
    'page=0',
    'page=1.5',
    'limit=101',
    'limit=abc',
    'ativo=0',
    'ativo=',
    'empresaId=x',
    'escopo=SISTEMA',
    'search[a]=b',
  ])('rejeita filtro inválido %s', async (query) => {
    await request(server).get(`/perfis?${query}`).expect(400);
    await request(server).get(`/permissoes?${query}`).expect(400);
  });
  it('rejeita sistema inválido e UUID inválido', async () => {
    await request(server).get('/perfis?sistema=nao').expect(400);
    await request(server).get('/perfis/invalido').expect(400);
    usuario.tipo = 'SUPER_ADMIN';
    await request(server).get('/perfis/globais/invalido').expect(400);
  });
  it('empresa inexistente/inativa mantém respostas do guard', async () => {
    prisma.empresa.findUnique.mockResolvedValueOnce(null);
    await request(server).get('/perfis').expect(404);
    prisma.empresa.findUnique.mockResolvedValueOnce({
      id: empresaId,
      ativa: false,
    });
    await request(server).get('/perfis').expect(403);
  });
  it('falha de banco não é convertida em 404', async () => {
    prisma.perfil.findFirst.mockRejectedValueOnce(new Error('falha simulada'));
    await request(server).get(`/perfis/${id}`).expect(500);
  });
  it('executa todas as consultas sem delegates de escrita ou de usuário/revogação', async () => {
    usuario.tipo = 'SUPER_ADMIN';
    for (const rota of [
      '/perfis',
      `/perfis/${id}`,
      '/perfis/globais',
      `/perfis/globais/${id}`,
      '/permissoes',
    ]) {
      await request(server)
        .get(rota)
        .set('X-Empresa-Id', empresaId)
        .expect(200);
    }
    expect(Object.keys(prisma).sort()).toEqual([
      'empresa',
      'perfil',
      'permissao',
    ]);
  });
});
