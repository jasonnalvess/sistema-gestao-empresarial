import { ConfigService } from '@nestjs/config';
import {
  Controller,
  Get,
  INestApplication,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import type { Server } from 'http';
import request from 'supertest';
import { AuthModule } from './auth.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { Permissoes } from './decorators/permissions.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { TrocaSenhaService } from './troca-senha.service';

@Controller('fixture-protegida')
class ProtegidaController {
  @Get()
  @UseGuards(JwtAuthGuard)
  simples() {
    return { ok: true };
  }
  @Get('permissao')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissoes('funcionarios.visualizar')
  permissao() {
    return { ok: true };
  }
}
const describeBanco =
  process.env.RUN_RH_DATABASE_TESTS === 'true' ? describe : describe.skip;
describeBanco('V3.4.5 — primeiro login com JWT e PostgreSQL reais', () => {
  const prisma = new PrismaClient();
  let app: INestApplication;
  let server: Server;
  let empresaId: string;
  let usuarioId: string;
  let email: string;
  let hash: string;
  const senha = 'Senha-fixture-123';
  beforeAll(async () => {
    const [db] = await prisma.$queryRaw<
      Array<{ nome: string }>
    >`SELECT current_database() AS nome`;
    if (db.nome !== 'sistema_gestao_teste')
      throw new Error('Banco de teste obrigatório.');
    const module = await Test.createTestingModule({
      imports: [AuthModule],
      controllers: [ProtegidaController],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(ConfigService)
      .useValue(new ConfigService({ JWT_SECRET: randomUUID() }))
      .compile();
    app = module.createNestApplication();
    app.useLogger(false);
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    server = app.getHttpServer() as Server;
    hash = await bcrypt.hash(senha, 10);
  });
  beforeEach(async () => {
    empresaId = (
      await prisma.empresa.create({
        data: { nome: 'Primeiro login fixture ' + randomUUID() },
      })
    ).id;
    email = randomUUID() + '@example.invalid';
    usuarioId = (
      await prisma.usuario.create({
        data: {
          empresaId,
          nome: 'Fixture',
          email,
          senha: hash,
          tipo: 'USUARIO_EMPRESA',
          trocaSenhaObrigatoria: true,
        },
      })
    ).id;
  });
  afterEach(async () => {
    if (!empresaId) return;
    await prisma.$transaction(async (tx) => {
      await tx.auditoriaLog.deleteMany({ where: { empresaId } });
      await tx.usuario.deleteMany({ where: { empresaId } });
      await tx.empresa.delete({ where: { id: empresaId } });
    });
    expect(await prisma.empresa.count({ where: { id: empresaId } })).toBe(0);
  });
  afterAll(async () => {
    if (app) await app.close();
    await prisma.$disconnect();
  });
  async function login(senhaLogin = senha) {
    const resposta = await request(server)
      .post('/auth/login')
      .send({ email, senha: senhaLogin })
      .expect(201);
    return resposta.body as {
      access_token: string;
      usuario: { trocaSenhaObrigatoria: boolean };
    };
  }
  const trocar = (token: string, extra: object = {}) =>
    request(server)
      .post('/auth/trocar-senha')
      .auth(token, { type: 'bearer' })
      .send({ senhaAtual: senha, novaSenha: 'Nova-fixture-456', ...extra });
  it('login pendente permite me, bloqueia rotas com e sem PermissionsGuard com erro padronizado', async () => {
    const resultado = await login();
    expect(resultado.usuario.trocaSenhaObrigatoria).toBe(true);
    expect(
      app
        .get(JwtService)
        .decode<{ trocaSenhaObrigatoria: boolean }>(resultado.access_token)
        .trocaSenhaObrigatoria,
    ).toBe(true);
    await request(server)
      .get('/auth/me')
      .auth(resultado.access_token, { type: 'bearer' })
      .expect(200);
    for (const rota of ['/fixture-protegida', '/fixture-protegida/permissao']) {
      const resposta = await request(server)
        .get(rota)
        .auth(resultado.access_token, { type: 'bearer' })
        .expect(403);
      expect(resposta.body).toMatchObject({
        error: 'TROCA_SENHA_OBRIGATORIA',
        message: 'É necessário alterar a senha antes de continuar.',
      });
    }
  });
  it('banco prevalece sobre claim falso ou ausente, sem invalidar token legado', async () => {
    for (const extra of [{}, { trocaSenhaObrigatoria: false }]) {
      const token = await app.get(JwtService).signAsync({
        id: usuarioId,
        email,
        tipo: 'USUARIO_EMPRESA',
        empresaId,
        versaoAutorizacao: 0,
        ...extra,
      });
      const me = await request(server)
        .get('/auth/me')
        .auth(token, { type: 'bearer' })
        .expect(200);
      expect(me.body).toMatchObject({ trocaSenhaObrigatoria: true });
      await request(server)
        .get('/fixture-protegida')
        .auth(token, { type: 'bearer' })
        .expect(403);
    }
  });
  it.each([true, false])(
    'troca a própria senha com pendência=%s, revoga token e sanitiza auditoria',
    async (trocaSenhaObrigatoria) => {
      await prisma.usuario.update({
        where: { id: usuarioId },
        data: { trocaSenhaObrigatoria },
      });
      const { access_token } = await login();
      if (!trocaSenhaObrigatoria)
        await request(server)
          .get('/fixture-protegida')
          .auth(access_token, { type: 'bearer' })
          .expect(200);
      const resposta = await trocar(access_token).expect(201);
      expect(resposta.body).toEqual({ novoLoginNecessario: true });
      const usuario = await prisma.usuario.findUniqueOrThrow({
        where: { id: usuarioId },
      });
      expect(usuario).toMatchObject({
        trocaSenhaObrigatoria: false,
        versaoAutorizacao: 1,
      });
      expect(await bcrypt.compare('Nova-fixture-456', usuario.senha)).toBe(
        true,
      );
      await request(server)
        .get('/auth/me')
        .auth(access_token, { type: 'bearer' })
        .expect(401);
      const novo = await login('Nova-fixture-456');
      await request(server)
        .get('/fixture-protegida')
        .auth(novo.access_token, { type: 'bearer' })
        .expect(200);
      const logs = await prisma.auditoriaLog.findMany({ where: { empresaId } });
      expect(logs).toHaveLength(1);
      expect(JSON.stringify([logs, resposta.body, novo])).not.toMatch(
        /Senha-fixture|Nova-fixture|\$2[aby]\$|senhaAtual|novaSenha/,
      );
    },
  );
  it.each([
    [{ senhaAtual: 'errada' }, 401],
    [{ novaSenha: senha }, 400],
    [{ novaSenha: '123' }, 400],
    [{ usuarioId: randomUUID() }, 400],
  ] as const)('rejeita dados inválidos %j', async (extra, codigo) => {
    const { access_token } = await login();
    await trocar(access_token, extra).expect(codigo);
    expect(
      await prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } }),
    ).toMatchObject({
      senha: hash,
      versaoAutorizacao: 0,
      trocaSenhaObrigatoria: true,
    });
    expect(await prisma.auditoriaLog.count({ where: { empresaId } })).toBe(0);
  });
  it('duas trocas concorrentes não reutilizam sessão revogada', async () => {
    const service = app.get(TrocaSenhaService);
    const ator = {
      id: usuarioId,
      email,
      empresaId,
      tipo: 'USUARIO_EMPRESA',
      versaoAutorizacao: 0,
    };
    const resultados = await Promise.allSettled([
      service.trocar(ator, { senhaAtual: senha, novaSenha: 'Nova-fixture-A' }),
      service.trocar(ator, { senhaAtual: senha, novaSenha: 'Nova-fixture-B' }),
    ]);
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(
      (await prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } }))
        .versaoAutorizacao,
    ).toBe(1);
    expect(await prisma.auditoriaLog.count({ where: { empresaId } })).toBe(1);
  });
});
