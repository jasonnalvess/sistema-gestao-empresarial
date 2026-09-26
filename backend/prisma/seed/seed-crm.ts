import { Prisma, PrismaClient } from '@prisma/client';

export const PERMISSOES_CRM = [
  {
    chave: 'crm.visualizar',
    nome: 'Visualizar CRM',
    descricao: 'Permite visualizar informações do CRM',
  },
  {
    chave: 'crm.interacoes.criar',
    nome: 'Criar interações no CRM',
    descricao: 'Permite registrar interações no CRM',
  },
  {
    chave: 'crm.interacoes.editar',
    nome: 'Editar interações no CRM',
    descricao: 'Permite editar interações no CRM',
  },
  {
    chave: 'crm.oportunidades.criar',
    nome: 'Criar oportunidades no CRM',
    descricao: 'Permite criar oportunidades no CRM',
  },
  {
    chave: 'crm.oportunidades.editar',
    nome: 'Editar oportunidades no CRM',
    descricao: 'Permite editar oportunidades no CRM',
  },
  {
    chave: 'crm.oportunidades.movimentar',
    nome: 'Movimentar oportunidades no CRM',
    descricao: 'Permite movimentar oportunidades no funil do CRM',
  },
  {
    chave: 'crm.funil.gerenciar',
    nome: 'Gerenciar funil do CRM',
    descricao: 'Permite gerenciar o funil do CRM',
  },
].map((permissao) => ({ ...permissao, modulo: 'crm' }));

const PERMISSOES_CRM_POR_PERFIL: Record<string, readonly string[]> = {
  super_administrador: PERMISSOES_CRM.map((permissao) => permissao.chave),
  administrador_sistema: PERMISSOES_CRM.map((permissao) => permissao.chave),
  administrador_empresa: PERMISSOES_CRM.map((permissao) => permissao.chave),
  supervisor: PERMISSOES_CRM.map((permissao) => permissao.chave).filter(
    (chave) => chave !== 'crm.funil.gerenciar',
  ),
  colaborador: [
    'crm.visualizar',
    'crm.interacoes.criar',
    'crm.oportunidades.criar',
  ],
};

// Execução incremental: não cria EmpresaModulo, empresas, usuários ou perfis.
export async function seedCrm(prisma: PrismaClient) {
  if (
    process.env.ALLOW_DATABASE_SEED !== 'true' ||
    process.env.NODE_ENV?.toLowerCase() === 'production'
  )
    throw new Error('Seed CRM não autorizado.');

  const [banco] = await prisma.$queryRaw<
    Array<{ nome: string }>
  >`SELECT current_database() AS nome`;
  if (banco.nome !== 'sistema_gestao_teste')
    throw new Error('Seed CRM restrito ao banco de teste.');

  return prisma.$transaction(
    async (tx) => {
      await tx.moduloSistema.upsert({
        where: { chave: 'crm' },
        create: {
          nome: 'CRM',
          chave: 'crm',
          descricao: 'Gestão de relacionamento com clientes e oportunidades',
          ativo: true,
        },
        update: {
          nome: 'CRM',
          descricao: 'Gestão de relacionamento com clientes e oportunidades',
          ativo: true,
        },
      });

      for (const permissao of PERMISSOES_CRM) {
        await tx.permissao.upsert({
          where: { chave: permissao.chave },
          create: { ...permissao, ativo: true },
          update: { ...permissao, ativo: true },
        });
      }

      const [perfis, permissoes] = await Promise.all([
        tx.perfil.findMany({
          where: {
            sistema: true,
            ativo: true,
            OR: [
              {
                escopo: 'SISTEMA',
                empresaId: null,
                chave: { in: ['super_administrador', 'administrador_sistema'] },
              },
              {
                escopo: 'EMPRESA',
                empresaId: { not: null },
                chave: {
                  in: ['administrador_empresa', 'supervisor', 'colaborador'],
                },
              },
            ],
          },
          select: { id: true, chave: true },
        }),
        tx.permissao.findMany({
          where: { chave: { in: PERMISSOES_CRM.map((p) => p.chave) } },
          select: { id: true, chave: true },
        }),
      ]);
      const permissoesPorChave = new Map(
        permissoes.map((permissao) => [permissao.chave, permissao]),
      );
      const alterados: string[] = [];

      for (const perfil of perfis) {
        let mudou = false;
        for (const chave of PERMISSOES_CRM_POR_PERFIL[perfil.chave] ?? []) {
          const permissao = permissoesPorChave.get(chave);
          if (!permissao)
            throw new Error(`Permissão CRM não encontrada: ${chave}`);
          const existente = await tx.perfilPermissao.findUnique({
            where: {
              perfilId_permissaoId: {
                perfilId: perfil.id,
                permissaoId: permissao.id,
              },
            },
          });
          if (!existente) {
            await tx.perfilPermissao.create({
              data: {
                perfilId: perfil.id,
                permissaoId: permissao.id,
                permitido: true,
              },
            });
            mudou = true;
          } else if (!existente.permitido) {
            await tx.perfilPermissao.update({
              where: { id: existente.id },
              data: { permitido: true },
            });
            mudou = true;
          }
        }
        if (mudou) alterados.push(perfil.id);
      }

      const usuarios = await tx.usuarioPerfil.findMany({
        where: { perfilId: { in: alterados }, ativo: true },
        select: { usuarioId: true },
      });
      const ids = [...new Set(usuarios.map((usuario) => usuario.usuarioId))];
      if (ids.length)
        await tx.usuario.updateMany({
          where: { id: { in: ids } },
          data: { versaoAutorizacao: { increment: 1 } },
        });
      return {
        perfisAlterados: alterados.length,
        usuariosRevogados: ids.length,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedCrm(prisma)
    .then((resultado) => console.info(resultado))
    .catch(() => {
      console.error('Falha ao executar seed incremental de CRM.');
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
