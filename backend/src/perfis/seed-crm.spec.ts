import { PrismaClient } from '@prisma/client';
import { PERMISSOES_CRM, seedCrm } from '../../prisma/seed/seed-crm';

type PerfilFixture = {
  id: string;
  chave: string;
  sistema: boolean;
  ativo: boolean;
  escopo: 'SISTEMA' | 'EMPRESA';
  empresaId: string | null;
};

type VinculoFixture = {
  id: string;
  perfilId: string;
  permissaoId: string;
  permitido: boolean;
};

function criarPrismaIsolado() {
  const perfis: PerfilFixture[] = [
    {
      id: 'super-admin',
      chave: 'super_administrador',
      sistema: true,
      ativo: true,
      escopo: 'SISTEMA',
      empresaId: null,
    },
    {
      id: 'admin-sistema',
      chave: 'administrador_sistema',
      sistema: true,
      ativo: true,
      escopo: 'SISTEMA',
      empresaId: null,
    },
    ...['empresa-a', 'empresa-b'].flatMap((empresaId) => [
      {
        id: `admin-empresa-${empresaId}`,
        chave: 'administrador_empresa',
        sistema: true,
        ativo: true,
        escopo: 'EMPRESA' as const,
        empresaId,
      },
      {
        id: `supervisor-${empresaId}`,
        chave: 'supervisor',
        sistema: true,
        ativo: true,
        escopo: 'EMPRESA' as const,
        empresaId,
      },
      {
        id: `rh-${empresaId}`,
        chave: 'rh',
        sistema: true,
        ativo: true,
        escopo: 'EMPRESA' as const,
        empresaId,
      },
      {
        id: `colaborador-${empresaId}`,
        chave: 'colaborador',
        sistema: true,
        ativo: true,
        escopo: 'EMPRESA' as const,
        empresaId,
      },
    ]),
  ];
  const modulo = new Map<string, { chave: string; ativo: boolean }>();
  const permissoes = new Map<string, { id: string; chave: string }>();
  const vinculos: VinculoFixture[] = [
    {
      id: 'preexistente',
      perfilId: 'supervisor-empresa-a',
      permissaoId: 'permissao-nao-crm',
      permitido: false,
    },
  ];
  let sequencia = 0;

  const tx = {
    moduloSistema: {
      upsert: async (args: {
        create: { chave: string; ativo: boolean };
        update: { chave?: string; ativo: boolean };
      }) => {
        const atual = modulo.get(args.create.chave);
        modulo.set(args.create.chave, {
          chave: args.create.chave,
          ativo: args.update.ativo,
        });
        return atual;
      },
    },
    permissao: {
      upsert: async (args: {
        create: { chave: string };
        update: { chave: string };
      }) => {
        const atual = permissoes.get(args.create.chave);
        if (atual) return atual;
        const criada = {
          id: `crm-${permissoes.size}`,
          chave: args.create.chave,
        };
        permissoes.set(criada.chave, criada);
        return criada;
      },
      findMany: async () => [...permissoes.values()],
    },
    perfil: {
      findMany: async () =>
        perfis.filter(
          (perfil) =>
            perfil.sistema &&
            perfil.ativo &&
            ((perfil.escopo === 'SISTEMA' &&
              ['super_administrador', 'administrador_sistema'].includes(
                perfil.chave,
              )) ||
              (perfil.escopo === 'EMPRESA' &&
                ['administrador_empresa', 'supervisor', 'colaborador'].includes(
                  perfil.chave,
                ))),
        ),
    },
    perfilPermissao: {
      findUnique: async (args: {
        where: {
          perfilId_permissaoId: { perfilId: string; permissaoId: string };
        };
      }) =>
        vinculos.find(
          (vinculo) =>
            vinculo.perfilId === args.where.perfilId_permissaoId.perfilId &&
            vinculo.permissaoId === args.where.perfilId_permissaoId.permissaoId,
        ) ?? null,
      create: async (args: { data: Omit<VinculoFixture, 'id'> }) => {
        const vinculo = { id: `vinculo-${++sequencia}`, ...args.data };
        vinculos.push(vinculo);
        return vinculo;
      },
      update: async (args: {
        where: { id: string };
        data: { permitido: boolean };
      }) => {
        const vinculo = vinculos.find((item) => item.id === args.where.id);
        if (!vinculo) throw new Error('Vínculo não encontrado');
        vinculo.permitido = args.data.permitido;
        return vinculo;
      },
    },
    usuarioPerfil: { findMany: async () => [] },
    usuario: { updateMany: async () => ({ count: 0 }) },
  };
  const prisma = {
    $queryRaw: async () => [{ nome: 'sistema_gestao_teste' }],
    $transaction: async (
      callback: (transaction: typeof tx) => Promise<unknown>,
    ) => callback(tx),
  } as unknown as PrismaClient;

  const permissoesDoPerfil = (perfilId: string) =>
    vinculos
      .filter((vinculo) => vinculo.perfilId === perfilId && vinculo.permitido)
      .map(
        (vinculo) =>
          [...permissoes.values()].find(
            (permissao) => permissao.id === vinculo.permissaoId,
          )?.chave,
      )
      .filter((chave): chave is string => Boolean(chave))
      .sort();

  return { modulo, permissoes, vinculos, prisma, permissoesDoPerfil };
}

describe('seedCrm', () => {
  const ambienteOriginal = process.env.ALLOW_DATABASE_SEED;

  beforeEach(() => {
    process.env.ALLOW_DATABASE_SEED = 'true';
  });

  afterAll(() => {
    if (ambienteOriginal === undefined) delete process.env.ALLOW_DATABASE_SEED;
    else process.env.ALLOW_DATABASE_SEED = ambienteOriginal;
  });

  it('provisiona CRM incrementalmente, respeita a matriz e preserva vínculos alheios', async () => {
    const estado = criarPrismaIsolado();

    expect(await seedCrm(estado.prisma)).toEqual({
      perfisAlterados: 8,
      usuariosRevogados: 0,
    });
    expect(estado.modulo.get('crm')).toEqual({ chave: 'crm', ativo: true });
    expect(
      [...estado.permissoes.values()].map((item) => item.chave).sort(),
    ).toEqual(PERMISSOES_CRM.map((item) => item.chave).sort());

    const todas = PERMISSOES_CRM.map((item) => item.chave).sort();
    expect(estado.permissoesDoPerfil('super-admin')).toEqual(todas);
    expect(estado.permissoesDoPerfil('admin-sistema')).toEqual(todas);
    expect(estado.permissoesDoPerfil('admin-empresa-empresa-a')).toEqual(todas);
    expect(estado.permissoesDoPerfil('admin-empresa-empresa-b')).toEqual(todas);
    expect(estado.permissoesDoPerfil('supervisor-empresa-a')).toEqual(
      todas.filter((chave) => chave !== 'crm.funil.gerenciar'),
    );
    expect(estado.permissoesDoPerfil('rh-empresa-a')).toEqual([]);
    expect(estado.permissoesDoPerfil('colaborador-empresa-a')).toEqual([
      'crm.interacoes.criar',
      'crm.oportunidades.criar',
      'crm.visualizar',
    ]);
    expect(estado.vinculos).toContainEqual({
      id: 'preexistente',
      perfilId: 'supervisor-empresa-a',
      permissaoId: 'permissao-nao-crm',
      permitido: false,
    });

    const quantidadeAntes = estado.vinculos.length;
    expect(await seedCrm(estado.prisma)).toEqual({
      perfisAlterados: 0,
      usuariosRevogados: 0,
    });
    expect(estado.vinculos).toHaveLength(quantidadeAntes);
  });
});
