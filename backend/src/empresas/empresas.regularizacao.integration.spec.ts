import { PrismaClient } from '@prisma/client';
import { EmpresasService } from './empresas.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import {
  comContextoReset,
  criarClienteIntegracao,
  validarClienteIntegracao,
  type ContextoReset,
} from '../usuarios/testing/reset-manual-database-fixtures';
import {
  integracaoHabilitada,
  obterUrlIntegracao,
} from './testing/validade-comercial-database-fixtures';

const executarIntegracao = integracaoHabilitada() ? describe : describe.skip;

const IP = '203.0.113.10';
const PREFIXO_TESTE = 'IT VC ';

function atorDe(contexto: ContextoReset): AuthenticatedUser {
  return {
    id: contexto.ator.id,
    email: contexto.ator.email,
    tipo: 'SUPER_ADMIN',
    empresaId: null,
    versaoAutorizacao: contexto.ator.versaoAutorizacao,
    perfis: ['super_administrador'],
    permissoes: [],
  };
}

function criarServico(prisma: PrismaClient): EmpresasService {
  return new EmpresasService(prisma as unknown as PrismaService);
}

async function limparAuditoriaEmpresa(
  prisma: PrismaClient,
  empresaId: string,
): Promise<void> {
  await prisma.auditoriaLog.deleteMany({ where: { empresaId } });
}

async function definirValidade(
  prisma: PrismaClient,
  empresaId: string,
  inicio: Date | null,
  fim: Date | null,
  ativa = true,
): Promise<void> {
  await prisma.empresa.update({
    where: { id: empresaId },
    data: {
      ativa,
      validadeComercialInicio: inicio,
      validadeComercialFim: fim,
    },
  });
}

