import {
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import type { Server } from 'http';
import request from 'supertest';
import { CargosModule } from '../cargos/cargos.module';
import { DepartamentosModule } from '../departamentos/departamentos.module';
import { FuncionariosModule } from './funcionarios.module';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { RespostaInterceptor } from '../common/interceptors/resposta.interceptor';
import { operacionalSelect, pessoalSelect } from './funcionarios.select';
import { seedRh } from '../../prisma/seed/seed-rh';

type RegistroResposta = {
  id: string;
  versaoRegistro: number;
  estadoAcesso: string;
  tipo: string;
  cargo: { id: string; ativo: boolean };
  descricao: string | null;
};
function detalhe(response: { body: unknown }) {
  return response.body as { data: RegistroResposta };
}
function lista(response: { body: unknown }) {
  return response.body as {
    data: RegistroResposta[];
    meta: { page: number; limit: number };
  };
}

// Opt-in explícito; todas as fixtures são revertidas, inclusive em caso de falha.
const describeBanco =
  process.env.RUN_RH_DATABASE_TESTS === 'true' ? describe : describe.skip;
describeBanco('RH V3.4.3 — HTTP e integridade em PostgreSQL real', () => {
  const prisma = new PrismaClient();
  let tx: Prisma.TransactionClient;
  let concluir: () => void;
  let transacao: Promise<unknown> | undefined;
  let app: INestApplication;
  let server: Server;
  let ator: AuthenticatedUser;
  let empresaId: string;
  let outraEmpresaId: string;
  let usuarioId: string;
  let perfilId: string;
  let funcionarioId: string;
  let externoId: string;
  let cargoId: string;
  let departamentoId: string;
  let contador = 0;
  const rollback = new Error('ROLLBACK_RH');
  const permissoes = [
    'visualizar',
    'criar',
    'editar',
    'inativar',
    'situacao.gerenciar',
    'dados_pessoais.visualizar',
    'dados_pessoais.editar',
    'estrutura.gerenciar',
    'acesso.gerenciar',
  ].map((p) => `funcionarios.${p}`);
  const dados = () => ({
    nome: '  Maria Silva  ',
    matricula: randomUUID(),
    dataAdmissao: '2026-01-01',
    tipoVinculo: 'CLT',
  });
  const funcionario = (empresa: string, extras: Record<string, unknown> = {}) =>
    tx.funcionario.create({
      data: {
        empresaId: empresa,
        nome: 'Funcionario teste',
        matricula: randomUUID(),
        dataAdmissao: new Date('2026-01-01'),
        tipoVinculo: 'CLT',
        status: 'ATIVO',
        statusDesde: new Date(),
        ...extras,
      },
    });
  const adapter = new Proxy({} as PrismaService, {
    get(_target, prop) {
      if (prop === '$transaction')
        return async (
          callback: (client: Prisma.TransactionClient) => Promise<unknown>,
        ) => {
          const name = `rh_operacao_${++contador}`;
          await tx.$executeRawUnsafe(`SAVEPOINT ${name}`);
          try {
            const result = await callback(tx);
            await tx.$executeRawUnsafe(`RELEASE SAVEPOINT ${name}`);
            return result;
          } catch (error) {
            await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT ${name}`);
            await tx.$executeRawUnsafe(`RELEASE SAVEPOINT ${name}`);
            throw error;
          }
        };
      if (
        ['onModuleInit', 'onModuleDestroy', '$connect', '$disconnect'].includes(
          String(prop),
        )
      )
        return async () => {};
      const value = tx[prop as keyof typeof tx];
      return (typeof value === 'function' ? value.bind(tx) : value) as unknown;
    },
  });

  beforeAll(async () => {
    const [db] = await prisma.$queryRaw<
      Array<{ nome: string }>
    >`SELECT current_database() AS nome`;
    if (db.nome !== 'sistema_gestao_teste')
      throw new Error('Teste RH bloqueado fora do banco de teste.');
    let pronto!: () => void;
    const ready = new Promise<void>((resolve) => {
      pronto = resolve;
    });
    const fim = new Promise<void>((resolve) => {
      concluir = resolve;
    });
    transacao = prisma
      .$transaction(
        async (client) => {
          tx = client;
          pronto();
          await fim;
          throw rollback;
        },
        { timeout: 180000, isolationLevel: 'Serializable' },
      )
      .catch((e) => {
        if (e !== rollback) throw e;
      });
    await ready;
    const empresa = await tx.empresa.create({
      data: { nome: 'RH teste ' + randomUUID() },
    });
    const outra = await tx.empresa.create({
      data: { nome: 'RH teste externo ' + randomUUID() },
    });
    empresaId = empresa.id;
    outraEmpresaId = outra.id;
    const perfil = await tx.perfil.create({
      data: {
        empresaId,
        nome: 'RH fixture',
        chave: randomUUID(),
        escopo: 'EMPRESA',
        sistema: false,
      },
    });
    perfilId = perfil.id;
    const usuario = await tx.usuario.create({
      data: {
        empresaId,
        nome: 'Ator fixture',
        email: randomUUID() + '@example.invalid',
        senha: 'fixture-sem-login',
        tipo: 'USUARIO_EMPRESA',
      },
    });
    usuarioId = usuario.id;
    await tx.usuarioPerfil.create({ data: { usuarioId, perfilId } });
    const catalogo = await tx.permissao.findMany({
      where: { chave: { in: permissoes } },
    });
    expect(catalogo).toHaveLength(9);
    await tx.perfilPermissao.createMany({
      data: catalogo.map((p) => ({
        perfilId,
        permissaoId: p.id,
        permitido: true,
      })),
    });
    funcionarioId = (
      await funcionario(empresaId, {
        cpf: '12345678900',
        emailPessoal: 'privado@example.invalid',
        cidade: 'Cidade privada',
      })
    ).id;
    externoId = (await funcionario(outraEmpresaId)).id;
    cargoId = (await tx.cargo.create({ data: { empresaId, nome: 'Analista' } }))
      .id;
    departamentoId = (
      await tx.departamento.create({ data: { empresaId, nome: 'Tecnologia' } })
    ).id;
    const module = await Test.createTestingModule({
      imports: [CargosModule, DepartamentosModule, FuncionariosModule],
    })
      .overrideProvider(PrismaService)
      .useValue(adapter)
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          context
            .switchToHttp()
            .getRequest<{ user: AuthenticatedUser }>().user = ator;
          return true;
        },
      })
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
    app.useGlobalInterceptors(new RespostaInterceptor());
    await app.init();
    server = app.getHttpServer() as Server;
  }, 30000);
  beforeEach(async () => {
    ator = {
      id: usuarioId,
      empresaId,
      tipo: 'USUARIO_EMPRESA',
      email: 'fixture@example.invalid',
      versaoAutorizacao: 0,
      permissoes: [...permissoes],
    };
    await tx.$executeRawUnsafe('SAVEPOINT rh_teste');
  });
  afterEach(async () => {
    await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT rh_teste');
    await tx.$executeRawUnsafe('RELEASE SAVEPOINT rh_teste');
  });
  afterAll(async () => {
    try {
      if (app) await app.close();
    } finally {
      concluir?.();
      if (transacao !== undefined) await transacao;
    }
    if (empresaId)
      expect(
        await prisma.empresa.count({
          where: { id: { in: [empresaId, outraEmpresaId] } },
        }),
      ).toBe(0);
    await prisma.$disconnect();
  });

  it('cria normalizado, estado inicial e histórico atômico sem dados pessoais', async () => {
    const r = await request(server)
      .post('/funcionarios')
      .send({
        ...dados(),
        cargoId,
        departamentoId,
        cpf: '987.654.321-00',
        emailCorporativo: ' MARIA@EXAMPLE.COM ',
        emailPessoal: ' PESSOAL@EXAMPLE.COM ',
        cep: '60.000-000',
        uf: ' ce ',
      })
      .expect(201);
    expect(detalhe(r).data).toMatchObject({
      nome: 'Maria Silva',
      status: 'ATIVO',
      versaoRegistro: 0,
      estadoAcesso: 'SEM_USUARIO',
      emailCorporativo: 'maria@example.com',
    });
    expect(detalhe(r).data).not.toHaveProperty('cpf');
    const f = await tx.funcionario.findFirstOrThrow({
      where: { id: detalhe(r).data.id, empresaId },
    });
    expect(f).toMatchObject({
      cpf: '98765432100',
      cep: '60000000',
      uf: 'CE',
      emailPessoal: 'pessoal@example.com',
      usuarioId: null,
      dataDesligamento: null,
    });
    const h = await tx.funcionarioHistorico.findMany({
      where: { funcionarioId: f.id, empresaId },
    });
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({
      tipo: 'CRIACAO',
      origem: 'RH',
      atorUsuarioId: usuarioId,
      statusNovo: 'ATIVO',
      acessoNovo: 'SEM_USUARIO',
    });
    const audit = await tx.auditoriaLog.findMany({
      where: { entidadeId: f.id, empresaId },
    });
    for (const value of [f.cpf, f.emailPessoal, f.cep])
      expect(JSON.stringify([h, audit])).not.toContain(value);
  });
  it.each([
    'cpf',
    'emailPessoal',
    'telefonePessoal',
    'cep',
    'logradouro',
    'numero',
    'complemento',
    'bairro',
    'cidade',
    'uf',
  ])('POST pessoal %s exige permissão mesmo com null', async (campo) => {
    ator.permissoes = ['funcionarios.criar'];
    const before = await tx.funcionario.count({ where: { empresaId } });
    await request(server)
      .post('/funcionarios')
      .send({ ...dados(), [campo]: null })
      .expect(403);
    expect(await tx.funcionario.count({ where: { empresaId } })).toBe(before);
  });
  it('POST operacional funciona somente com criar', async () => {
    ator.permissoes = ['funcionarios.criar'];
    await request(server).post('/funcionarios').send(dados()).expect(201);
  });
  it('lista com paginação, busca e select sem dados pessoais', async () => {
    const r = await request(server)
      .get('/funcionarios')
      .query({
        page: 1,
        limit: 1,
        search: 'FUNCIONARIO',
        status: 'ATIVO',
        tipoVinculo: 'CLT',
      })
      .expect(200);
    expect(lista(r).meta).toMatchObject({ page: 1, limit: 1 });
    expect(lista(r).data).toHaveLength(1);
    for (const field of Object.keys(pessoalSelect).filter((k) => k !== 'id')) {
      expect(operacionalSelect).not.toHaveProperty(field);
      expect(lista(r).data[0]).not.toHaveProperty(field);
    }
    for (const field of ['statusDesde', 'dataDesligamento']) {
      expect(operacionalSelect).not.toHaveProperty(field);
      expect(lista(r).data[0]).not.toHaveProperty(field);
    }
  });
  it('detalhe operacional usa select seguro', async () => {
    const r = await request(server)
      .get(`/funcionarios/${funcionarioId}`)
      .expect(200);
    expect(detalhe(r).data).not.toHaveProperty('cpf');
    expect(detalhe(r).data).not.toHaveProperty('statusDesde');
    expect(detalhe(r).data).not.toHaveProperty('dataDesligamento');
    expect(detalhe(r).data).toHaveProperty('status', 'ATIVO');
    expect(JSON.stringify(r.body)).not.toContain('privado@example.invalid');
  });
  it.each(['', '/dados-pessoais', '/historico'])(
    'tenant A não lê B %s',
    async (suffix) => {
      await request(server)
        .get(`/funcionarios/${externoId}${suffix}`)
        .expect(404);
    },
  );
  it.each(['', '/dados-pessoais'])(
    'tenant A não edita B %s',
    async (suffix) => {
      await request(server)
        .patch(`/funcionarios/${externoId}${suffix}`)
        .send({ versaoRegistro: 0 })
        .expect(404);
    },
  );
  it('dados pessoais exigem ambas as permissões', async () => {
    for (const permissions of [
      ['funcionarios.visualizar'],
      ['funcionarios.dados_pessoais.visualizar'],
    ]) {
      ator.permissoes = permissions;
      await request(server)
        .get(`/funcionarios/${funcionarioId}/dados-pessoais`)
        .expect(403);
    }
  });
  it('dados pessoais retornam somente campos previstos', async () => {
    const r = await request(server)
      .get(`/funcionarios/${funcionarioId}/dados-pessoais`)
      .expect(200);
    expect(Object.keys(detalhe(r).data).sort()).toEqual(
      [
        'funcionarioId',
        ...Object.keys(pessoalSelect).filter((k) => k !== 'id'),
      ].sort(),
    );
  });
  it('edita dados pessoais, incrementa versão, normaliza e não expõe valores no histórico', async () => {
    const r = await request(server)
      .patch(`/funcionarios/${funcionarioId}/dados-pessoais`)
      .send({
        versaoRegistro: 0,
        cpf: '999.888.777-66',
        emailPessoal: ' NOVO@EXAMPLE.COM ',
        cidade: '  ',
        uf: ' sp ',
      })
      .expect(200);
    expect(detalhe(r).data).toMatchObject({
      cpf: '99988877766',
      emailPessoal: 'novo@example.com',
      cidade: null,
      uf: 'SP',
      versaoRegistro: 1,
    });
    const h = await request(server)
      .get(`/funcionarios/${funcionarioId}/historico`)
      .expect(200);
    expect(lista(h).data[0].tipo).toBe('EDICAO');
    expect(JSON.stringify(h.body)).not.toContain('99988877766');
  });
  it('PATCH operacional registra eventos estruturais uma vez e ignora no-op', async () => {
    const payload = {
      versaoRegistro: 0,
      nome: 'Novo nome',
      cargoId,
      departamentoId,
    };
    const r = await request(server)
      .patch(`/funcionarios/${funcionarioId}`)
      .send(payload)
      .expect(200);
    expect(detalhe(r).data.versaoRegistro).toBe(1);
    const where = { empresaId, funcionarioId };
    expect(
      (await tx.funcionarioHistorico.findMany({ where }))
        .map((h) => h.tipo)
        .sort(),
    ).toEqual(['ALTERACAO_CARGO', 'ALTERACAO_DEPARTAMENTO', 'EDICAO']);
    await request(server)
      .patch(`/funcionarios/${funcionarioId}`)
      .send({ ...payload, versaoRegistro: 1 })
      .expect(200);
    expect(await tx.funcionarioHistorico.count({ where })).toBe(3);
    expect(
      (
        await tx.funcionario.findFirstOrThrow({
          where: { id: funcionarioId, empresaId },
        })
      ).versaoRegistro,
    ).toBe(1);
  });
  it('alteração/remoção de gestor, cargo e departamento aceita null', async () => {
    const gestor = await funcionario(empresaId);
    await request(server)
      .patch(`/funcionarios/${funcionarioId}`)
      .send({ versaoRegistro: 0, gestorId: gestor.id, cargoId, departamentoId })
      .expect(200);
    await request(server)
      .patch(`/funcionarios/${funcionarioId}`)
      .send({
        versaoRegistro: 1,
        gestorId: null,
        cargoId: null,
        departamentoId: null,
      })
      .expect(200);
    expect(
      await tx.funcionarioHistorico.count({
        where: { empresaId, funcionarioId, tipo: 'ALTERACAO_GESTOR' },
      }),
    ).toBe(2);
  });
  it.each(['', '/dados-pessoais'])(
    'versão obsoleta em %s retorna 409',
    async (suffix) => {
      await request(server)
        .patch(`/funcionarios/${funcionarioId}${suffix}`)
        .send({ versaoRegistro: 100 })
        .expect(409);
    },
  );
  it('matrícula e CPF duplicados retornam 409', async () => {
    const f = await tx.funcionario.findFirstOrThrow({
      where: { id: funcionarioId, empresaId },
    });
    await request(server)
      .post('/funcionarios')
      .send({ ...dados(), matricula: f.matricula })
      .expect(409);
    await request(server)
      .post('/funcionarios')
      .send({ ...dados(), cpf: f.cpf })
      .expect(409);
    const outro = await funcionario(empresaId);
    await request(server)
      .patch(`/funcionarios/${outro.id}/dados-pessoais`)
      .send({ versaoRegistro: 0, cpf: f.cpf })
      .expect(409);
  });
  it.each(['cargoId', 'departamentoId', 'gestorId'])(
    'associação %s cross-tenant rejeitada',
    async (campo) => {
      const id =
        campo === 'cargoId'
          ? (
              await tx.cargo.create({
                data: { empresaId: outraEmpresaId, nome: 'Outro' },
              })
            ).id
          : campo === 'departamentoId'
            ? (
                await tx.departamento.create({
                  data: { empresaId: outraEmpresaId, nome: 'Outro' },
                })
              ).id
            : externoId;
      await request(server)
        .post('/funcionarios')
        .send({ ...dados(), [campo]: id })
        .expect(400);
      await request(server)
        .patch(`/funcionarios/${funcionarioId}`)
        .send({ versaoRegistro: 0, [campo]: id })
        .expect(400);
    },
  );
  it.each(['cargoId', 'departamentoId'])(
    'associação %s inativa rejeitada',
    async (campo) => {
      if (campo === 'cargoId')
        await tx.cargo.update({
          where: { id: cargoId, empresaId },
          data: { ativo: false },
        });
      else
        await tx.departamento.update({
          where: { id: departamentoId, empresaId },
          data: { ativo: false },
        });
      const id = campo === 'cargoId' ? cargoId : departamentoId;
      await request(server)
        .post('/funcionarios')
        .send({ ...dados(), [campo]: id })
        .expect(400);
      await request(server)
        .patch(`/funcionarios/${funcionarioId}`)
        .send({ versaoRegistro: 0, [campo]: id })
        .expect(400);
    },
  );
  it('auto-gestor e gestor desligado rejeitados', async () => {
    await request(server)
      .patch(`/funcionarios/${funcionarioId}`)
      .send({ versaoRegistro: 0, gestorId: funcionarioId })
      .expect(400);
    const gestor = await funcionario(empresaId, {
      status: 'DESLIGADO',
      dataDesligamento: new Date('2026-02-01'),
    });
    await request(server)
      .post('/funcionarios')
      .send({ ...dados(), gestorId: gestor.id })
      .expect(400);
  });
  it.each(['SEM_USUARIO', 'USUARIO_ATIVO', 'USUARIO_INATIVO'])(
    'deriva e filtra %s',
    async (acesso) => {
      if (acesso !== 'SEM_USUARIO') {
        const u = await tx.usuario.create({
          data: {
            empresaId,
            nome: 'Acesso teste',
            email: randomUUID() + '@example.invalid',
            senha: 'sem-login',
            tipo: 'USUARIO_EMPRESA',
            ativo: acesso === 'USUARIO_ATIVO',
          },
        });
        await tx.funcionario.update({
          where: { id: funcionarioId, empresaId },
          data: { usuarioId: u.id },
        });
      }
      const r = await request(server)
        .get('/funcionarios')
        .query({ acesso })
        .expect(200);
      expect(lista(r).data.length).toBeGreaterThan(0);
      expect(
        lista(r).data.every(
          (f: { estadoAcesso: string }) => f.estadoAcesso === acesso,
        ),
      ).toBe(true);
      expect(lista(r).data[0]).not.toHaveProperty('usuario');
      expect(lista(r).data[0]).not.toHaveProperty('usuarioId');
    },
  );
  it.each(['cargos', 'departamentos'])(
    '%s CRUD, busca, duplicidade e tenant',
    async (rota) => {
      const r = await request(server)
        .post(`/${rota}`)
        .send({ nome: '  Novo  ', descricao: '  Descrição  ' })
        .expect(201);
      const id = detalhe(r).data.id;
      expect(detalhe(r).data).toMatchObject({
        nome: 'Novo',
        descricao: 'Descrição',
        ativo: true,
      });
      await tx.$executeRawUnsafe('SAVEPOINT estrutura_duplicada');
      await request(server).post(`/${rota}`).send({ nome: 'Novo' }).expect(409);
      await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT estrutura_duplicada');
      await tx.$executeRawUnsafe('RELEASE SAVEPOINT estrutura_duplicada');
      await request(server)
        .patch(`/${rota}/${id}`)
        .send({ nome: 'Editado', descricao: '  ' })
        .expect(200);
      const listado = await request(server)
        .get(`/${rota}`)
        .query({ search: 'editado', ativo: 'true', limit: 1 })
        .expect(200);
      expect(lista(listado).data[0].descricao).toBeNull();
      await request(server).patch(`/${rota}/${id}/inativar`).expect(200);
      const inativos = await request(server)
        .get(`/${rota}`)
        .query({ ativo: 'false' })
        .expect(200);
      expect(
        lista(inativos).data.some((x: { id: string }) => x.id === id),
      ).toBe(true);
      await request(server).patch(`/${rota}/${id}/ativar`).expect(200);
      ator.empresaId = outraEmpresaId;
      await request(server).get(`/${rota}/${id}`).expect(404);
      await request(server)
        .patch(`/${rota}/${id}`)
        .send({ nome: 'Ataque' })
        .expect(404);
    },
  );
  it('inativação preserva vínculo e edição não relacionada', async () => {
    await tx.funcionario.update({
      where: { id: funcionarioId, empresaId },
      data: { cargoId, departamentoId },
    });
    await request(server).patch(`/cargos/${cargoId}/inativar`).expect(200);
    await request(server)
      .patch(`/departamentos/${departamentoId}/inativar`)
      .expect(200);
    const r = await request(server)
      .patch(`/funcionarios/${funcionarioId}`)
      .send({ versaoRegistro: 0, nome: 'Outro nome' })
      .expect(200);
    expect(detalhe(r).data.cargo.id).toBe(cargoId);
    expect(detalhe(r).data.cargo.ativo).toBe(false);
  });
  it.each([
    'empresaId',
    'status',
    'usuarioId',
    'statusDesde',
    'dataDesligamento',
    'versaoRegistro',
    'createdAt',
    'updatedAt',
  ])('POST rejeita campo controlado %s', async (campo) => {
    await request(server)
      .post('/funcionarios')
      .send({ ...dados(), [campo]: 'arbitrario' })
      .expect(400);
  });
  it.each([
    'empresaId',
    'status',
    'usuarioId',
    'cpf',
    'emailPessoal',
    'dataDesligamento',
  ])('PATCH operacional rejeita %s', async (campo) => {
    await request(server)
      .patch(`/funcionarios/${funcionarioId}`)
      .send({ versaoRegistro: 0, [campo]: 'arbitrario' })
      .expect(400);
  });
  it.each(['/funcionarios', '/cargos', '/departamentos'])(
    '%s rejeita UUID e filtros inválidos',
    async (rota) => {
      await request(server).get(`${rota}/nao-uuid`).expect(400);
      await request(server).get(rota).query({ limit: 0 }).expect(400);
      await request(server).get(rota).query({ empresaId }).expect(400);
      if (rota !== '/funcionarios')
        await request(server).get(rota).query({ ativo: 'talvez' }).expect(400);
    },
  );
  it.each([
    { status: 'INVALIDO' },
    { tipoVinculo: 'INVALIDO' },
    { acesso: 'INVALIDO' },
    { cargoId: 'invalido' },
    { gestorId: 'invalido' },
  ])('rejeita filtro funcionário %j', async (filtro) => {
    await request(server).get('/funcionarios').query(filtro).expect(400);
  });
  it.each([
    { nome: '  ' },
    { dataAdmissao: '2026-02-30' },
    { tipoVinculo: 'INVALIDO' },
  ])('rejeita cadastro inválido %j', async (invalidos) => {
    await request(server)
      .post('/funcionarios')
      .send({ ...dados(), ...invalidos })
      .expect(400);
  });
  it('SUPER_ADMIN exige seleção e outros usuários não trocam tenant', async () => {
    ator.tipo = 'SUPER_ADMIN';
    ator.empresaId = null;
    await request(server).get('/funcionarios').expect(400);
    await request(server)
      .get('/funcionarios')
      .set('x-empresa-id', empresaId)
      .expect(200);
    ator.tipo = 'USUARIO_EMPRESA';
    ator.empresaId = empresaId;
    await request(server)
      .get('/funcionarios')
      .set('x-empresa-id', outraEmpresaId)
      .expect(403);
  });
  it.each(['ativo', 'versao', 'tipo', 'empresa', 'permissao'])(
    'revalida ator persistido: %s',
    async (condicao) => {
      if (condicao === 'ativo')
        await tx.usuario.update({
          where: { id: usuarioId },
          data: { ativo: false },
        });
      if (condicao === 'versao')
        await tx.usuario.update({
          where: { id: usuarioId },
          data: { versaoAutorizacao: 1 },
        });
      if (condicao === 'tipo')
        await tx.usuario.update({
          where: { id: usuarioId },
          data: { tipo: 'ADMIN_EMPRESA' },
        });
      if (condicao === 'empresa')
        await tx.usuario.update({
          where: { id: usuarioId },
          data: { empresaId: outraEmpresaId },
        });
      if (condicao === 'permissao')
        await tx.usuarioPerfil.updateMany({
          where: { usuarioId, perfilId },
          data: { ativo: false },
        });
      await request(server)
        .post('/funcionarios')
        .send(dados())
        .expect(condicao === 'permissao' ? 403 : 401);
    },
  );
  it('falha de histórico reverte criação inteira', async () => {
    const before = await tx.funcionario.count({ where: { empresaId } });
    const spy = jest
      .spyOn(tx.funcionarioHistorico, 'createMany')
      .mockRejectedValueOnce(new Error('Falha simulada'));
    try {
      await request(server).post('/funcionarios').send(dados()).expect(500);
    } finally {
      spy.mockRestore();
    }
    expect(await tx.funcionario.count({ where: { empresaId } })).toBe(before);
  });
  it.each(['USUARIO_EMPRESA', 'ADMIN_EMPRESA', 'SUPER_ADMIN'] as const)(
    'permite criar com papel %s e autorização persistida',
    async (tipo) => {
      ator.tipo = tipo;
      await tx.usuario.update({
        where: { id: usuarioId },
        data: { tipo, empresaId: tipo === 'SUPER_ADMIN' ? null : empresaId },
      });
      if (tipo === 'SUPER_ADMIN') {
        ator.empresaId = null;
        await tx.perfil.update({
          where: { id: perfilId },
          data: { empresaId: null, escopo: 'SISTEMA' },
        });
      }
      const req = request(server).post('/funcionarios');
      if (tipo === 'SUPER_ADMIN') req.set('x-empresa-id', empresaId);
      await req.send(dados()).expect(201);
    },
  );
  it('no-op pessoal preserva versão e histórico', async () => {
    const r = await request(server)
      .patch(`/funcionarios/${funcionarioId}/dados-pessoais`)
      .send({ versaoRegistro: 0, cpf: '123.456.789-00' })
      .expect(200);
    expect(detalhe(r).data.versaoRegistro).toBe(0);
    expect(
      await tx.funcionarioHistorico.count({
        where: { empresaId, funcionarioId },
      }),
    ).toBe(0);
  });
  it('não disponibiliza comandos de ciclo de vida ou acesso', async () => {
    await request(server).delete(`/funcionarios/${funcionarioId}`).expect(404);
    await request(server)
      .patch(`/funcionarios/${funcionarioId}/desligar`)
      .expect(404);
    await request(server)
      .post(`/funcionarios/${funcionarioId}/acesso`)
      .expect(404);
    await request(server)
      .post(`/funcionarios/${funcionarioId}/historico`)
      .expect(404);
  });
  it('seed incremental preserva empresas, credenciais e permissões alheias', async () => {
    const original = process.env.ALLOW_DATABASE_SEED;
    process.env.ALLOW_DATABASE_SEED = 'true';
    // Remove somente permissões novas em fixtures para exercitar incremento real.
    await tx.perfil.update({
      where: { id: perfilId },
      data: { chave: 'rh', sistema: true },
    });
    const nova = await tx.permissao.findUniqueOrThrow({
      where: { chave: 'funcionarios.estrutura.gerenciar' },
    });
    await tx.perfilPermissao.delete({
      where: { perfilId_permissaoId: { perfilId, permissaoId: nova.id } },
    });
    const acesso = await tx.permissao.findUniqueOrThrow({
      where: { chave: 'funcionarios.acesso.gerenciar' },
    });
    await tx.perfilPermissao.delete({
      where: { perfilId_permissaoId: { perfilId, permissaoId: acesso.id } },
    });
    const antes = await tx.usuario.findUniqueOrThrow({
      where: { id: usuarioId },
    });
    const empresas = await tx.empresa.findMany({ orderBy: { id: 'asc' } });
    try {
      await seedRh(adapter);
      const depois = await tx.usuario.findUniqueOrThrow({
        where: { id: usuarioId },
      });
      expect(depois.versaoAutorizacao).toBe(antes.versaoAutorizacao + 1);
      const { versaoAutorizacao: va, updatedAt: ua, ...a } = antes;
      const { versaoAutorizacao: vb, updatedAt: ub, ...b } = depois;
      expect([va, vb, ua, ub]).toHaveLength(4);
      expect(b).toEqual(a);
      expect(await tx.empresa.findMany({ orderBy: { id: 'asc' } })).toEqual(
        empresas,
      );
      expect(
        await tx.perfilPermissao.count({
          where: { perfilId, permissaoId: acesso.id },
        }),
      ).toBe(0);
      expect(await seedRh(adapter)).toEqual({
        perfisAlterados: 0,
        usuariosRevogados: 0,
      });
    } finally {
      if (original === undefined) delete process.env.ALLOW_DATABASE_SEED;
      else process.env.ALLOW_DATABASE_SEED = original;
    }
  });
});
