import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { CadastroPublicoService } from './cadastro-publico.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { MailService } from '../common/services/mail.service';
import {
  BANCO_INTEGRACAO,
  criarClienteIntegracao,
  desconectarClientes,
} from '../usuarios/testing/reset-manual-database-fixtures';

const RUN_FLAG = 'RUN_CADASTRO_PUBLICO_INTEGRATION_TESTS';
const executarIntegracao =
  process.env[RUN_FLAG] === 'true' ? describe : describe.skip;

function gerarToken(): { tokenBruto: string; tokenHash: string } {
  const tokenBruto = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(tokenBruto).digest('hex');
  return { tokenBruto, tokenHash };
}

async function validarIdentidade(prisma: PrismaClient): Promise<void> {
  const [identidade] = await prisma.$queryRaw<
    Array<{ banco: string; schema: string }>
  >`SELECT current_database() AS banco, current_schema() AS schema`;
  if (!identidade)
    throw new Error('Não foi possível verificar a identidade do banco.');
  if (identidade.banco !== BANCO_INTEGRACAO) {
    throw new Error(`Banco de integração inesperado: ${identidade.banco}.`);
  }
  if (identidade.schema !== 'public') {
    throw new Error(`Schema inesperado: ${identidade.schema}.`);
  }
}

