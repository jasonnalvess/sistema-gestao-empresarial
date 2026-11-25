import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PerfisService } from './perfis.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

const empresaId = 'empresa-a';
const id = 'perfil-a';
const permissao = {
  id: 'p1',
  chave: 'clientes.visualizar',
  nome: 'Clientes',
  descricao: null,
  modulo: 'clientes',
  ativo: true,
};
const perfil = {
  id,
  empresaId,
  escopo: 'EMPRESA',
  sistema: false,
  ativo: true,
  nome: 'Vendas',
  chave: 'vendas',
  descricao: null,
};
function erroPrisma(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError('falha simulada', {
    code,
    meta,
    clientVersion: '6.19.3',
  });
}

describe('PerfisService escrita transacional (Prisma simulado)', () => {
  let service: PerfisService;
  let ator: AuthenticatedUser;
  const tx = {
    $queryRaw: jest.fn(),
    usuario: { findUnique: jest.fn(), updateMany: jest.fn() },
    empresa: { findUnique: jest.fn() },
    perfil: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    permissao: { findMany: jest.fn() },
    perfilPermissao: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    usuarioPerfil: { findMany: jest.fn() },
    auditoriaLog: { create: jest.fn() },
  };
  const prisma = { $transaction: jest.fn() };
  beforeEach(() => {
    jest.resetAllMocks();
    ator = {
      id: 'ator',
      email: 'a@example.invalid',
      tipo: 'ADMIN_EMPRESA',
      empresaId,
      versaoAutorizacao: 2,
      permissoes: [
        'perfis.criar',
        'perfis.editar',
        'perfis.ativar',
        'perfis.inativar',
        'perfis.permissoes.gerenciar',
        permissao.chave,
      ],
    };
    prisma.$transaction.mockImplementation(
      (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    );
    tx.usuario.findUnique.mockResolvedValue({
      ativo: true,
      tipo: ator.tipo,
      empresaId,
      versaoAutorizacao: 2,
    });
    tx.empresa.findUnique.mockResolvedValue({ ativa: true });
    tx.perfil.findFirst.mockResolvedValue({ ...perfil });
    tx.perfil.create.mockResolvedValue({ ...perfil });
    tx.perfil.update.mockResolvedValue({ ...perfil });
    tx.permissao.findMany.mockResolvedValue([permissao]);
    tx.perfilPermissao.findMany.mockResolvedValue([]);
    tx.usuarioPerfil.findMany.mockResolvedValue([
      { usuario: { id: 'u1', empresaId, tipo: 'USUARIO_EMPRESA' } },
      { usuario: { id: 'u2', empresaId, tipo: 'ADMIN_EMPRESA' } },
    ]);
    tx.usuario.updateMany.mockResolvedValue({ count: 2 });
    service = new PerfisService(prisma as unknown as PrismaService);
  });
  const editar = () => service.editar(empresaId, ator, id, { nome: 'Novo' });
  const put = (permitido = true) =>
    service.configurarPermissoes(empresaId, ator, id, {
      permissoes: [{ permissaoId: 'p1', permitido }],
    });

  it('cria personalizado normalizado e audita sem revogar', async () => {
    await service.criar(empresaId, ator, {
      nome: ' Vendas ',
      chave: ' VENDAS ',
    });
    expect(tx.perfil.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          nome: 'Vendas',
          chave: 'vendas',
          descricao: undefined,
          empresaId,
          escopo: 'EMPRESA',
          sistema: false,
          ativo: true,
        },
      }),
    );
    expect(tx.usuario.updateMany).not.toHaveBeenCalled();
    expect(tx.auditoriaLog.create).toHaveBeenCalledWith({
      data: {
        empresaId,
        usuarioId: ator.id,
        entidadeId: id,
        entidade: 'PERFIL',
        acao: 'CRIAR',
        dadosAntigos: undefined,
        dadosNovos: { perfil, usuariosRevogados: 0 },
      },
    });
  });
  it('edita somente cadastro sem revogação e usa predicado contextual', async () => {
    await editar();
    expect(tx.perfil.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id, empresaId, escopo: 'EMPRESA' } }),
    );
    expect(tx.perfil.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id, empresaId, escopo: 'EMPRESA' },
        data: { nome: 'Novo', descricao: null },
      }),
    );
    expect(tx.usuario.updateMany).not.toHaveBeenCalled();
  });
  it('permite limpar descrição e rejeita PATCH vazio', async () => {
    expect(() => service.editar(empresaId, ator, id, {})).toThrow(
      BadRequestException,
    );
    tx.perfil.findFirst.mockResolvedValue({ ...perfil, descricao: 'Antiga' });
    await service.editar(empresaId, ator, id, { descricao: null });
    expect(tx.perfil.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { nome: perfil.nome, descricao: null } }),
    );
  });
  it.each(['editar', 'ativar', 'inativar', 'permissoes'])(
    'bloqueia sistema=true: %s',
    async (operacao) => {
      tx.perfil.findFirst.mockResolvedValue({ ...perfil, sistema: true });
      const executar =
        operacao === 'editar'
          ? editar
          : operacao === 'permissoes'
            ? put
            : () =>
                service.alterarAtivo(
                  empresaId,
                  ator,
                  id,
                  operacao === 'ativar',
                );
      await expect(executar()).rejects.toBeInstanceOf(ForbiddenException);
      expect(tx.perfil.update).not.toHaveBeenCalled();
      expect(tx.perfilPermissao.deleteMany).not.toHaveBeenCalled();
    },
  );
  it('ausência contextual é 404 sem busca global', async () => {
    tx.perfil.findFirst.mockResolvedValue(null);
    await expect(editar()).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.perfil.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id, empresaId, escopo: 'EMPRESA' } }),
    );
  });
  it.each([
    null,
    { ativo: false, tipo: 'ADMIN_EMPRESA', empresaId, versaoAutorizacao: 2 },
    { ativo: true, tipo: 'ADMIN_EMPRESA', empresaId, versaoAutorizacao: 3 },
    { ativo: true, tipo: 'USUARIO_EMPRESA', empresaId, versaoAutorizacao: 2 },
    {
      ativo: true,
      tipo: 'ADMIN_EMPRESA',
      empresaId: 'outra',
      versaoAutorizacao: 2,
    },
  ])('rejeita ator persistido inválido %j', async (atual) => {
    tx.usuario.findUnique.mockResolvedValue(atual);
    await expect(editar()).rejects.toBeInstanceOf(UnauthorizedException);
    expect(tx.perfil.findFirst).not.toHaveBeenCalled();
  });
  it('versão ausente rejeita sessão', async () => {
    delete ator.versaoAutorizacao;
    await expect(editar()).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('revalida permissão administrativa sem bypass', async () => {
    ator.permissoes = [];
    await expect(editar()).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('inativação e reativação reais revogam todos, inclusive vínculos inativos', async () => {
    for (const ativo of [false, true]) {
      tx.perfil.findFirst.mockResolvedValue({ ...perfil, ativo: !ativo });
      await service.alterarAtivo(empresaId, ator, id, ativo);
    }
    expect(tx.usuarioPerfil.findMany).toHaveBeenCalledWith({
      where: { perfilId: id },
      select: {
        usuario: { select: { id: true, tipo: true, empresaId: true } },
      },
    });
    expect(tx.usuario.updateMany).toHaveBeenCalledTimes(2);
    expect(tx.usuario.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['u1', 'u2'] },
        empresaId,
        tipo: { in: ['ADMIN_EMPRESA', 'USUARIO_EMPRESA'] },
      },
      data: { versaoAutorizacao: { increment: 1 } },
    });
  });
  it.each([true, false])(
    'estado repetido %s não revoga/audita/escreve',
    async (ativo) => {
      tx.perfil.findFirst.mockResolvedValue({ ...perfil, ativo });
      await service.alterarAtivo(empresaId, ator, id, ativo);
      expect(tx.usuario.updateMany).not.toHaveBeenCalled();
      expect(tx.perfil.update).not.toHaveBeenCalled();
      expect(tx.auditoriaLog.create).not.toHaveBeenCalled();
    },
  );
  it.each([true, false])(
    'adiciona permitido=%s com incremento único',
    async (permitido) => {
      await put(permitido);
      expect(tx.perfilPermissao.createMany).toHaveBeenCalledWith({
        data: [{ perfilId: id, permissaoId: 'p1', permitido }],
      });
      expect(tx.usuario.updateMany).toHaveBeenCalledTimes(1);
    },
  );
  it('troca permitido e audita antes/depois e quantidade', async () => {
    tx.perfilPermissao.findMany.mockResolvedValue([
      { permissao, permitido: true },
    ]);
    await put(false);
    expect(tx.auditoriaLog.create).toHaveBeenCalledWith({
      data: {
        empresaId,
        usuarioId: ator.id,
        entidadeId: id,
        entidade: 'PERFIL',
        acao: 'ATUALIZAR_PERMISSOES',
        dadosAntigos: {
          ...perfil,
          permissoes: [{ ...permissao, permitido: true }],
        },
        dadosNovos: {
          perfil: {
            ...perfil,
            permissoes: [{ ...permissao, permitido: false }],
          },
          usuariosRevogados: 2,
        },
      },
    });
  });
  it('lista vazia remove todas sem createMany', async () => {
    tx.perfilPermissao.findMany.mockResolvedValue([
      { permissao, permitido: true },
    ]);
    tx.permissao.findMany.mockResolvedValue([]);
    await service.configurarPermissoes(empresaId, ator, id, { permissoes: [] });
    expect(tx.perfilPermissao.deleteMany).toHaveBeenCalledWith({
      where: { perfilId: id },
    });
    expect(tx.perfilPermissao.createMany).not.toHaveBeenCalled();
    expect(tx.usuario.updateMany).toHaveBeenCalledTimes(1);
  });
  it('PUT idêntico não escreve, nem revoga', async () => {
    tx.perfilPermissao.findMany.mockResolvedValue([
      { permissao, permitido: true },
    ]);
    await put();
    expect(tx.perfilPermissao.deleteMany).not.toHaveBeenCalled();
    expect(tx.usuario.updateMany).not.toHaveBeenCalled();
    expect(tx.auditoriaLog.create).not.toHaveBeenCalled();
  });
  it.each([{ itens: [] }, { itens: [{ ...permissao, ativo: false }] }])(
    'rejeita catálogo inexistente/inativo %j',
    async ({ itens }) => {
      tx.permissao.findMany.mockResolvedValue(itens);
      await expect(put()).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.perfilPermissao.deleteMany).not.toHaveBeenCalled();
    },
  );
  it('rejeita IDs repetidos', async () => {
    await expect(
      service.configurarPermissoes(empresaId, ator, id, {
        permissoes: [
          { permissaoId: 'p1', permitido: true },
          { permissaoId: 'p1', permitido: false },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it.each([
    'sistema.auditoria.visualizar',
    'usuarios.editar',
    'perfis.criar',
    'fiscal.notas.emitir',
  ])('nega escalada %s mesmo ao SUPER_ADMIN', async (chave) => {
    ator.tipo = 'SUPER_ADMIN';
    ator.empresaId = null;
    tx.usuario.findUnique.mockResolvedValue({
      ativo: true,
      tipo: ator.tipo,
      empresaId: null,
      versaoAutorizacao: 2,
    });
    tx.permissao.findMany.mockResolvedValue([{ ...permissao, chave }]);
    await expect(put()).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('ADMIN não configura chave que não possui, inclusive permitido=false', async () => {
    ator.permissoes = ['perfis.permissoes.gerenciar'];
    await expect(put(false)).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('SUPER_ADMIN configura allowlist sem precisar da chave operacional', async () => {
    ator.tipo = 'SUPER_ADMIN';
    ator.empresaId = null;
    ator.permissoes = ['perfis.permissoes.gerenciar'];
    tx.usuario.findUnique.mockResolvedValue({
      ativo: true,
      tipo: ator.tipo,
      empresaId: null,
      versaoAutorizacao: 2,
    });
    await expect(put()).resolves.toMatchObject({
      permissoes: [{ ...permissao, permitido: true }],
    });
  });
  it('ADMIN não limpa configuração privilegiada preexistente', async () => {
    tx.perfilPermissao.findMany.mockResolvedValue([
      { permissao: { ...permissao, chave: 'sistema.editar' }, permitido: true },
    ]);
    await expect(
      service.configurarPermissoes(empresaId, ator, id, { permissoes: [] }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.perfilPermissao.deleteMany).not.toHaveBeenCalled();
  });
  it.each([
    { id: 'externo', empresaId: 'outra', tipo: 'USUARIO_EMPRESA' },
    { id: 'super', empresaId, tipo: 'SUPER_ADMIN' },
  ])(
    'aborta vínculo incompatível %j antes de qualquer mutação',
    async (usuario) => {
      tx.usuarioPerfil.findMany.mockResolvedValue([{ usuario }]);
      await expect(put()).rejects.toBeInstanceOf(ConflictException);
      expect(tx.perfilPermissao.deleteMany).not.toHaveBeenCalled();
      expect(tx.usuario.updateMany).not.toHaveBeenCalled();
    },
  );
  it('revogação divergente aborta antes da auditoria', async () => {
    tx.usuario.updateMany.mockResolvedValue({ count: 1 });
    await expect(put()).rejects.toBeInstanceOf(ConflictException);
    expect(tx.auditoriaLog.create).not.toHaveBeenCalled();
  });
  it('falha na auditoria rejeita o callback transacional (rollback a cargo do Prisma)', async () => {
    const falha = new Error('auditoria indisponível');
    tx.auditoriaLog.create.mockRejectedValue(falha);
    await expect(put()).rejects.toBe(falha);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
  });
  it('falha intermediária aborta callback, sem revogação ou auditoria', async () => {
    const falha = new Error('falha de associação');
    tx.perfilPermissao.createMany.mockRejectedValue(falha);
    await expect(put()).rejects.toBe(falha);
    expect(tx.usuario.updateMany).not.toHaveBeenCalled();
    expect(tx.auditoriaLog.create).not.toHaveBeenCalled();
  });
  it('retry serializável reexecuta e revalida ator', async () => {
    tx.perfil.update.mockRejectedValueOnce(erroPrisma('P2034'));
    await editar();
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(tx.usuario.findUnique).toHaveBeenCalledTimes(2);
  });
  it('revogação do ator entre tentativas impede segunda escrita', async () => {
    tx.perfil.update.mockRejectedValueOnce(erroPrisma('P2034'));
    tx.usuario.findUnique
      .mockResolvedValueOnce({
        ativo: true,
        tipo: ator.tipo,
        empresaId,
        versaoAutorizacao: 2,
      })
      .mockResolvedValueOnce({
        ativo: true,
        tipo: ator.tipo,
        empresaId,
        versaoAutorizacao: 3,
      });
    await expect(editar()).rejects.toBeInstanceOf(UnauthorizedException);
    expect(tx.perfil.update).toHaveBeenCalledTimes(1);
  });
  it('limita retries e retorna conflito', async () => {
    tx.perfil.update.mockRejectedValue(erroPrisma('P2034'));
    await expect(editar()).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  });
  it.each([['empresaId', 'chave'], 'Perfil_empresaId_chave_key'])(
    'converte apenas P2002 da chave %j',
    async (target) => {
      tx.perfil.create.mockRejectedValue(erroPrisma('P2002', { target }));
      await expect(
        service.criar(empresaId, ator, { nome: 'A', chave: 'a' }),
      ).rejects.toBeInstanceOf(ConflictException);
    },
  );
  it.each(['P2002', 'P2025', 'P2010'])(
    'preserva erro Prisma desconhecido %s',
    async (code) => {
      const falha = erroPrisma(code, { target: ['outro'] });
      tx.perfil.create.mockRejectedValue(falha);
      await expect(
        service.criar(empresaId, ator, { nome: 'A', chave: 'a' }),
      ).rejects.toBe(falha);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    },
  );
  it('bloqueia ator antes da revalidação e perfil antes da localização', async () => {
    await editar();
    expect(tx.$queryRaw).toHaveBeenNthCalledWith(1, expect.any(Array), ator.id);
    expect(tx.$queryRaw).toHaveBeenNthCalledWith(
      2,
      expect.any(Array),
      id,
      empresaId,
    );
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.usuario.findUnique.mock.invocationCallOrder[0],
    );
    expect(tx.$queryRaw.mock.invocationCallOrder[1]).toBeLessThan(
      tx.perfil.findFirst.mock.invocationCallOrder[0],
    );
  });
  it.each(['40001', '40P01'])(
    'repete integralmente conflito SQL conhecido %s',
    async (code) => {
      tx.$queryRaw.mockRejectedValueOnce(erroPrisma('P2010', { code }));
      await editar();
      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
      expect(tx.perfil.update).toHaveBeenCalledTimes(1);
    },
  );
  it('várias permissões alteradas revogam cada usuário somente uma vez', async () => {
    const segunda = { ...permissao, id: 'p2', chave: 'clientes.editar' };
    ator.permissoes?.push(segunda.chave);
    tx.permissao.findMany.mockResolvedValue([permissao, segunda]);
    await service.configurarPermissoes(empresaId, ator, id, {
      permissoes: [
        { permissaoId: 'p1', permitido: true },
        { permissaoId: 'p2', permitido: false },
      ],
    });
    expect(tx.usuario.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.usuario.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['u1', 'u2'] },
        empresaId,
        tipo: { in: ['ADMIN_EMPRESA', 'USUARIO_EMPRESA'] },
      },
      data: { versaoAutorizacao: { increment: 1 } },
    });
  });
  it('reativação não contorna limite de delegação do administrador', async () => {
    tx.perfil.findFirst.mockResolvedValue({ ...perfil, ativo: false });
    tx.perfilPermissao.findMany.mockResolvedValue([
      { permissao: { ...permissao, chave: 'sistema.editar' }, permitido: true },
    ]);
    await expect(
      service.alterarAtivo(empresaId, ator, id, true),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.perfil.update).not.toHaveBeenCalled();
  });
  it.each([
    { chave: 'sistema.editar', permitido: true },
    { chave: 'sistema.editar', permitido: false },
    { chave: 'clientes.editar', permitido: true },
    { chave: 'clientes.editar', permitido: false },
  ])(
    'ADMIN bloqueia qualquer substituição de associação superior %j',
    async (atual) => {
      tx.perfilPermissao.findMany.mockResolvedValue([
        {
          permissao: { ...permissao, chave: atual.chave },
          permitido: atual.permitido,
        },
      ]);
      for (const permissoes of [
        [],
        [{ permissaoId: 'p1', permitido: atual.permitido }],
        [{ permissaoId: 'p1', permitido: !atual.permitido }],
      ]) {
        await expect(
          service.configurarPermissoes(empresaId, ator, id, { permissoes }),
        ).rejects.toBeInstanceOf(ForbiddenException);
      }
      expect(tx.perfil.update).not.toHaveBeenCalled();
      expect(tx.perfilPermissao.deleteMany).not.toHaveBeenCalled();
      expect(tx.perfilPermissao.createMany).not.toHaveBeenCalled();
      expect(tx.usuario.updateMany).not.toHaveBeenCalled();
      expect(tx.auditoriaLog.create).not.toHaveBeenCalled();
    },
  );

  it.each([
    { descricao: '  Equipe  ', esperado: 'Equipe' },
    { descricao: '   ', esperado: null },
    { descricao: '', esperado: null },
  ])(
    'POST persiste descrição normalizada %j',
    async ({ descricao, esperado }) => {
      await service.criar(empresaId, ator, {
        nome: 'A',
        chave: 'a',
        descricao,
      });
      expect(tx.perfil.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            nome: 'A',
            chave: 'a',
            descricao: esperado,
            empresaId,
            escopo: 'EMPRESA',
            sistema: false,
            ativo: true,
          },
        }),
      );
      expect(tx.usuario.updateMany).not.toHaveBeenCalled();
    },
  );

  it.each([
    { descricao: undefined, esperado: 'Antiga' },
    { descricao: null, esperado: null },
    { descricao: '  Equipe  ', esperado: 'Equipe' },
    { descricao: '   ', esperado: null },
    { descricao: '', esperado: null },
  ])(
    'PATCH preserva ausência e normaliza descrição %j',
    async ({ descricao, esperado }) => {
      tx.perfil.findFirst.mockResolvedValue({ ...perfil, descricao: 'Antiga' });
      await service.editar(empresaId, ator, id, { nome: 'Novo', descricao });
      expect(tx.perfil.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { nome: 'Novo', descricao: esperado },
        }),
      );
      expect(tx.usuario.updateMany).not.toHaveBeenCalled();
      expect(tx.perfilPermissao.deleteMany).not.toHaveBeenCalled();
      expect(tx.perfilPermissao.createMany).not.toHaveBeenCalled();
    },
  );

  it.each([
    { anterior: 'Equipe', descricao: '  Equipe  ' },
    { anterior: null, descricao: '   ' },
  ])(
    'descrição equivalente após normalização é no-op %j',
    async ({ anterior, descricao }) => {
      tx.perfil.findFirst.mockResolvedValue({ ...perfil, descricao: anterior });
      await service.editar(empresaId, ator, id, { descricao });
      expect(tx.perfil.update).not.toHaveBeenCalled();
      expect(tx.usuario.updateMany).not.toHaveBeenCalled();
      expect(tx.auditoriaLog.create).not.toHaveBeenCalled();
    },
  );

  it('PUT idêntico com false e ordem diferente continua no-op', async () => {
    const segunda = { ...permissao, id: 'p2', chave: 'clientes.editar' };
    ator.permissoes?.push(segunda.chave);
    tx.perfilPermissao.findMany.mockResolvedValue([
      { permissao, permitido: false },
      { permissao: segunda, permitido: true },
    ]);
    tx.permissao.findMany.mockResolvedValue([permissao, segunda]);
    await service.configurarPermissoes(empresaId, ator, id, {
      permissoes: [
        { permissaoId: 'p2', permitido: true },
        { permissaoId: 'p1', permitido: false },
      ],
    });
    expect(tx.perfilPermissao.deleteMany).not.toHaveBeenCalled();
    expect(tx.perfilPermissao.createMany).not.toHaveBeenCalled();
    expect(tx.usuario.updateMany).not.toHaveBeenCalled();
    expect(tx.auditoriaLog.create).not.toHaveBeenCalled();
  });

  it.each(['40001', '40P01'])(
    'conflito SQL simulado persistente %s esgota três tentativas sem mutação',
    async (code) => {
      tx.$queryRaw.mockImplementation((sql: TemplateStringsArray) => {
        if (sql[0].includes('"Perfil"')) {
          throw erroPrisma('P2010', { code });
        }
        return Promise.resolve([]);
      });
      await expect(put()).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.$transaction).toHaveBeenCalledTimes(3);
      expect(tx.usuario.findUnique).toHaveBeenCalledTimes(3);
      expect(tx.perfilPermissao.deleteMany).not.toHaveBeenCalled();
      expect(tx.usuario.updateMany).not.toHaveBeenCalled();
      expect(tx.auditoriaLog.create).not.toHaveBeenCalled();
    },
  );
});
