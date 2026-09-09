import { Prisma } from '@prisma/client';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { UsuariosService } from './usuarios.service';

describe('UsuariosService', () => {
  let service: UsuariosService;

  const prismaServiceMock = {
    usuario: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    empresa: { findUnique: jest.fn() },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    usuarioPerfil: { count: jest.fn() },
    funcionario: { findFirst: jest.fn() },
    funcionarioHistorico: { create: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
    prismaServiceMock.$transaction.mockImplementation(
      (callback: (tx: typeof prismaServiceMock) => Promise<unknown>) =>
        callback(prismaServiceMock),
    );
    prismaServiceMock.usuarioPerfil.count.mockResolvedValue(1);
    prismaServiceMock.funcionario.findFirst.mockResolvedValue(null);
    prismaServiceMock.usuario.findFirst.mockImplementation(
      async ({ where }: { where: { id: string } }) => {
        if (where.id === 'admin' || where.id === 'super')
          return {
            ...(where.id === 'admin' ? admin : superAdmin),
            ativo: true,
          };
        const result = prismaServiceMock.usuario.findUnique.mock.results.at(-1)
          ?.value as Promise<Record<string, unknown>>;
        return await result;
      },
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const superAdmin: AuthenticatedUser = {
    id: 'super',
    email: 'super@example.com',
    tipo: 'SUPER_ADMIN',
    empresaId: null,
    versaoAutorizacao: 0,
    permissoes: ['usuarios.ativar', 'usuarios.inativar'],
  };
  const admin: AuthenticatedUser = {
    id: 'admin',
    email: 'admin@example.com',
    tipo: 'ADMIN_EMPRESA',
    empresaId: 'empresa-a',
    versaoAutorizacao: 0,
    permissoes: ['usuarios.ativar', 'usuarios.inativar'],
  };
  const dadosCriacao = {
    nome: 'Novo usuário',
    email: 'novo@example.com',
    senha: 'senha-teste',
  };

  describe('invariantes de criação', () => {
    it('impede SUPER_ADMIN com empresa antes de gravar', async () => {
      await expect(
        service.criar(
          { ...dadosCriacao, tipo: 'SUPER_ADMIN', empresaId: 'empresa-a' },
          superAdmin,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaServiceMock.usuario.create).not.toHaveBeenCalled();
    });

    it.each(['ADMIN_EMPRESA', 'USUARIO_EMPRESA'] as const)(
      'impede %s sem empresa',
      async (tipo) => {
        await expect(
          service.criar({ ...dadosCriacao, tipo }, superAdmin),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(prismaServiceMock.usuario.create).not.toHaveBeenCalled();
      },
    );

    it.each(['ADMIN_EMPRESA', 'USUARIO_EMPRESA'] as const)(
      'impede %s com empresa inexistente',
      async (tipo) => {
        prismaServiceMock.empresa.findUnique.mockResolvedValueOnce(null);
        await expect(
          service.criar(
            { ...dadosCriacao, tipo, empresaId: 'inexistente' },
            superAdmin,
          ),
        ).rejects.toBeInstanceOf(NotFoundException);
        expect(prismaServiceMock.usuario.create).not.toHaveBeenCalled();
      },
    );

    it.each(['ADMIN_EMPRESA', 'USUARIO_EMPRESA'] as const)(
      'preserva criação de %s pelo SUPER_ADMIN em empresa existente',
      async (tipo) => {
        prismaServiceMock.empresa.findUnique.mockResolvedValueOnce({
          id: 'empresa-b',
        });
        await service.criar(
          { ...dadosCriacao, tipo, empresaId: 'empresa-b' },
          superAdmin,
        );
        expect(prismaServiceMock.empresa.findUnique).toHaveBeenCalledWith({
          where: { id: 'empresa-b' },
          select: { id: true },
        });
        expect(prismaServiceMock.usuario.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              tipo,
              empresaId: 'empresa-b',
              senha: expect.stringMatching(/^\$2/) as unknown,
            }) as unknown,
          }),
        );
      },
    );

    it('cria SUPER_ADMIN com empresa nula', async () => {
      await service.criar({ ...dadosCriacao, tipo: 'SUPER_ADMIN' }, superAdmin);
      expect(prismaServiceMock.empresa.findUnique).not.toHaveBeenCalled();
      expect(prismaServiceMock.usuario.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tipo: 'SUPER_ADMIN',
            empresaId: null,
          }) as unknown,
        }),
      );
    });

    it.each(['ADMIN_EMPRESA', 'USUARIO_EMPRESA'] as const)(
      'ADMIN cria %s somente na própria empresa apesar do payload externo',
      async (tipo) => {
        prismaServiceMock.empresa.findUnique.mockResolvedValueOnce({
          id: 'empresa-a',
        });
        await service.criar(
          { ...dadosCriacao, tipo, empresaId: 'empresa-b' },
          admin,
        );
        expect(prismaServiceMock.empresa.findUnique).toHaveBeenCalledWith({
          where: { id: 'empresa-a' },
          select: { id: true },
        });
        expect(prismaServiceMock.usuario.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              tipo,
              empresaId: 'empresa-a',
            }) as unknown,
          }),
        );
      },
    );

    it('ADMIN continua criando sem empresa no payload usando a identidade', async () => {
      prismaServiceMock.empresa.findUnique.mockResolvedValueOnce({
        id: 'empresa-a',
      });
      await service.criar({ ...dadosCriacao, tipo: 'USUARIO_EMPRESA' }, admin);
      expect(prismaServiceMock.usuario.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ empresaId: 'empresa-a' }) as unknown,
        }),
      );
    });

    it('ADMIN continua impedido de criar SUPER_ADMIN', async () => {
      await expect(
        service.criar({ ...dadosCriacao, tipo: 'SUPER_ADMIN' }, admin),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prismaServiceMock.usuario.create).not.toHaveBeenCalled();
    });
  });

  describe('isolamento da listagem por empresa', () => {
    const EMPRESA_A = '11111111-1111-4111-8111-111111111111';
    const EMPRESA_B = '22222222-2222-4222-8222-222222222222';

    beforeEach(() => {
      prismaServiceMock.usuario.findMany.mockResolvedValue([]);
      prismaServiceMock.usuario.count.mockResolvedValue(0);
      prismaServiceMock.$transaction.mockImplementation(
        async (operacoes: unknown) => {
          if (Array.isArray(operacoes)) {
            return Promise.all(operacoes);
          }
          return (
            operacoes as (tx: typeof prismaServiceMock) => Promise<unknown>
          )(prismaServiceMock);
        },
      );
    });

    it('ADMIN_EMPRESA lista exclusivamente usuários da empresa do JWT', async () => {
      await service.listar(admin, { page: 1, limit: 10 }, EMPRESA_B);

      expect(prismaServiceMock.usuario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { empresaId: 'empresa-a' },
        }),
      );
      expect(prismaServiceMock.usuario.count).toHaveBeenCalledWith({
        where: { empresaId: 'empresa-a' },
      });
      expect(prismaServiceMock.empresa.findUnique).not.toHaveBeenCalled();
    });

    it('SUPER_ADMIN sem empresa selecionada preserva visão global', async () => {
      await service.listar(superAdmin, { page: 1, limit: 10 });

      expect(prismaServiceMock.usuario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
      expect(prismaServiceMock.usuario.count).toHaveBeenCalledWith({
        where: {},
      });
      expect(prismaServiceMock.empresa.findUnique).not.toHaveBeenCalled();
    });

    it('SUPER_ADMIN com empresa selecionada lista somente o tenant escolhido', async () => {
      prismaServiceMock.empresa.findUnique.mockResolvedValueOnce({
        id: EMPRESA_A,
        ativa: true,
      });

      await service.listar(superAdmin, { page: 1, limit: 10 }, EMPRESA_A);

      expect(prismaServiceMock.empresa.findUnique).toHaveBeenCalledWith({
        where: { id: EMPRESA_A },
        select: { id: true, ativa: true },
      });
      expect(prismaServiceMock.usuario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { empresaId: EMPRESA_A },
        }),
      );
      expect(prismaServiceMock.usuario.count).toHaveBeenCalledWith({
        where: { empresaId: EMPRESA_A },
      });
    });

    it('SUPER_ADMIN rejeita empresa selecionada com UUID inválido', async () => {
      await expect(
        service.listar(superAdmin, { page: 1, limit: 10 }, 'empresa-invalida'),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prismaServiceMock.empresa.findUnique).not.toHaveBeenCalled();
      expect(prismaServiceMock.usuario.findMany).not.toHaveBeenCalled();
    });

    it('SUPER_ADMIN rejeita empresa selecionada inexistente', async () => {
      prismaServiceMock.empresa.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.listar(superAdmin, { page: 1, limit: 10 }, EMPRESA_B),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaServiceMock.usuario.findMany).not.toHaveBeenCalled();
    });

    it('SUPER_ADMIN rejeita empresa selecionada inativa', async () => {
      prismaServiceMock.empresa.findUnique.mockResolvedValueOnce({
        id: EMPRESA_B,
        ativa: false,
      });

      await expect(
        service.listar(superAdmin, { page: 1, limit: 10 }, EMPRESA_B),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(prismaServiceMock.usuario.findMany).not.toHaveBeenCalled();
    });
  });

  describe('proteção do usuário-alvo', () => {
    const operacoes = ['atualizar', 'ativar', 'desativar'] as const;
    function executar(
      operacao: (typeof operacoes)[number],
      ator: AuthenticatedUser,
    ) {
      return operacao === 'atualizar'
        ? service.atualizar('alvo', { nome: 'Nome atualizado' }, ator)
        : service[operacao]('alvo', ator);
    }

    it.each(operacoes)(
      'ADMIN não pode %s SUPER_ADMIN vinculado à mesma empresa',
      async (operacao) => {
        prismaServiceMock.usuario.findUnique.mockResolvedValueOnce({
          id: 'alvo',
          tipo: 'SUPER_ADMIN',
          empresaId: 'empresa-a',
        });
        await expect(executar(operacao, admin)).rejects.toThrow(
          'Administrador de empresa não pode gerenciar Super Admin',
        );
        expect(prismaServiceMock.usuario.update).not.toHaveBeenCalled();
      },
    );

    it.each(operacoes)(
      'ADMIN não pode %s usuário de outra empresa',
      async (operacao) => {
        prismaServiceMock.usuario.findUnique.mockResolvedValueOnce({
          id: 'alvo',
          tipo: 'USUARIO_EMPRESA',
          empresaId: 'empresa-b',
        });
        await expect(executar(operacao, admin)).rejects.toBeInstanceOf(
          ForbiddenException,
        );
        expect(prismaServiceMock.usuario.update).not.toHaveBeenCalled();
      },
    );

    it.each(operacoes)(
      'ADMIN continua podendo %s outro ADMIN da mesma empresa',
      async (operacao) => {
        prismaServiceMock.usuario.findUnique.mockResolvedValueOnce({
          id: 'alvo',
          ativo: operacao === 'desativar',
          tipo: 'ADMIN_EMPRESA',
          empresaId: 'empresa-a',
        });
        await executar(operacao, admin);
        expect(prismaServiceMock.usuario.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where:
              operacao === 'atualizar'
                ? { id: 'alvo' }
                : { id: 'alvo', empresaId: 'empresa-a' },
            data:
              operacao === 'atualizar'
                ? { nome: 'Nome atualizado', email: undefined, tipo: undefined }
                : operacao === 'ativar'
                  ? { ativo: true }
                  : { ativo: false, versaoAutorizacao: { increment: 1 } },
          }),
        );
      },
    );

    it.each(operacoes)(
      'SUPER_ADMIN continua podendo %s usuário empresarial de outra empresa',
      async (operacao) => {
        prismaServiceMock.usuario.findUnique.mockResolvedValueOnce({
          id: 'alvo',
          ativo: operacao === 'desativar',
          tipo: 'USUARIO_EMPRESA',
          empresaId: 'empresa-b',
        });
        await executar(operacao, superAdmin);
        expect(prismaServiceMock.usuario.update).toHaveBeenCalledTimes(1);
      },
    );

    it.each(operacoes)(
      'SUPER_ADMIN continua podendo %s outro SUPER_ADMIN',
      async (operacao) => {
        prismaServiceMock.usuario.findUnique.mockResolvedValueOnce({
          id: 'alvo',
          ativo: operacao === 'desativar',
          tipo: 'SUPER_ADMIN',
          empresaId: null,
        });
        await executar(operacao, superAdmin);
        expect(prismaServiceMock.usuario.update).toHaveBeenCalledTimes(1);
      },
    );

    it('ADMIN não promove usuário empresarial para SUPER_ADMIN', async () => {
      prismaServiceMock.usuario.findUnique.mockResolvedValueOnce({
        id: 'alvo',
        tipo: 'USUARIO_EMPRESA',
        empresaId: 'empresa-a',
      });
      await expect(
        service.atualizar('alvo', { tipo: 'SUPER_ADMIN' }, admin),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prismaServiceMock.usuario.update).not.toHaveBeenCalled();
    });
  });

  describe('invalidação persistente de autorização', () => {
    beforeEach(() => {
      prismaServiceMock.usuario.findUnique.mockResolvedValue({
        id: 'alvo',
        ativo: true,
        tipo: 'USUARIO_EMPRESA',
        empresaId: 'empresa-a',
      });
    });

    it('inativa e incrementa a versão na mesma escrita', async () => {
      await service.desativar('alvo', admin);
      expect(prismaServiceMock.usuario.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'alvo', empresaId: 'empresa-a' },
          data: { ativo: false, versaoAutorizacao: { increment: 1 } },
        }),
      );
    });

    it('mudança efetiva de tipo incrementa atomicamente', async () => {
      await service.atualizar('alvo', { tipo: 'ADMIN_EMPRESA' }, superAdmin);
      expect(prismaServiceMock.usuario.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            nome: undefined,
            email: undefined,
            tipo: 'ADMIN_EMPRESA',
            versaoAutorizacao: { increment: 1 },
          },
        }),
      );
    });

    it.each([
      { tipo: 'USUARIO_EMPRESA' as const },
      { nome: 'Novo nome' },
      { email: 'novo@example.com' },
    ])('atualização sem mudança de tipo não incrementa: %j', async (dados) => {
      await service.atualizar('alvo', dados, superAdmin);
      expect(prismaServiceMock.usuario.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            nome: 'nome' in dados ? dados.nome : undefined,
            email: 'email' in dados ? dados.email : undefined,
            tipo: 'tipo' in dados ? dados.tipo : undefined,
          },
        }),
      );
    });

    it('reativa sem restaurar nem incrementar a versão', async () => {
      prismaServiceMock.usuario.findUnique.mockResolvedValueOnce({
        id: 'alvo',
        empresaId: 'empresa-a',
        tipo: 'USUARIO_EMPRESA',
        ativo: false,
      });
      await service.ativar('alvo', admin);
      expect(prismaServiceMock.usuario.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { ativo: true } }),
      );
    });
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });
  it('deve buscar usuário com perfis e permissões ativos', async () => {
    prismaServiceMock.usuario.findUnique.mockResolvedValue(null);

    await service.buscarPorEmailComAutorizacao('admin@sistema.com');

    expect(prismaServiceMock.usuario.findUnique).toHaveBeenCalledWith({
      where: {
        email: 'admin@sistema.com',
      },
      select: {
        id: true,
        nome: true,
        email: true,
        senha: true,
        trocaSenhaObrigatoria: true,
        versaoAutorizacao: true,
        tipo: true,
        ativo: true,
        empresaId: true,
        perfis: {
          where: {
            ativo: true,
            perfil: {
              ativo: true,
            },
          },
          select: {
            perfil: {
              select: {
                id: true,
                nome: true,
                chave: true,
                escopo: true,
                empresaId: true,
                permissoes: {
                  where: {
                    permitido: true,
                    permissao: {
                      ativo: true,
                    },
                  },
                  select: {
                    permissao: {
                      select: {
                        chave: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  });
});

describe('CE-3D — perfis atribuídos', () => {
  const permissao = 'usuarios.perfis.gerenciar';
  const delegavel = 'funcionarios.visualizar';
  let ator: AuthenticatedUser;
  type Perfil = {
    id: string;
    nome: string;
    chave: string;
    descricao: null;
    sistema: boolean;
    escopo: string;
    ativo: boolean;
    empresaId: string | null;
    permissoes: {
      permitido: boolean;
      permissao: { chave: string; ativo: boolean };
    }[];
  };
  let perfis: Perfil[];
  let vinculos: { perfilId: string; ativo: boolean }[];
  let alvo: {
    id: string;
    empresaId: string | null;
    tipo: string;
    ativo: boolean;
    senha: string;
    trocaSenhaObrigatoria: boolean;
    versaoAutorizacao: number;
  };
  let auditorias: unknown[];
  const tx = {
    $queryRaw: jest.fn(),
    usuario: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    empresa: { findUnique: jest.fn() },
    perfil: { findMany: jest.fn() },
    usuarioPerfil: {
      count: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    auditoriaLog: { create: jest.fn() },
  };
  const prisma = { ...tx, $transaction: jest.fn() };
  let service: UsuariosService;
  const put = (ids: string[]) =>
    service.atualizarPerfis('alvo', { perfisIds: ids }, ator);
  const semEscritas = () => {
    expect(tx.usuarioPerfil.updateMany).not.toHaveBeenCalled();
    expect(tx.usuarioPerfil.createMany).not.toHaveBeenCalled();
    expect(tx.usuarioPerfil.deleteMany).not.toHaveBeenCalled();
    expect(tx.usuario.update).not.toHaveBeenCalled();
    expect(tx.auditoriaLog.create).not.toHaveBeenCalled();
  };
  beforeEach(() => {
    jest.resetAllMocks();
    ator = {
      id: 'ator',
      email: 'ator@example.invalid',
      tipo: 'ADMIN_EMPRESA',
      empresaId: 'empresa-a',
      versaoAutorizacao: 0,
      permissoes: [permissao, delegavel],
    };
    perfis = ['p1', 'p2'].map((id) => ({
      id,
      nome: id,
      chave: id,
      descricao: null,
      sistema: false,
      escopo: 'EMPRESA',
      ativo: true,
      empresaId: 'empresa-a',
      permissoes: [
        { permitido: true, permissao: { chave: delegavel, ativo: true } },
      ],
    }));
    vinculos = [];
    alvo = {
      id: 'alvo',
      empresaId: 'empresa-a',
      tipo: 'USUARIO_EMPRESA',
      ativo: true,
      senha: 'hash-fixture',
      trocaSenhaObrigatoria: true,
      versaoAutorizacao: 5,
    };
    auditorias = [];
    tx.usuario.findUnique.mockImplementation(() => ({ ...ator, ativo: true }));
    tx.usuario.findFirst.mockImplementation(
      ({ where }: { where: { id: string; empresaId?: string } }) =>
        where.id === alvo.id &&
        (!where.empresaId || where.empresaId === alvo.empresaId)
          ? { ...alvo }
          : null,
    );
    tx.empresa.findUnique.mockResolvedValue({ ativa: true });
    tx.usuarioPerfil.count.mockResolvedValue(1);
    tx.perfil.findMany.mockImplementation(
      ({ where }: { where: { id: { in: string[] }; empresaId: string } }) =>
        perfis.filter(
          (p) =>
            where.id.in.includes(p.id) &&
            p.empresaId === where.empresaId &&
            p.escopo === 'EMPRESA' &&
            p.ativo,
        ),
    );
    tx.usuarioPerfil.findMany.mockImplementation(
      ({
        where,
      }: {
        where: { ativo?: boolean; perfil?: { empresaId: string } };
      }) => {
        if (where.ativo === undefined) return structuredClone(vinculos);
        return vinculos
          .filter((v) => v.ativo)
          .flatMap((v) => {
            const p = perfis.find(
              (p) =>
                p.id === v.perfilId &&
                p.ativo &&
                p.escopo === 'EMPRESA' &&
                p.empresaId === where.perfil?.empresaId,
            );
            if (!p) return [];
            const { permissoes: omitidas, ...administrativo } = p;
            void omitidas;
            return [{ perfil: administrativo }];
          });
      },
    );
    tx.usuarioPerfil.updateMany.mockImplementation(
      ({
        where,
        data,
      }: {
        where: {
          ativo: boolean;
          perfilId: { in?: string[]; notIn?: string[] };
        };
        data: { ativo: boolean };
      }) => {
        for (const v of vinculos)
          if (
            v.ativo === where.ativo &&
            (where.perfilId.in?.includes(v.perfilId) ??
              !where.perfilId.notIn?.includes(v.perfilId))
          )
            v.ativo = data.ativo;
        return { count: 1 };
      },
    );
    tx.usuarioPerfil.createMany.mockImplementation(
      ({ data }: { data: { perfilId: string; ativo: boolean }[] }) => {
        vinculos.push(
          ...data.map(({ perfilId, ativo }) => ({ perfilId, ativo })),
        );
        return { count: data.length };
      },
    );
    tx.usuario.update.mockImplementation(() => {
      alvo.versaoAutorizacao++;
      return { id: alvo.id };
    });
    tx.auditoriaLog.create.mockImplementation((args: unknown) => {
      auditorias.push(args);
      return {};
    });
    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => Promise<unknown>) => {
        const antes = structuredClone({ alvo, vinculos, auditorias });
        try {
          return await callback(tx);
        } catch (error) {
          ({ alvo, vinculos, auditorias } = antes);
          throw error;
        }
      },
    );
    service = new UsuariosService(prisma as unknown as PrismaService);
  });

  it('GET da própria empresa retorna apenas vínculos e perfis ativos, sem permissões', async () => {
    vinculos = [
      { perfilId: 'p1', ativo: true },
      { perfilId: 'p2', ativo: false },
    ];
    const resultado = await service.listarPerfis('alvo', ator);
    expect(resultado).toEqual([
      {
        id: 'p1',
        nome: 'p1',
        chave: 'p1',
        descricao: null,
        sistema: false,
        escopo: 'EMPRESA',
        ativo: true,
        empresaId: 'empresa-a',
      },
    ]);
    perfis[0].ativo = false;
    expect(await service.listarPerfis('alvo', ator)).toEqual([]);
    semEscritas();
  });
  it.each(['GET', 'PUT'])('%s não revela alvo cross-tenant', async (metodo) => {
    alvo.empresaId = 'empresa-b';
    await expect(
      metodo === 'GET' ? service.listarPerfis('alvo', ator) : put([]),
    ).rejects.toBeInstanceOf(NotFoundException);
    semEscritas();
  });
  it.each(['GET', 'PUT'])(
    '%s rejeita alvo SUPER_ADMIN para ADMIN',
    async (metodo) => {
      alvo.tipo = 'SUPER_ADMIN';
      await expect(
        metodo === 'GET' ? service.listarPerfis('alvo', ator) : put([]),
      ).rejects.toBeInstanceOf(ForbiddenException);
      semEscritas();
    },
  );
  it.each(['GET', 'PUT'])(
    '%s rejeita alvo SUPER_ADMIN para SUPER',
    async (metodo) => {
      ator.tipo = 'SUPER_ADMIN';
      ator.empresaId = null;
      alvo.tipo = 'SUPER_ADMIN';
      alvo.empresaId = null;
      await expect(
        metodo === 'GET' ? service.listarPerfis('alvo', ator) : put([]),
      ).rejects.toBeInstanceOf(ForbiddenException);
      semEscritas();
    },
  );
  it('SUPER consulta usuário empresarial', async () => {
    ator.tipo = 'SUPER_ADMIN';
    ator.empresaId = null;
    vinculos = [{ perfilId: 'p1', ativo: true }];
    expect(await service.listarPerfis('alvo', ator)).toHaveLength(1);
  });
  it.each([{ ids: ['p1'] }, { ids: ['p1', 'p2'] }])(
    'atribui $ids com uma revogação e auditoria, preservando conta',
    async ({ ids }) => {
      const antes = { ...alvo };
      expect(await put(ids)).toHaveLength(ids.length);
      expect(vinculos).toEqual(
        ids.map((perfilId) => ({ perfilId, ativo: true })),
      );
      expect(alvo).toEqual({ ...antes, versaoAutorizacao: 6 });
      expect(tx.usuario.update).toHaveBeenCalledTimes(1);
      expect(tx.usuario.update).toHaveBeenCalledWith({
        where: { id: 'alvo', empresaId: 'empresa-a' },
        data: { versaoAutorizacao: { increment: 1 } },
        select: { id: true },
      });
      expect(auditorias).toEqual([
        {
          data: {
            empresaId: 'empresa-a',
            usuarioId: 'ator',
            entidade: 'USUARIO',
            entidadeId: 'alvo',
            acao: 'ATUALIZAR_PERFIS',
            dadosAntigos: { perfisIds: [] },
            dadosNovos: { perfisIds: ids },
          },
        },
      ]);
      expect(tx.auditoriaLog.create).toHaveBeenCalledTimes(1);
      expect(tx.usuarioPerfil.deleteMany).not.toHaveBeenCalled();
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: 'Serializable',
      });
    },
  );
  it('array vazio inativa todos sem apagar vínculos', async () => {
    vinculos = [
      { perfilId: 'p1', ativo: true },
      { perfilId: 'p2', ativo: false },
    ];
    expect(await put([])).toEqual([]);
    expect(vinculos).toEqual([
      { perfilId: 'p1', ativo: false },
      { perfilId: 'p2', ativo: false },
    ]);
    expect(tx.usuarioPerfil.deleteMany).not.toHaveBeenCalled();
    expect(alvo.versaoAutorizacao).toBe(6);
  });
  it('reativa vínculo existente e inativa removido sem duplicar', async () => {
    vinculos = [
      { perfilId: 'p1', ativo: false },
      { perfilId: 'p2', ativo: true },
    ];
    await put(['p1']);
    expect(vinculos).toEqual([
      { perfilId: 'p1', ativo: true },
      { perfilId: 'p2', ativo: false },
    ]);
    expect(tx.usuarioPerfil.createMany).not.toHaveBeenCalled();
    expect(tx.usuarioPerfil.deleteMany).not.toHaveBeenCalled();
  });
  it.each([{ ids: [] }, { ids: ['p2', 'p1'] }])(
    'conjunto idêntico $ids não escreve nem revoga nem audita',
    async ({ ids }) => {
      vinculos = ids.map((perfilId) => ({ perfilId, ativo: true }));
      await put([...ids].reverse());
      semEscritas();
      expect(alvo.versaoAutorizacao).toBe(5);
    },
  );
  it.each(['inexistente', 'inativo', 'global', 'outra empresa'])(
    'rejeita perfil %s antes de escrever',
    async (caso) => {
      if (caso === 'inexistente') perfis = [];
      if (caso === 'inativo') perfis[0].ativo = false;
      if (caso === 'global') {
        perfis[0].escopo = 'SISTEMA';
        perfis[0].empresaId = null;
      }
      if (caso === 'outra empresa') perfis[0].empresaId = 'empresa-b';
      await expect(put(['p1', 'p2'])).rejects.toBeInstanceOf(
        BadRequestException,
      );
      semEscritas();
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    },
  );
  it('ADMIN não delega permissão fora da allowlist', async () => {
    perfis[0].permissoes[0].permissao.chave = permissao;
    await expect(put(['p1'])).rejects.toBeInstanceOf(ForbiddenException);
    semEscritas();
  });
  it('ADMIN não delega permissão que não possui', async () => {
    ator.permissoes = [permissao];
    await expect(put(['p1'])).rejects.toBeInstanceOf(ForbiddenException);
    semEscritas();
  });
  it.each(['negada', 'inativa'])(
    'permissão %s não entra no cálculo de delegação',
    async (caso) => {
      const item = perfis[0].permissoes[0];
      item.permissao.chave = permissao;
      if (caso === 'negada') item.permitido = false;
      else item.permissao.ativo = false;
      await expect(put(['p1'])).resolves.toHaveLength(1);
    },
  );
  it('SUPER atribui perfil empresarial sem allowlist operacional', async () => {
    ator.tipo = 'SUPER_ADMIN';
    ator.empresaId = null;
    perfis[0].permissoes[0].permissao.chave = permissao;
    await expect(put(['p1'])).resolves.toHaveLength(1);
  });
  it('SUPER também não atribui perfil global', async () => {
    ator.tipo = 'SUPER_ADMIN';
    ator.empresaId = null;
    perfis[0].escopo = 'SISTEMA';
    perfis[0].empresaId = null;
    await expect(put(['p1'])).rejects.toBeInstanceOf(BadRequestException);
    semEscritas();
  });
  it.each(['GET', 'PUT'])(
    '%s exige permissão administrativa',
    async (metodo) => {
      ator.permissoes = [];
      await expect(
        metodo === 'GET' ? service.listarPerfis('alvo', ator) : put([]),
      ).rejects.toBeInstanceOf(ForbiddenException);
      semEscritas();
    },
  );
  it('permissão revogada no banco bloqueia dentro da transação', async () => {
    tx.usuarioPerfil.count.mockResolvedValue(0);
    await expect(put(['p1'])).rejects.toBeInstanceOf(ForbiddenException);
    semEscritas();
  });
  it('sessão obsoleta bloqueia antes da mutação', async () => {
    tx.usuario.findUnique.mockResolvedValue({
      ...ator,
      ativo: true,
      versaoAutorizacao: 1,
    });
    await expect(put(['p1'])).rejects.toMatchObject({ status: 401 });
    semEscritas();
  });
  it('falha de auditoria simula rollback de vínculos e revogação', async () => {
    const antes = structuredClone({ alvo, vinculos });
    tx.auditoriaLog.create.mockRejectedValue(new Error('falha de auditoria'));
    await expect(put(['p1'])).rejects.toThrow('falha de auditoria');
    expect({ alvo, vinculos }).toEqual(antes);
    expect(auditorias).toEqual([]);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
  it('permite alvo ADMIN_EMPRESA inativo sem alterar tipo ou atividade', async () => {
    alvo.tipo = 'ADMIN_EMPRESA';
    alvo.ativo = false;
    await put(['p1']);
    expect(alvo.tipo).toBe('ADMIN_EMPRESA');
    expect(alvo.ativo).toBe(false);
  });
  const conflito = (code: string, sql?: string) =>
    new Prisma.PrismaClientKnownRequestError('conflito simulado', {
      code,
      clientVersion: 'test',
      meta: sql ? { code: sql } : undefined,
    });
  it.each([
    { code: 'P2034' },
    { code: 'P2010', sql: '40001' },
    { code: 'P2010', sql: '40P01' },
  ])(
    'retry de $code/$sql relê estado e aplica apenas uma mudança',
    async ({ code, sql }) => {
      tx.$queryRaw.mockRejectedValueOnce(conflito(code, sql));
      await put(['p1']);
      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
      expect(alvo.versaoAutorizacao).toBe(6);
      expect(auditorias).toHaveLength(1);
      expect(vinculos).toEqual([{ perfilId: 'p1', ativo: true }]);
    },
  );
  it('encerra conflitos serializáveis após três tentativas', async () => {
    tx.$queryRaw.mockRejectedValue(conflito('P2034'));
    await expect(put(['p1'])).rejects.toMatchObject({ status: 409 });
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
    semEscritas();
  });
  it('retry revalida sessão revogada entre tentativas', async () => {
    tx.perfil.findMany.mockRejectedValueOnce(conflito('P2034'));
    tx.usuario.findUnique
      .mockResolvedValueOnce({ ...ator, ativo: true })
      .mockResolvedValue({ ...ator, ativo: true, versaoAutorizacao: 1 });
    await expect(put(['p1'])).rejects.toMatchObject({ status: 401 });
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    semEscritas();
  });
});
