import * as bcrypt from 'bcrypt';
import { PrismaClient, TipoEtapaCRM, UserType } from '@prisma/client';
import { randomUUID } from 'crypto';

export const CRM_DATABASE_TEST_PASSWORD = 'Senha-fixture-CRM-123';

type FixtureUser = { id: string; email: string };

export type CrmDatabaseFixtures = {
  prefixo: string;
  empresaA: string;
  empresaB: string;
  etapaA: string;
  etapaB: string;
  usuarios: {
    superAdmin: FixtureUser;
    empresaAComVisualizacao: FixtureUser;
    empresaASemVisualizacao: FixtureUser;
    empresaBComVisualizacao: FixtureUser;
  };
  ids: {
    empresas: string[];
    usuarios: string[];
    perfis: string[];
    clientes: string[];
    etapas: string[];
  };
};

export async function assertTestDatabase(prisma: PrismaClient) {
  if (process.env.RUN_CRM_DATABASE_TESTS !== 'true') {
    throw new Error('RUN_CRM_DATABASE_TESTS=true é obrigatório.');
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL é obrigatório.');

  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL inválida.');
  }

  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('A suíte CRM exige DATABASE_URL PostgreSQL.');
  }

  const databaseDaUrl = decodeURIComponent(url.pathname).replace(/^\//, '');
  if (databaseDaUrl !== 'sistema_gestao_teste') {
    throw new Error('A suíte CRM é restrita ao banco sistema_gestao_teste.');
  }

  const [banco] = await prisma.$queryRaw<
    Array<{ database: string; schema: string }>
  >`SELECT current_database() AS database, current_schema() AS schema`;

  if (banco?.database !== 'sistema_gestao_teste') {
    throw new Error('PostgreSQL conectado não é sistema_gestao_teste.');
  }
  if (banco.schema !== 'public') {
    throw new Error('A suíte CRM exige o schema public.');
  }

  return { host: url.hostname, database: banco.database, schema: banco.schema };
}

