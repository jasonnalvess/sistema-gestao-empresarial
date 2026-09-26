import { Prisma, PrismaClient } from '@prisma/client';
import { NOVAS_PERMISSOES_RH } from './permissoes-rh';

// Execução incremental: não executa bootstrap de empresas, usuários ou demais perfis.
export async function seedRh(prisma: PrismaClient) {
  if (
    process.env.ALLOW_DATABASE_SEED !== 'true' ||
    process.env.NODE_ENV?.toLowerCase() === 'production'
  )
    throw new Error('Seed RH não autorizado.');
  const [banco] = await prisma.$queryRaw<
    Array<{ nome: string }>
  >`SELECT current_database() AS nome`;
  if (banco.nome !== 'sistema_gestao_teste')
    throw new Error('Seed RH restrito ao banco de teste.');
  return prisma.$transaction(
    async (tx) => {
      const existentes = await tx.permissao.findMany({
        where: { modulo: 'funcionarios' },
        select: { chave: true },
      });
      const originais = [
        'funcionarios.visualizar',
        'funcionarios.criar',
        'funcionarios.editar',
        'funcionarios.inativar',
      ];
      if (
        !originais.every((chave) => existentes.some((p) => p.chave === chave))
      )
        throw new Error('Catálogo RH anterior incompleto.');
      for (const permissao of NOVAS_PERMISSOES_RH) {
        await tx.permissao.upsert({
          where: { chave: permissao.chave },
          create: { ...permissao, ativo: true },
          update: {},
        });
      }
      // Somente perfis padrão ativos; perfis personalizados e outras permissões são preservados.
      const perfis = await tx.perfil.findMany({
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
              chave: { in: ['administrador_empresa', 'rh'] },
            },
          ],
        },
        select: { id: true, chave: true },
      });
      const novas = await tx.permissao.findMany({
        where: {
          chave: { in: NOVAS_PERMISSOES_RH.map((p) => p.chave) },
          ativo: true,
        },
        select: { id: true, chave: true },
      });
      const alterados: string[] = [];
      for (const perfil of perfis) {
        let mudou = false;
        for (const permissao of novas) {
          if (
            perfil.chave === 'rh' &&
            permissao.chave === 'funcionarios.acesso.gerenciar'
          )
            continue;
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
          }
        }
        if (mudou) alterados.push(perfil.id);
      }
      // Alterações de autorização invalidam sessões antigas sem alterar credenciais/atividade.
      const usuarios = await tx.usuarioPerfil.findMany({
        where: { perfilId: { in: alterados }, ativo: true },
        select: { usuarioId: true },
      });
      const ids = [...new Set(usuarios.map((u) => u.usuarioId))];
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
  seedRh(prisma)
    .then((resultado) => {
      console.info(resultado);
    })
    .catch(() => {
      console.error('Falha ao executar seed incremental de RH.');
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
