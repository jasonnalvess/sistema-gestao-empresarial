import { AcaoAcessoFuncionario } from './dto/alterar-situacao.dto';
import { ConflictException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { FuncionariosService } from './funcionarios.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

const describeBanco =
  process.env.RUN_RH_DATABASE_TESTS === 'true' ? describe : describe.skip;
describeBanco('V3.4.4 — concorrência em conexões PostgreSQL distintas', () => {
  const prisma = new PrismaClient();
  let empresaId: string;
  let funcionarioId: string;
  let usuarioId: string;
  let atores: AuthenticatedUser[];
  beforeAll(async () => {
    const [db] = await prisma.$queryRaw<
      Array<{ nome: string }>
    >`SELECT current_database() AS nome`;
    if (db.nome !== 'sistema_gestao_teste')
      throw new Error('Execução permitida somente no banco de teste.');
  });
  beforeEach(async () => {
    const empresa = await prisma.empresa.create({
      data: { nome: `RH concorrência ${randomUUID()}` },
    });
    empresaId = empresa.id;
    const permissoes = [
      'funcionarios.situacao.gerenciar',
      'usuarios.ativar',
      'funcionarios.acesso.gerenciar',
      'funcionarios.visualizar',
    ];
    const perfil = await prisma.perfil.create({
      data: {
        empresaId,
        nome: 'Fixture concorrência',
        chave: randomUUID(),
        escopo: 'EMPRESA',
        sistema: false,
      },
    });
    const catalogo = await prisma.permissao.findMany({
      where: { chave: { in: permissoes } },
    });
    expect(catalogo).toHaveLength(4);
    await prisma.perfilPermissao.createMany({
      data: catalogo.map((p) => ({ perfilId: perfil.id, permissaoId: p.id })),
    });
    atores = [];
    for (let i = 0; i < 2; i++) {
      const ator = await prisma.usuario.create({
        data: {
          empresaId,
          nome: 'Ator fixture',
          email: randomUUID() + '@example.invalid',
          senha: 'sem-login',
          tipo: 'ADMIN_EMPRESA',
        },
      });
      await prisma.usuarioPerfil.create({
        data: { usuarioId: ator.id, perfilId: perfil.id },
      });
      atores.push({
        id: ator.id,
        email: ator.email,
        empresaId,
        tipo: ator.tipo,
        versaoAutorizacao: 0,
        permissoes,
      });
    }
    const usuario = await prisma.usuario.create({
      data: {
        empresaId,
        nome: 'Acesso fixture',
        email: randomUUID() + '@example.invalid',
        senha: 'sem-login',
        tipo: 'USUARIO_EMPRESA',
        ativo: true,
      },
    });
    usuarioId = usuario.id;
    const funcionario = await prisma.funcionario.create({
      data: {
        empresaId,
        usuarioId,
        nome: 'Fixture concorrência',
        matricula: randomUUID(),
        dataAdmissao: new Date('2026-01-01'),
        tipoVinculo: 'CLT',
        status: 'ATIVO',
        statusDesde: new Date(),
      },
    });
    funcionarioId = funcionario.id;
  });
  afterEach(async () => {
    if (!empresaId) return;
    // Limpeza apenas das fixtures identificadas, respeitando as FKs RESTRICT.
    await prisma.$transaction(async (tx) => {
      await tx.funcionarioHistorico.deleteMany({ where: { empresaId } });
      await tx.auditoriaLog.deleteMany({ where: { empresaId } });
      await tx.funcionario.deleteMany({ where: { empresaId } });
      await tx.usuarioPerfil.deleteMany({ where: { usuario: { empresaId } } });
      await tx.perfilPermissao.deleteMany({ where: { perfil: { empresaId } } });
      await tx.usuario.deleteMany({ where: { empresaId } });
      await tx.perfil.deleteMany({ where: { empresaId } });
      await tx.empresa.delete({ where: { id: empresaId } });
    });
    expect(await prisma.empresa.count({ where: { id: empresaId } })).toBe(0);
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  function concorrentes() {
    let iniciadas = 0;
    let liberar!: () => void;
    const barreira = new Promise<void>((resolve) => {
      liberar = resolve;
    });
    const adapter = new Proxy(prisma as unknown as PrismaService, {
      get(target, prop) {
        if (prop === '$transaction')
          return async (
            callback: (tx: Prisma.TransactionClient) => Promise<unknown>,
            options: { isolationLevel: Prisma.TransactionIsolationLevel },
          ) =>
            prisma.$transaction(
              async (tx) => {
                const primeiraTentativa = ++iniciadas <= 2;
                if (primeiraTentativa) {
                  // Ambas as transações enxergam a versão inicial antes das escritas.
                  await tx.funcionario.findFirst({
                    where: { id: funcionarioId, empresaId },
                    select: { versaoRegistro: true },
                  });
                  if (iniciadas === 2) liberar();
                  await barreira;
                }
                return callback(tx);
              },
              { ...options, timeout: 15000 },
            );
        const value: unknown = Reflect.get(target, prop);
        return (
          typeof value === 'function' ? value.bind(target) : value
        ) as unknown;
      },
    });
    return {
      rh: new FuncionariosService(adapter),
      usuarios: new UsuariosService(adapter),
    };
  }
  it.each(['INATIVO', 'DESLIGADO'] as const)(
    'ativação concorrente nunca deixa %s com acesso ativo',
    async (status) => {
      const { rh, usuarios } = concorrentes();
      const resultado = await Promise.allSettled([
        rh.alterarSituacao(empresaId, atores[0], funcionarioId, {
          versaoRegistro: 0,
          status,
          ...(status === 'DESLIGADO'
            ? { dataDesligamento: new Date().toISOString().slice(0, 10) }
            : {}),
        }),
        usuarios.ativar(usuarioId, atores[1]),
      ]);
      expect(resultado[0].status).toBe('fulfilled');
      if (resultado[1].status === 'rejected')
        expect(resultado[1].reason).toBeInstanceOf(ConflictException);
      expect(
        await prisma.funcionario.findUniqueOrThrow({
          where: { id: funcionarioId },
        }),
      ).toMatchObject({ status, versaoRegistro: 1 });
      expect(
        (await prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } }))
          .ativo,
      ).toBe(false);
      expect(
        await prisma.funcionarioHistorico.count({
          where: { empresaId, funcionarioId, tipo: 'ALTERACAO_STATUS' },
        }),
      ).toBe(1);
    },
    30000,
  );
  it('duas mudanças com a mesma versão resultam em um sucesso e um 409', async () => {
    const { rh } = concorrentes();
    const resultados = await Promise.allSettled([
      rh.alterarSituacao(empresaId, atores[0], funcionarioId, {
        versaoRegistro: 0,
        status: 'FERIAS',
        acaoAcesso: AcaoAcessoFuncionario.PRESERVAR,
      }),
      rh.alterarSituacao(empresaId, atores[1], funcionarioId, {
        versaoRegistro: 0,
        status: 'LICENCA',
        acaoAcesso: AcaoAcessoFuncionario.PRESERVAR,
      }),
    ]);
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejeitado = resultados.find((r) => r.status === 'rejected');
    expect(rejeitado?.reason).toBeInstanceOf(ConflictException);
    expect(
      (
        await prisma.funcionario.findUniqueOrThrow({
          where: { id: funcionarioId },
        })
      ).versaoRegistro,
    ).toBe(1);
    expect(
      await prisma.funcionarioHistorico.count({
        where: { empresaId, funcionarioId },
      }),
    ).toBe(1);
  }, 30000);
  async function prepararCriacao() {
    await prisma.funcionario.update({
      where: { id: funcionarioId },
      data: { usuarioId: null },
    });
    const p = await prisma.permissao.findUniqueOrThrow({
      where: { chave: 'funcionarios.visualizar' },
    });
    const perfil = await prisma.perfil.create({
      data: {
        empresaId,
        chave: randomUUID(),
        nome: 'Acesso concorrente',
        escopo: 'EMPRESA',
        sistema: false,
        permissoes: { create: { permissaoId: p.id } },
      },
    });
    return {
      versaoRegistro: 0,
      email: randomUUID() + '@example.invalid',
      senhaInicial: 'Senha-fixture-123',
      perfilId: perfil.id,
    };
  }
  it('criação concorrente mantém apenas uma conta nova e um vínculo', async () => {
    const dados = await prepararCriacao();
    const antes = await prisma.usuario.count({ where: { empresaId } });
    const { rh } = concorrentes();
    const resultados = await Promise.allSettled([
      rh.criarAcesso(empresaId, atores[0], funcionarioId, dados),
      rh.criarAcesso(empresaId, atores[1], funcionarioId, {
        ...dados,
        email: randomUUID() + '@example.invalid',
      }),
    ]);
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await prisma.usuario.count({ where: { empresaId } })).toBe(
      antes + 1,
    );
    expect(
      await prisma.funcionarioHistorico.count({
        where: { empresaId, tipo: 'CRIACAO_ACESSO' },
      }),
    ).toBe(1);
  }, 30000);
  it('dois funcionários concorrendo pelo mesmo usuário preservam unique 1:1', async () => {
    await prepararCriacao();
    const outro = await prisma.funcionario.create({
      data: {
        empresaId,
        nome: 'Outro',
        matricula: randomUUID(),
        tipoVinculo: 'CLT',
        status: 'ATIVO',
        statusDesde: new Date(),
        dataAdmissao: new Date('2026-01-01'),
      },
    });
    const { rh } = concorrentes();
    const resultados = await Promise.allSettled([
      rh.vincularAcesso(empresaId, atores[0], funcionarioId, {
        usuarioId,
        versaoRegistro: 0,
      }),
      rh.vincularAcesso(empresaId, atores[1], outro.id, {
        usuarioId,
        versaoRegistro: 0,
      }),
    ]);
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(
      await prisma.funcionario.count({ where: { empresaId, usuarioId } }),
    ).toBe(1);
  }, 30000);
  it.each(['INATIVO', 'DESLIGADO'] as const)(
    'criação/vínculo versus %s nunca associa acesso ativo incompatível',
    async (status) => {
      for (const criar of [true, false]) {
        const dados = await prepararCriacao();
        await prisma.funcionario.update({
          where: { id: funcionarioId },
          data: { status: 'ATIVO', dataDesligamento: null, versaoRegistro: 0 },
        });
        const { rh } = concorrentes();
        const resultados = await Promise.allSettled([
          criar
            ? rh.criarAcesso(empresaId, atores[0], funcionarioId, dados)
            : rh.vincularAcesso(empresaId, atores[0], funcionarioId, {
                versaoRegistro: 0,
                usuarioId,
              }),
          rh.alterarSituacao(empresaId, atores[1], funcionarioId, {
            status,
            versaoRegistro: 0,
            ...(status === 'DESLIGADO'
              ? { dataDesligamento: new Date().toISOString().slice(0, 10) }
              : {}),
          }),
        ]);
        expect(resultados.some((r) => r.status === 'fulfilled')).toBe(true);
        const f = await prisma.funcionario.findUniqueOrThrow({
          where: { id: funcionarioId },
          include: { usuario: true },
        });
        expect(
          ['INATIVO', 'DESLIGADO'].includes(f.status) &&
            f.usuario?.ativo === true,
        ).toBe(false);
      }
    },
    30000,
  );
  it('desvinculação concorrente impede que retry da ativação deixe conta ativa', async () => {
    const { rh, usuarios } = concorrentes();
    const resultados = await Promise.allSettled([
      rh.desvincularAcesso(empresaId, atores[0], funcionarioId, {
        versaoRegistro: 0,
      }),
      usuarios.ativar(usuarioId, atores[1]),
    ]);
    expect(resultados[0].status).toBe('fulfilled');
    expect(
      (
        await prisma.funcionario.findUniqueOrThrow({
          where: { id: funcionarioId },
        })
      ).usuarioId,
    ).toBeNull();
    expect(
      await prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } }),
    ).toMatchObject({ ativo: false, versaoAutorizacao: 1 });
  }, 30000);
});