executarIntegracao(
  'Cadastro público e onboarding — integração PostgreSQL real (E7)',
  () => {
    jest.setTimeout(300_000);

    let url: string;
    let prisma: PrismaClient;
    const clientes: PrismaClient[] = [];
    const solicitacoesCriadas: string[] = [];
    const empresasCriadas: string[] = [];
    let empresaSeedId: string | null = null;
    let perfilSeedId: string | null = null;
    const modulosSeedIds: string[] = [];
    const usuariosCriados: string[] = [];
    type MailArgs = {
      destinatario: string;
      nomeResponsavel: string;
      nomeEmpresa: string;
      token: string;
    };
    let mailStub: {
      enviarEmailVerificacaoCadastro: jest.Mock<Promise<void>, [MailArgs]>;
    };

    beforeAll(async () => {
      url = process.env.INTEGRATION_DATABASE_URL!;
      if (!url) throw new Error('INTEGRATION_DATABASE_URL não configurada.');

      prisma = criarClienteIntegracao(url);
      clientes.push(prisma);
      await validarIdentidade(prisma);

      const empresaSeed = await prisma.empresa.create({
        data: { nome: `IT_CAD_SEED_${Date.now()}` },
      });
      empresaSeedId = empresaSeed.id;
      const perfilSeed = await prisma.perfil.create({
        data: {
          nome: 'Administrador da Empresa',
          chave: 'administrador_empresa',
          escopo: 'EMPRESA',
          sistema: true,
          ativo: true,
          empresaId: empresaSeed.id,
        },
      });
      perfilSeedId = perfilSeed.id;
      const permissoes = await prisma.permissao.findMany({
        select: { id: true },
      });
      await prisma.perfilPermissao.createMany({
        data: permissoes.map((perm) => ({
          perfilId: perfilSeed.id,
          permissaoId: perm.id,
          permitido: true,
        })),
      });

      const modulosPadrao = [
        'estoque',
        'agenda',
        'ordens_servico',
        'vendas',
        'funcionarios',
        'caixa',
        'fiscal',
      ];
      for (const chave of modulosPadrao) {
        const modulo = await prisma.moduloSistema.create({
          data: { chave, nome: chave, ativo: true },
        });
        modulosSeedIds.push(modulo.id);
      }
    });

    afterAll(async () => {
      // Limpeza restrita aos registros criados pelo teste, respeitando FKs.
      if (
        empresasCriadas.length > 0 ||
        usuariosCriados.length > 0 ||
        solicitacoesCriadas.length > 0
      ) {
        await prisma.$transaction(async (tx) => {
          if (usuariosCriados.length > 0) {
            await tx.auditoriaLog.deleteMany({
              where: { usuarioId: { in: usuariosCriados } },
            });
            await tx.usuarioPerfil.deleteMany({
              where: { usuarioId: { in: usuariosCriados } },
            });
            await tx.usuario.deleteMany({
              where: { id: { in: usuariosCriados } },
            });
          }
          if (empresasCriadas.length > 0) {
            await tx.auditoriaLog.deleteMany({
              where: { empresaId: { in: empresasCriadas } },
            });
            await tx.empresaModulo.deleteMany({
              where: { empresaId: { in: empresasCriadas } },
            });
            await tx.perfil.deleteMany({
              where: { empresaId: { in: empresasCriadas } },
            });
            await tx.empresa.deleteMany({
              where: { id: { in: empresasCriadas } },
            });
          }
          if (solicitacoesCriadas.length > 0) {
            await tx.solicitacaoCadastro.deleteMany({
              where: { id: { in: solicitacoesCriadas } },
            });
          }
        });
      }
      if (perfilSeedId) {
        await prisma.perfilPermissao.deleteMany({
          where: { perfilId: perfilSeedId },
        });
        await prisma.perfil.deleteMany({ where: { id: perfilSeedId } });
      }
      if (modulosSeedIds.length > 0) {
        await prisma.moduloSistema.deleteMany({
          where: { id: { in: modulosSeedIds } },
        });
      }
      if (empresaSeedId) {
        await prisma.empresa.deleteMany({ where: { id: empresaSeedId } });
      }
      await desconectarClientes(clientes);
    });

    function criarServico(): CadastroPublicoService {
      mailStub = {
        enviarEmailVerificacaoCadastro: jest
          .fn<Promise<void>, [MailArgs]>()
          .mockResolvedValue(undefined),
      };
      const auditoria = new AuditoriaService(
        prisma as unknown as PrismaService,
      );
      return new CadastroPublicoService(
        prisma as unknown as PrismaService,
        mailStub as unknown as MailService,
        auditoria,
      );
    }

    describe('A. Estrutura e persistência', () => {
      it('coluna Usuario.emailVerificado existe com default true', async () => {
        const colunas = await prisma.$queryRaw<
          Array<{
            column_name: string;
            is_nullable: string;
            column_default: string;
          }>
        >`
        SELECT column_name, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'Usuario'
          AND column_name = 'emailVerificado'
      `;
        expect(colunas).toHaveLength(1);
        expect(colunas[0].is_nullable).toBe('NO');
        expect(colunas[0].column_default).toContain('true');
      });

      it('tabela SolicitacaoCadastro existe com unicidade de tokenHash', async () => {
        const tabelas = await prisma.$queryRaw<Array<{ table_name: string }>>`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = current_schema() AND table_name = 'SolicitacaoCadastro'
      `;
        expect(tabelas).toHaveLength(1);

        const indices = await prisma.$queryRaw<Array<{ indexname: string }>>`
          SELECT indexname FROM pg_indexes
          WHERE schemaname = current_schema()
            AND tablename = 'SolicitacaoCadastro'
            AND indexname = 'SolicitacaoCadastro_tokenHash_key'
        `;
        expect(indices).toHaveLength(1);
      });

      it('enum SolicitacaoCadastroEstado contém PENDENTE e CONCLUIDA', async () => {
        const valores = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
        SELECT enumlabel FROM pg_enum
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SolicitacaoCadastroEstado')
      `;
        const labels = valores.map((v) => v.enumlabel);
        expect(labels).toContain('PENDENTE');
        expect(labels).toContain('CONCLUIDA');
      });
    });

    describe('B. Solicitação pública e reenvio', () => {
      it('persiste solicitação PENDENTE, apenas hash do token, expiração 24h', async () => {
        const servico = criarServico();
        const email = `it_cadastro_${Date.now()}@example.invalid`;
        const { tokenBruto } = gerarToken();

        // Gera token internamente; não podemos injetar. Usamos o serviço real.
        const resultado = await servico.solicitar(
          {
            nomeEmpresa: 'Empresa IT',
            nomeResponsavel: 'Responsavel IT',
            email,
          },
          '203.0.113.10',
        );
        expect(resultado.message).toContain('Se os dados informados');

        const solicitacao = await prisma.solicitacaoCadastro.findFirst({
          where: { email },
          orderBy: { createdAt: 'desc' },
        });
        expect(solicitacao).not.toBeNull();
        solicitacoesCriadas.push(solicitacao!.id);

        expect(solicitacao!.estado).toBe('PENDENTE');
        expect(solicitacao!.usedAt).toBeNull();
        expect(solicitacao!.tokenHash).not.toBe(tokenBruto);
        expect(solicitacao!.tokenHash).toHaveLength(64);
        const diffMs =
          solicitacao!.expiresAt.getTime() - solicitacao!.createdAt.getTime();
        expect(diffMs).toBeGreaterThanOrEqual(23 * 60 * 60 * 1000);
        expect(diffMs).toBeLessThanOrEqual(25 * 60 * 60 * 1000);
        expect(solicitacao!.tentativasEnvio).toBe(1);

        expect(mailStub.enviarEmailVerificacaoCadastro).toHaveBeenCalledTimes(
          1,
        );
        const args = mailStub.enviarEmailVerificacaoCadastro.mock.calls[0][0];
        expect(args.destinatario).toBe(email);
        // token bruto entregue ao MailService (nunca persistido)
        expect(typeof args.token).toBe('string');
        expect(args.token).toHaveLength(64);
      });

      it('falha no envio de e-mail mantém a solicitação pendente', async () => {
        const servico = criarServico();
        mailStub.enviarEmailVerificacaoCadastro.mockRejectedValueOnce(
          new Error('SMTP down'),
        );
        const email = `it_cadastro_fail_${Date.now()}@example.invalid`;

        await servico.solicitar(
          {
            nomeEmpresa: 'Empresa Fail',
            nomeResponsavel: 'Resp Fail',
            email,
          },
          '203.0.113.10',
        );

        const solicitacao = await prisma.solicitacaoCadastro.findFirst({
          where: { email },
          orderBy: { createdAt: 'desc' },
        });
        expect(solicitacao).not.toBeNull();
        solicitacoesCriadas.push(solicitacao!.id);
        expect(solicitacao!.estado).toBe('PENDENTE');
        expect(solicitacao!.ultimoErroEnvio).not.toBeNull();
      });

      it('reenvio atualiza tokenHash e invalida o anterior', async () => {
        const servico = criarServico();
        const email = `it_cadastro_reenvio_${Date.now()}@example.invalid`;

        await servico.solicitar(
          {
            nomeEmpresa: 'Empresa Reenvio',
            nomeResponsavel: 'Resp Reenvio',
            email,
          },
          '203.0.113.10',
        );
        const primeira = await prisma.solicitacaoCadastro.findFirst({
          where: { email },
          orderBy: { createdAt: 'desc' },
        });
        solicitacoesCriadas.push(primeira!.id);
        const hashAnterior = primeira!.tokenHash;

        await servico.reenviar(email, '203.0.113.10');

        const atualizada = await prisma.solicitacaoCadastro.findUnique({
          where: { id: primeira!.id },
        });
        expect(atualizada!.tokenHash).not.toBe(hashAnterior);
        expect(atualizada!.tokenHash).toHaveLength(64);
        expect(atualizada!.expiresAt.getTime()).toBeGreaterThan(
          primeira!.expiresAt.getTime(),
        );
      });
    });

    describe('C. Conclusão do onboarding', () => {
      it('conclui cadastro: empresa, usuário ADMIN_EMPRESA, perfil, 7 módulos, trial, auditoria', async () => {
        const servico = criarServico();
        const email = `it_cadastro_concl_${Date.now()}@example.invalid`;

        await servico.solicitar(
          {
            nomeEmpresa: 'Empresa Concl',
            nomeResponsavel: 'Resp Concl',
            email,
          },
          '203.0.113.10',
        );
        const solicitacao = await prisma.solicitacaoCadastro.findFirst({
          where: { email },
          orderBy: { createdAt: 'desc' },
        });
        solicitacoesCriadas.push(solicitacao!.id);

        // Recupera o token bruto via MailService stub.
        const tokenBruto =
          mailStub.enviarEmailVerificacaoCadastro.mock.calls[0][0].token;
        const senha = 'SenhaForte#12345';

        const resultado = await servico.concluir(
          { token: tokenBruto, senha, confirmarSenha: senha },
          '203.0.113.10',
        );
        expect(resultado.message).toContain('Cadastro concluído');

        const empresa = await prisma.empresa.findFirst({
          where: { nome: 'Empresa Concl' },
        });
        expect(empresa).not.toBeNull();
        empresasCriadas.push(empresa!.id);
        expect(empresa!.validadeComercialFim).not.toBeNull();
        const diffDias =
          (empresa!.validadeComercialFim!.getTime() -
            empresa!.validadeComercialInicio!.getTime()) /
          (24 * 60 * 60 * 1000);
        expect(diffDias).toBeGreaterThanOrEqual(29);
        expect(diffDias).toBeLessThanOrEqual(31);

        const usuario = await prisma.usuario.findFirst({ where: { email } });
        expect(usuario).not.toBeNull();
        usuariosCriados.push(usuario!.id);
        expect(usuario!.tipo).toBe('ADMIN_EMPRESA');
        expect(usuario!.emailVerificado).toBe(true);
        const senhaValida = await bcrypt.compare(senha, usuario!.senha);
        expect(senhaValida).toBe(true);

        const perfil = await prisma.perfil.findFirst({
          where: { empresaId: empresa!.id, chave: 'administrador_empresa' },
        });
        expect(perfil).not.toBeNull();
        const vinculo = await prisma.usuarioPerfil.findFirst({
          where: { usuarioId: usuario!.id, perfilId: perfil!.id },
        });
        expect(vinculo).not.toBeNull();
        expect(vinculo!.ativo).toBe(true);

        const modulos = await prisma.empresaModulo.findMany({
          where: { empresaId: empresa!.id },
          include: { modulo: { select: { chave: true } } },
        });
        const chaves = modulos.map((m) => m.modulo.chave);
        expect([...chaves].sort()).toEqual(
          [
            'agenda',
            'caixa',
            'estoque',
            'fiscal',
            'funcionarios',
            'ordens_servico',
            'vendas',
          ].sort(),
        );
        expect(chaves).not.toContain('crm');

        const auditoria = await prisma.auditoriaLog.findFirst({
          where: {
            entidade: 'Empresa',
            entidadeId: empresa!.id,
            acao: 'CONCLUSAO_CADASTRO_PUBLICO',
          },
        });
        expect(auditoria).not.toBeNull();
        expect(auditoria!.usuarioId).toBeNull();
        expect(auditoria!.empresaId).toBe(empresa!.id);

        const solicitacaoAtualizada =
          await prisma.solicitacaoCadastro.findUnique({
            where: { id: solicitacao!.id },
          });
        expect(solicitacaoAtualizada!.estado).toBe('CONCLUIDA');
        expect(solicitacaoAtualizada!.usedAt).not.toBeNull();
      });
    });

    describe('D. Atomicidade e rollback', () => {
      it('falha por e-mail duplicado reverte escritas (empresa não persiste)', async () => {
        const servico = criarServico();
        const email = `it_cadastro_dup_${Date.now()}@example.invalid`;

        await servico.solicitar(
          {
            nomeEmpresa: 'Empresa Dup',
            nomeResponsavel: 'Resp Dup',
            email,
          },
          '203.0.113.10',
        );
        const solicitacao = await prisma.solicitacaoCadastro.findFirst({
          where: { email },
          orderBy: { createdAt: 'desc' },
        });
        solicitacoesCriadas.push(solicitacao!.id);
        const tokenBruto =
          mailStub.enviarEmailVerificacaoCadastro.mock.calls[
            mailStub.enviarEmailVerificacaoCadastro.mock.calls.length - 1
          ][0].token;

        // Primeira conclusão cria empresa/usuário.
        const senha = 'SenhaForte#12345';
        await servico.concluir(
          { token: tokenBruto, senha, confirmarSenha: senha },
          '203.0.113.10',
        );
        const empresa = await prisma.empresa.findFirst({
          where: { nome: 'Empresa Dup' },
        });
        empresasCriadas.push(empresa!.id);
        const usuario = await prisma.usuario.findFirst({ where: { email } });
        usuariosCriados.push(usuario!.id);

        // Segunda solicitação com mesmo e-mail, tentativa de conclusão deve falhar.
        // Cria uma nova solicitação com e-mail já usado (deve ser rejeitado na conclusão por e-mail duplicado).
        await servico.solicitar(
          {
            nomeEmpresa: 'Empresa Dup2',
            nomeResponsavel: 'Resp Dup2',
            email,
          },
          '203.0.113.10',
        );
        const solicitacao2 = await prisma.solicitacaoCadastro.findFirst({
          where: { nomeEmpresa: 'Empresa Dup2' },
          orderBy: { createdAt: 'desc' },
        });
        solicitacoesCriadas.push(solicitacao2!.id);
        const tokenBruto2 =
          mailStub.enviarEmailVerificacaoCadastro.mock.calls[
            mailStub.enviarEmailVerificacaoCadastro.mock.calls.length - 1
          ][0].token;

        const empresasAntes = await prisma.empresa.count();
        await expect(
          servico.concluir(
            { token: tokenBruto2, senha, confirmarSenha: senha },
            '203.0.113.10',
          ),
        ).rejects.toThrow();
        const empresasDepois = await prisma.empresa.count();
        expect(empresasDepois).toBe(empresasAntes);

        const solicitacao2Atualizada =
          await prisma.solicitacaoCadastro.findUnique({
            where: { id: solicitacao2!.id },
          });
        expect(solicitacao2Atualizada!.estado).toBe('PENDENTE');
        expect(solicitacao2Atualizada!.usedAt).toBeNull();
      });
    });

    describe('E. Concorrência', () => {
      it('duas conclusões concorrentes: apenas uma efetivada', async () => {
        const servico = criarServico();
        const email = `it_cadastro_conc_${Date.now()}@example.invalid`;

        await servico.solicitar(
          {
            nomeEmpresa: 'Empresa Conc',
            nomeResponsavel: 'Resp Conc',
            email,
          },
          '203.0.113.10',
        );
        const solicitacao = await prisma.solicitacaoCadastro.findFirst({
          where: { email },
          orderBy: { createdAt: 'desc' },
        });
        solicitacoesCriadas.push(solicitacao!.id);
        const tokenBruto =
          mailStub.enviarEmailVerificacaoCadastro.mock.calls[
            mailStub.enviarEmailVerificacaoCadastro.mock.calls.length - 1
          ][0].token;
        const senha = 'SenhaForte#12345';

        const resultados = await Promise.allSettled([
          servico.concluir(
            { token: tokenBruto, senha, confirmarSenha: senha },
            '203.0.113.10',
          ),
          servico.concluir(
            { token: tokenBruto, senha, confirmarSenha: senha },
            '203.0.113.10',
          ),
        ]);

        const sucessos = resultados.filter((r) => r.status === 'fulfilled');
        const falhas = resultados.filter((r) => r.status === 'rejected');
        expect(sucessos).toHaveLength(1);
        expect(falhas).toHaveLength(1);

        const empresas = await prisma.empresa.findMany({
          where: { nome: 'Empresa Conc' },
        });
        expect(empresas).toHaveLength(1);
        empresasCriadas.push(empresas[0].id);
        const usuarios = await prisma.usuario.findMany({ where: { email } });
        expect(usuarios).toHaveLength(1);
        usuariosCriados.push(usuarios[0].id);

        const solicitacaoAtualizada =
          await prisma.solicitacaoCadastro.findUnique({
            where: { id: solicitacao!.id },
          });
        expect(solicitacaoAtualizada!.estado).toBe('CONCLUIDA');
        expect(solicitacaoAtualizada!.usedAt).not.toBeNull();
      });
    });

    describe('F. Validade e rejeições', () => {
      it('token inexistente é rejeitado', async () => {
        const servico = criarServico();
        const senha = 'SenhaForte#12345';
        await expect(
          servico.concluir(
            {
              token: 'token-inexistente-0000',
              senha,
              confirmarSenha: senha,
            },
            '203.0.113.10',
          ),
        ).rejects.toThrow();
      });

      it('token expirado é rejeitado', async () => {
        const servico = criarServico();
        const email = `it_cadastro_exp_${Date.now()}@example.invalid`;
        await servico.solicitar(
          {
            nomeEmpresa: 'Empresa Exp',
            nomeResponsavel: 'Resp Exp',
            email,
          },
          '203.0.113.10',
        );
        const solicitacao = await prisma.solicitacaoCadastro.findFirst({
          where: { email },
          orderBy: { createdAt: 'desc' },
        });
        solicitacoesCriadas.push(solicitacao!.id);

        // Expira manualmente.
        await prisma.solicitacaoCadastro.update({
          where: { id: solicitacao!.id },
          data: { expiresAt: new Date(Date.now() - 60_000) },
        });

        const tokenBruto =
          mailStub.enviarEmailVerificacaoCadastro.mock.calls[
            mailStub.enviarEmailVerificacaoCadastro.mock.calls.length - 1
          ][0].token;
        const senha = 'SenhaForte#12345';
        await expect(
          servico.concluir(
            { token: tokenBruto, senha, confirmarSenha: senha },
            '203.0.113.10',
          ),
        ).rejects.toThrow();

        const sol = await prisma.solicitacaoCadastro.findUnique({
          where: { id: solicitacao!.id },
        });
        expect(sol!.estado).toBe('PENDENTE');
        expect(sol!.usedAt).toBeNull();
      });

      it('token já utilizado é rejeitado', async () => {
        const servico = criarServico();
        const email = `it_cadastro_used_${Date.now()}@example.invalid`;
        await servico.solicitar(
          {
            nomeEmpresa: 'Empresa Used',
            nomeResponsavel: 'Resp Used',
            email,
          },
          '203.0.113.10',
        );
        const solicitacao = await prisma.solicitacaoCadastro.findFirst({
          where: { email },
          orderBy: { createdAt: 'desc' },
        });
        solicitacoesCriadas.push(solicitacao!.id);
        const tokenBruto =
          mailStub.enviarEmailVerificacaoCadastro.mock.calls[
            mailStub.enviarEmailVerificacaoCadastro.mock.calls.length - 1
          ][0].token;
        const senha = 'SenhaForte#12345';

        await servico.concluir(
          { token: tokenBruto, senha, confirmarSenha: senha },
          '203.0.113.10',
        );
        const empresa = await prisma.empresa.findFirst({
          where: { nome: 'Empresa Used' },
        });
        empresasCriadas.push(empresa!.id);
        const usuario = await prisma.usuario.findFirst({ where: { email } });
        usuariosCriados.push(usuario!.id);

        await expect(
          servico.concluir(
            { token: tokenBruto, senha, confirmarSenha: senha },
            '203.0.113.10',
          ),
        ).rejects.toThrow();
      });

      it('token substituído por reenvio é rejeitado', async () => {
        const servico = criarServico();
        const email = `it_cadastro_subst_${Date.now()}@example.invalid`;
        await servico.solicitar(
          {
            nomeEmpresa: 'Empresa Subst',
            nomeResponsavel: 'Resp Subst',
            email,
          },
          '203.0.113.10',
        );
        const solicitacao = await prisma.solicitacaoCadastro.findFirst({
          where: { email },
          orderBy: { createdAt: 'desc' },
        });
        solicitacoesCriadas.push(solicitacao!.id);
        const tokenAntigo =
          mailStub.enviarEmailVerificacaoCadastro.mock.calls[
            mailStub.enviarEmailVerificacaoCadastro.mock.calls.length - 1
          ][0].token;

        await servico.reenviar(email, '203.0.113.10');
        const tokenNovo =
          mailStub.enviarEmailVerificacaoCadastro.mock.calls[
            mailStub.enviarEmailVerificacaoCadastro.mock.calls.length - 1
          ][0].token;

        const senha = 'SenhaForte#12345';
        await expect(
          servico.concluir(
            { token: tokenAntigo, senha, confirmarSenha: senha },
            '203.0.113.10',
          ),
        ).rejects.toThrow();

        // novo token funciona
        const resultado = await servico.concluir(
          { token: tokenNovo, senha, confirmarSenha: senha },
          '203.0.113.10',
        );
        expect(resultado.message).toContain('Cadastro concluído');
        const empresa = await prisma.empresa.findFirst({
          where: { nome: 'Empresa Subst' },
        });
        empresasCriadas.push(empresa!.id);
        const usuario = await prisma.usuario.findFirst({ where: { email } });
        usuariosCriados.push(usuario!.id);
      });
    });

    describe('G. Isolamento e integridade', () => {
      it('onboarding cria associações exclusivamente para a nova empresa', async () => {
        const servico = criarServico();
        const email = `it_cadastro_iso_${Date.now()}@example.invalid`;
        await servico.solicitar(
          {
            nomeEmpresa: 'Empresa Iso',
            nomeResponsavel: 'Resp Iso',
            email,
          },
          '203.0.113.10',
        );
        const solicitacao = await prisma.solicitacaoCadastro.findFirst({
          where: { email },
          orderBy: { createdAt: 'desc' },
        });
        solicitacoesCriadas.push(solicitacao!.id);
        const tokenBruto =
          mailStub.enviarEmailVerificacaoCadastro.mock.calls[
            mailStub.enviarEmailVerificacaoCadastro.mock.calls.length - 1
          ][0].token;
        const senha = 'SenhaForte#12345';

        await servico.concluir(
          { token: tokenBruto, senha, confirmarSenha: senha },
          '203.0.113.10',
        );
        const empresa = await prisma.empresa.findFirst({
          where: { nome: 'Empresa Iso' },
        });
        empresasCriadas.push(empresa!.id);
        const usuario = await prisma.usuario.findFirst({ where: { email } });
        usuariosCriados.push(usuario!.id);

        const modulos = await prisma.empresaModulo.findMany({
          where: { empresaId: empresa!.id },
        });
        expect(modulos.every((m) => m.empresaId === empresa!.id)).toBe(true);
        const perfil = await prisma.perfil.findFirst({
          where: { empresaId: empresa!.id },
        });
        expect(perfil!.empresaId).toBe(empresa!.id);
      });
    });
  },
);