export async function criarFixturesCrm(
  prisma: PrismaClient,
): Promise<CrmDatabaseFixtures> {
  const prefixo = `AUTO_CRM_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const fixtures: CrmDatabaseFixtures = {
    prefixo,
    empresaA: '',
    empresaB: '',
    etapaA: '',
    etapaB: '',
    usuarios: {
      superAdmin: { id: '', email: '' },
      empresaAComVisualizacao: { id: '', email: '' },
      empresaASemVisualizacao: { id: '', email: '' },
      empresaBComVisualizacao: { id: '', email: '' },
    },
    ids: { empresas: [], usuarios: [], perfis: [], clientes: [], etapas: [] },
  };

  try {
    const [moduloCrm, permissoesCrm] = await Promise.all([
      prisma.moduloSistema.findUnique({ where: { chave: 'crm' } }),
      prisma.permissao.findMany({
        where: {
          chave: {
            in: ['crm.visualizar'],
          },
        },
      }),
    ]);
    if (!moduloCrm?.ativo) {
      throw new Error('Módulo CRM seedado e ativo é obrigatório.');
    }
    if (
      permissoesCrm.length !== 1 ||
      permissoesCrm.some((permissao) => !permissao.ativo)
    ) {
      throw new Error('Permissão seedada crm.visualizar é obrigatória.');
    }

    const senha = await bcrypt.hash(CRM_DATABASE_TEST_PASSWORD, 10);
    const [empresaA, empresaB] = await Promise.all([
      prisma.empresa.create({ data: { nome: `${prefixo}_EMPRESA_A` } }),
      prisma.empresa.create({ data: { nome: `${prefixo}_EMPRESA_B` } }),
    ]);
    fixtures.empresaA = empresaA.id;
    fixtures.empresaB = empresaB.id;
    fixtures.ids.empresas.push(empresaA.id, empresaB.id);

    await prisma.empresaModulo.createMany({
      data: [
        { empresaId: empresaA.id, moduloId: moduloCrm.id, ativo: true },
        { empresaId: empresaB.id, moduloId: moduloCrm.id, ativo: false },
      ],
    });

    const [
      perfilSuper,
      perfilAComVisualizacao,
      perfilASemVisualizacao,
      perfilBComVisualizacao,
    ] = await Promise.all([
      prisma.perfil.create({
        data: {
          nome: `${prefixo}_SUPER`,
          chave: `${prefixo}_super`,
          sistema: false,
          escopo: 'SISTEMA',
        },
      }),
      prisma.perfil.create({
        data: {
          nome: `${prefixo}_A_VISUALIZAR`,
          chave: `${prefixo}_a_visualizar`,
          sistema: false,
          escopo: 'EMPRESA',
          empresaId: empresaA.id,
        },
      }),
      prisma.perfil.create({
        data: {
          nome: `${prefixo}_A_RESTRITO`,
          chave: `${prefixo}_a_restrito`,
          sistema: false,
          escopo: 'EMPRESA',
          empresaId: empresaA.id,
        },
      }),
      prisma.perfil.create({
        data: {
          nome: `${prefixo}_B_VISUALIZAR`,
          chave: `${prefixo}_b_visualizar`,
          sistema: false,
          escopo: 'EMPRESA',
          empresaId: empresaB.id,
        },
      }),
    ]);
    fixtures.ids.perfis.push(
      perfilSuper.id,
      perfilAComVisualizacao.id,
      perfilASemVisualizacao.id,
      perfilBComVisualizacao.id,
    );

    await prisma.perfilPermissao.createMany({
      data: [perfilSuper, perfilAComVisualizacao, perfilBComVisualizacao].map(
        (perfil) => ({
          perfilId: perfil.id,
          permissaoId: permissoesCrm.find(
            (permissao) => permissao.chave === 'crm.visualizar',
          )!.id,
        }),
      ),
    });

    const emails = {
      superAdmin: `${prefixo}_super@example.invalid`,
      empresaAComVisualizacao: `${prefixo}_a_visualizar@example.invalid`,
      empresaASemVisualizacao: `${prefixo}_a_restrito@example.invalid`,
      empresaBComVisualizacao: `${prefixo}_b_visualizar@example.invalid`,
    };
    const [
      superAdmin,
      usuarioAComVisualizacao,
      usuarioASemVisualizacao,
      usuarioBComVisualizacao,
    ] = await Promise.all([
      prisma.usuario.create({
        data: {
          nome: `${prefixo}_SUPER`,
          email: emails.superAdmin,
          senha,
          tipo: UserType.SUPER_ADMIN,
        },
      }),
      prisma.usuario.create({
        data: {
          nome: `${prefixo}_A_VISUALIZAR`,
          email: emails.empresaAComVisualizacao,
          senha,
          tipo: UserType.USUARIO_EMPRESA,
          empresaId: empresaA.id,
        },
      }),
      prisma.usuario.create({
        data: {
          nome: `${prefixo}_A_RESTRITO`,
          email: emails.empresaASemVisualizacao,
          senha,
          tipo: UserType.USUARIO_EMPRESA,
          empresaId: empresaA.id,
        },
      }),
      prisma.usuario.create({
        data: {
          nome: `${prefixo}_B_VISUALIZAR`,
          email: emails.empresaBComVisualizacao,
          senha,
          tipo: UserType.USUARIO_EMPRESA,
          empresaId: empresaB.id,
        },
      }),
    ]);
    fixtures.usuarios = {
      superAdmin: { id: superAdmin.id, email: superAdmin.email },
      empresaAComVisualizacao: {
        id: usuarioAComVisualizacao.id,
        email: usuarioAComVisualizacao.email,
      },
      empresaASemVisualizacao: {
        id: usuarioASemVisualizacao.id,
        email: usuarioASemVisualizacao.email,
      },
      empresaBComVisualizacao: {
        id: usuarioBComVisualizacao.id,
        email: usuarioBComVisualizacao.email,
      },
    };
    fixtures.ids.usuarios.push(
      superAdmin.id,
      usuarioAComVisualizacao.id,
      usuarioASemVisualizacao.id,
      usuarioBComVisualizacao.id,
    );

    await prisma.usuarioPerfil.createMany({
      data: [
        { usuarioId: superAdmin.id, perfilId: perfilSuper.id },
        {
          usuarioId: usuarioAComVisualizacao.id,
          perfilId: perfilAComVisualizacao.id,
        },
        {
          usuarioId: usuarioASemVisualizacao.id,
          perfilId: perfilASemVisualizacao.id,
        },
        {
          usuarioId: usuarioBComVisualizacao.id,
          perfilId: perfilBComVisualizacao.id,
        },
      ],
    });

    const [clienteA, clienteB, etapaA, etapaB] = await Promise.all([
      prisma.cliente.create({
        data: { empresaId: empresaA.id, nome: `${prefixo}_CLIENTE_A` },
      }),
      prisma.cliente.create({
        data: { empresaId: empresaB.id, nome: `${prefixo}_CLIENTE_B` },
      }),
      prisma.crmEtapa.create({
        data: {
          empresaId: empresaA.id,
          nome: `${prefixo}_ETAPA_A`,
          ordem: 10,
          tipo: TipoEtapaCRM.ABERTA,
        },
      }),
      prisma.crmEtapa.create({
        data: {
          empresaId: empresaB.id,
          nome: `${prefixo}_ETAPA_B`,
          ordem: 10,
          tipo: TipoEtapaCRM.ABERTA,
        },
      }),
    ]);
    fixtures.ids.clientes.push(clienteA.id, clienteB.id);
    fixtures.ids.etapas.push(etapaA.id, etapaB.id);
    fixtures.etapaA = etapaA.id;
    fixtures.etapaB = etapaB.id;

    return fixtures;
  } catch (error) {
    await limparFixturesCrm(prisma, fixtures);
    throw error;
  }
}

export async function limparFixturesCrm(
  prisma: PrismaClient,
  fixtures: CrmDatabaseFixtures | undefined,
) {
  if (!fixtures) return;
  const empresas = fixtures.ids.empresas;
  const usuarios = fixtures.ids.usuarios;

  await prisma.$transaction(async (tx) => {
    await tx.clienteInteracao.deleteMany({
      where: { empresaId: { in: empresas } },
    });
    await tx.crmOportunidadeHistorico.deleteMany({
      where: { empresaId: { in: empresas } },
    });
    await tx.crmOportunidade.deleteMany({
      where: { empresaId: { in: empresas } },
    });
    await tx.auditoriaLog.deleteMany({
      where: {
        OR: [{ empresaId: { in: empresas } }, { usuarioId: { in: usuarios } }],
      },
    });
    await tx.crmEtapa.deleteMany({
      where: { id: { in: fixtures.ids.etapas } },
    });
    await tx.cliente.deleteMany({
      where: { id: { in: fixtures.ids.clientes } },
    });
    await tx.usuarioPerfil.deleteMany({
      where: { usuarioId: { in: usuarios } },
    });
    await tx.perfilPermissao.deleteMany({
      where: { perfilId: { in: fixtures.ids.perfis } },
    });
    await tx.usuario.deleteMany({ where: { id: { in: usuarios } } });
    await tx.perfil.deleteMany({ where: { id: { in: fixtures.ids.perfis } } });
    await tx.empresaModulo.deleteMany({
      where: { empresaId: { in: empresas } },
    });
    await tx.empresa.deleteMany({ where: { id: { in: empresas } } });
  });

  const residuos = await prisma.empresa.count({
    where: { id: { in: empresas } },
  });
  if (residuos !== 0) throw new Error('Cleanup CRM deixou empresas fixture.');
}