executarIntegracao(
  'Regularização comercial â€” integração real PostgreSQL (V3.6.4)',
  () => {
    jest.setTimeout(300_000);

    let url: string;

    beforeAll(() => {
      url = obterUrlIntegracao()!;
    });

    describe('schema e compatibilidade', () => {
      it('confirma colunas comerciais, constraints e índice', async () => {
        const prisma = criarClienteIntegracao(url);
        await validarClienteIntegracao(prisma);

        const colunas = await prisma.$queryRaw<
          Array<{ column_name: string; is_nullable: string; data_type: string }>
        >`
          SELECT column_name, is_nullable, data_type
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'Empresa'
            AND column_name IN ('validadeComercialInicio', 'validadeComercialFim')
          ORDER BY column_name
        `;
        expect(colunas).toHaveLength(2);
        for (const coluna of colunas) {
          expect(coluna.is_nullable).toBe('YES');
          expect(coluna.data_type).toBe('timestamp without time zone');
        }

        const indices = await prisma.$queryRaw<Array<{ indexname: string }>>`
          SELECT indexname
          FROM pg_indexes
          WHERE schemaname = current_schema()
            AND tablename = 'Empresa'
            AND indexname = 'Empresa_validadeComercialFim_idx'
        `;
        expect(indices).toHaveLength(1);

        const constraints = await prisma.$queryRaw<
          Array<{ conname: string; contype: string }>
        >`
          SELECT conname, contype
          FROM pg_constraint
          WHERE conrelid = '"Empresa"'::regclass
            AND conname IN (
              'Empresa_validade_comercial_par_check',
              'Empresa_validade_comercial_intervalo_check'
            )
          ORDER BY conname
        `;
        expect(constraints).toHaveLength(2);

        await prisma.$disconnect();
      });

      it('rejeita par incompleto (apenas início)', async () => {
        const prisma = criarClienteIntegracao(url);
        await validarClienteIntegracao(prisma);

        const empresa = await prisma.empresa.create({
          data: { nome: `${PREFIXO_TESTE}SCHEMA_PAR` },
        });

        let erro: unknown;
        try {
          await prisma.empresa.update({
            where: { id: empresa.id },
            data: { validadeComercialInicio: new Date() },
          });
        } catch (e) {
          erro = e;
        }
        expect(erro).toBeDefined();

        await limparAuditoriaEmpresa(prisma, empresa.id);
        await prisma.empresa.delete({ where: { id: empresa.id } });
        await prisma.$disconnect();
      });

      it('rejeita fim igual ou anterior ao início', async () => {
        const prisma = criarClienteIntegracao(url);
        await validarClienteIntegracao(prisma);

        const empresa = await prisma.empresa.create({
          data: { nome: `${PREFIXO_TESTE}SCHEMA_INTERVALO` },
        });
        const agora = new Date();

        let erroIgual: unknown;
        try {
          await prisma.empresa.update({
            where: { id: empresa.id },
            data: {
              validadeComercialInicio: agora,
              validadeComercialFim: agora,
            },
          });
        } catch (e) {
          erroIgual = e;
        }
        expect(erroIgual).toBeDefined();

        await limparAuditoriaEmpresa(prisma, empresa.id);
        await prisma.empresa.delete({ where: { id: empresa.id } });
        await prisma.$disconnect();
      });
    });

    describe('situações comerciais (persistência)', () => {
      it('empresa legada NULL/NULL permanece sem validade limitada', async () => {
        await comContextoReset(url, async (contexto) => {
          const empresa = await contexto.prisma.empresa.findUnique({
            where: { id: contexto.empresaId },
          });
          expect(empresa?.validadeComercialInicio).toBeNull();
          expect(empresa?.validadeComercialFim).toBeNull();
        });
      });

      it('persiste e recupera validade vigente', async () => {
        await comContextoReset(url, async (contexto) => {
          const inicio = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const fim = new Date(Date.now() + 24 * 60 * 60 * 1000);
          await definirValidade(
            contexto.prisma,
            contexto.empresaId,
            inicio,
            fim,
          );

          const empresa = await contexto.prisma.empresa.findUnique({
            where: { id: contexto.empresaId },
          });
          expect(empresa?.validadeComercialInicio?.getTime()).toBe(
            inicio.getTime(),
          );
          expect(empresa?.validadeComercialFim?.getTime()).toBe(fim.getTime());
          expect(empresa?.ativa).toBe(true);
        });
      });

      it('persiste e recupera validade expirada', async () => {
        await comContextoReset(url, async (contexto) => {
          const inicio = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
          const fim = new Date(Date.now() - 24 * 60 * 60 * 1000);
          await definirValidade(
            contexto.prisma,
            contexto.empresaId,
            inicio,
            fim,
          );

          const empresa = await contexto.prisma.empresa.findUnique({
            where: { id: contexto.empresaId },
          });
          expect(empresa?.validadeComercialFim!.getTime()).toBeLessThan(
            Date.now(),
          );
        });
      });

      it('persiste e recupera início futuro', async () => {
        await comContextoReset(url, async (contexto) => {
          const inicio = new Date(Date.now() + 24 * 60 * 60 * 1000);
          const fim = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
          await definirValidade(
            contexto.prisma,
            contexto.empresaId,
            inicio,
            fim,
          );

          const empresa = await contexto.prisma.empresa.findUnique({
            where: { id: contexto.empresaId },
          });
          expect(empresa?.validadeComercialInicio!.getTime()).toBeGreaterThan(
            Date.now(),
          );
        });
      });

      it('persiste suspensão administrativa (ativa=false) com validade vigente', async () => {
        await comContextoReset(url, async (contexto) => {
          const inicio = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const fim = new Date(Date.now() + 24 * 60 * 60 * 1000);
          await definirValidade(
            contexto.prisma,
            contexto.empresaId,
            inicio,
            fim,
            false,
          );

          const empresa = await contexto.prisma.empresa.findUnique({
            where: { id: contexto.empresaId },
          });
          expect(empresa?.ativa).toBe(false);
          expect(empresa?.validadeComercialInicio).not.toBeNull();
          expect(empresa?.validadeComercialFim).not.toBeNull();
        });
      });
    });

    describe('regularização real', () => {
      it('persiste nova validade e registra auditoria na mesma transação', async () => {
        await comContextoReset(url, async (contexto) => {
          const servico = criarServico(contexto.prisma);
          const ator = atorDe(contexto);

          const antes = await contexto.prisma.empresa.findUnique({
            where: { id: contexto.empresaId },
          });
          expect(antes?.validadeComercialInicio).toBeNull();
          expect(antes?.validadeComercialFim).toBeNull();

          const resultado = await servico.regularizar(
            contexto.empresaId,
            {
              diasValidade: 30,
              motivo: 'Contrato regularizado (integração)',
            },
            ator,
            IP,
          );

          expect(resultado.validadeComercialInicio).toBeInstanceOf(Date);
          expect(resultado.validadeComercialFim).toBeInstanceOf(Date);
          expect(
            resultado.validadeComercialFim!.getTime() -
              resultado.validadeComercialInicio!.getTime(),
          ).toBe(30 * 24 * 60 * 60 * 1000);

          const depois = await contexto.prisma.empresa.findUnique({
            where: { id: contexto.empresaId },
          });
          expect(depois?.validadeComercialInicio).not.toBeNull();
          expect(depois?.validadeComercialFim).not.toBeNull();
          expect(depois?.ativa).toBe(true);

          const auditorias = await contexto.prisma.auditoriaLog.findMany({
            where: {
              entidade: 'Empresa',
              entidadeId: contexto.empresaId,
              acao: 'REGULARIZACAO_COMERCIAL',
            },
            orderBy: { createdAt: 'desc' },
          });
          expect(auditorias.length).toBeGreaterThanOrEqual(1);
          const ultima = auditorias[0];
          expect(ultima.usuarioId).toBe(ator.id);
          expect(ultima.empresaId).toBe(contexto.empresaId);
          expect(ultima.ip).toBe(IP);
          const dadosNovos = ultima.dadosNovos as Record<string, unknown>;
          expect(dadosNovos.motivo).toBe('Contrato regularizado (integração)');
          expect(dadosNovos.diasValidade).toBe(30);

          await limparAuditoriaEmpresa(contexto.prisma, contexto.empresaId);
        });
      });

      it('preserva Empresa.ativa, usuários e versaoAutorizacao', async () => {
        await comContextoReset(url, async (contexto) => {
          const usuarioAntes = await contexto.prisma.usuario.findUnique({
            where: { id: contexto.alvo.id },
          });

          await definirValidade(
            contexto.prisma,
            contexto.empresaId,
            null,
            null,
            false,
          );

          const servico = criarServico(contexto.prisma);
          const ator = atorDe(contexto);
          await servico.regularizar(
            contexto.empresaId,
            { diasValidade: 15, motivo: 'Preservação (integração)' },
            ator,
          );

          const empresaDepois = await contexto.prisma.empresa.findUnique({
            where: { id: contexto.empresaId },
          });
          const usuarioDepois = await contexto.prisma.usuario.findUnique({
            where: { id: contexto.alvo.id },
          });

          expect(empresaDepois?.ativa).toBe(false);
          expect(usuarioDepois?.versaoAutorizacao).toBe(
            usuarioAntes?.versaoAutorizacao,
          );
          expect(usuarioDepois?.ativo).toBe(usuarioAntes?.ativo);

          await limparAuditoriaEmpresa(contexto.prisma, contexto.empresaId);
        });
      });

      it('falha na auditoria provoca rollback da alteração comercial', async () => {
        await comContextoReset(url, async (contexto) => {
          const servico = criarServico(contexto.prisma);
          const ator = atorDe(contexto);

          const antes = await contexto.prisma.empresa.findUnique({
            where: { id: contexto.empresaId },
          });

          const TRIGGER = 'it_vc_rollback_fail_audit_trg';
          const FUNCAO = 'it_vc_rollback_fail_audit_fn';

          await contexto.prisma.$executeRawUnsafe(
            'CREATE OR REPLACE FUNCTION "' +
              FUNCAO +
              '"() RETURNS trigger AS $$\n' +
              'BEGIN\n' +
              "  RAISE EXCEPTION 'falha simulada na auditoria';\n" +
              'END;\n' +
              '$$ LANGUAGE plpgsql;',
          );
          await contexto.prisma.$executeRawUnsafe(
            'CREATE TRIGGER "' +
              TRIGGER +
              '" ' +
              'BEFORE INSERT ON "AuditoriaLog" ' +
              'FOR EACH ROW EXECUTE FUNCTION "' +
              FUNCAO +
              '"();',
          );

          let erro: unknown;
          try {
            await servico.regularizar(
              contexto.empresaId,
              { diasValidade: 20, motivo: 'Rollback (integracao)' },
              ator,
            );
          } catch (e) {
            erro = e;
          } finally {
            await contexto.prisma.$executeRawUnsafe(
              'DROP TRIGGER IF EXISTS "' + TRIGGER + '" ON "AuditoriaLog"',
            );
            await contexto.prisma.$executeRawUnsafe(
              'DROP FUNCTION IF EXISTS "' + FUNCAO + '"()',
            );
          }

          expect(erro).toBeDefined();

          const depois = await contexto.prisma.empresa.findUnique({
            where: { id: contexto.empresaId },
          });
          expect(depois?.validadeComercialInicio).toBe(
            antes?.validadeComercialInicio ?? null,
          );
          expect(depois?.validadeComercialFim).toBe(
            antes?.validadeComercialFim ?? null,
          );

          const auditorias = await contexto.prisma.auditoriaLog.count({
            where: {
              entidade: 'Empresa',
              entidadeId: contexto.empresaId,
              acao: 'REGULARIZACAO_COMERCIAL',
            },
          });
          expect(auditorias).toBe(0);

          await limparAuditoriaEmpresa(contexto.prisma, contexto.empresaId);
        });
      });
    });

    describe('isolamento multiempresa', () => {
      it('regularização de uma empresa não altera a outra', async () => {
        await comContextoReset(url, async (contexto) => {
          const segundaEmpresa = await contexto.prisma.empresa.create({
            data: { nome: `${contexto.prefixo}EMPRESA_2` },
          });
          const segundoUsuario = await contexto.prisma.usuario.create({
            data: {
              nome: `${contexto.prefixo}USUARIO_2`,
              email: `${contexto.prefixo.toLowerCase()}u2@teste.local`,
              senha: 'hash-teste',
              tipo: 'USUARIO_EMPRESA',
              ativo: true,
              empresaId: segundaEmpresa.id,
              versaoAutorizacao: 0,
              trocaSenhaObrigatoria: false,
            },
          });

          const servico = criarServico(contexto.prisma);
          const ator = atorDe(contexto);

          const antesSegunda = await contexto.prisma.empresa.findUnique({
            where: { id: segundaEmpresa.id },
          });

          await servico.regularizar(
            contexto.empresaId,
            { diasValidade: 10, motivo: 'Isolamento (integração)' },
            ator,
          );

          const depoisSegunda = await contexto.prisma.empresa.findUnique({
            where: { id: segundaEmpresa.id },
          });
          expect(depoisSegunda?.validadeComercialInicio).toBe(
            antesSegunda?.validadeComercialInicio,
          );
          expect(depoisSegunda?.validadeComercialFim).toBe(
            antesSegunda?.validadeComercialFim,
          );

          const auditoriasOutra = await contexto.prisma.auditoriaLog.count({
            where: { empresaId: segundaEmpresa.id },
          });
          expect(auditoriasOutra).toBe(0);

          await limparAuditoriaEmpresa(contexto.prisma, contexto.empresaId);
          await limparAuditoriaEmpresa(contexto.prisma, segundaEmpresa.id);
          await contexto.prisma.usuario.delete({
            where: { id: segundoUsuario.id },
          });
          await contexto.prisma.empresa.delete({
            where: { id: segundaEmpresa.id },
          });
        });
      });
    });

    describe('concorrência e lock', () => {
      it('duas regularizações concorrentes sobre a mesma empresa são serializadas', async () => {
        await comContextoReset(url, async (contexto) => {
          const servico = criarServico(contexto.prisma);
          const ator = atorDe(contexto);

          const [r1, r2] = await Promise.all([
            servico.regularizar(
              contexto.empresaId,
              { diasValidade: 5, motivo: 'Concorrência A' },
              ator,
            ),
            servico.regularizar(
              contexto.empresaId,
              { diasValidade: 7, motivo: 'Concorrência B' },
              ator,
            ),
          ]);

          expect(r1.validadeComercialFim).toBeInstanceOf(Date);
          expect(r2.validadeComercialFim).toBeInstanceOf(Date);

          const auditorias = await contexto.prisma.auditoriaLog.findMany({
            where: {
              entidade: 'Empresa',
              entidadeId: contexto.empresaId,
              acao: 'REGULARIZACAO_COMERCIAL',
            },
            orderBy: { createdAt: 'asc' },
          });
          expect(auditorias.length).toBeGreaterThanOrEqual(2);

          await limparAuditoriaEmpresa(contexto.prisma, contexto.empresaId);
        });
      });
    });
  },
);
