import { Test, TestingModule } from '@nestjs/testing';
import type { Prisma } from '@prisma/client';
import { PaginatedResponse } from '../common/responses/paginated-response';
import { PrismaService } from '../prisma/prisma.service';
import { PERMISSOES_EMPRESARIAIS_DELEGAVEIS } from '../perfis/permissoes-delegaveis';
import { PermissoesService } from './permissoes.service';

describe('PermissoesService - delegaveis', () => {
  let service: PermissoesService;

  const findMany = jest.fn<
    Promise<
      Array<{
        id: string;
        chave: string;
        nome: string;
        descricao: string | null;
        modulo: string;
        ativo: boolean;
      }>
    >,
    [Prisma.PermissaoFindManyArgs]
  >();

  const count = jest.fn<Promise<number>, [Prisma.PermissaoCountArgs]>();

  const prisma = {
    permissao: {
      findMany,
      count,
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissoesService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get(PermissoesService);
  });

  it('SUPER_ADMIN consulta exatamente o catálogo delegável ativo', async () => {
    prisma.permissao.findMany.mockResolvedValue([
      {
        id: 'p1',
        chave: 'agenda.visualizar',
        nome: 'Visualizar agenda',
        descricao: null,
        modulo: 'agenda',
        ativo: true,
      },
    ]);

    const resultado = await service.listarDelegaveis({
      id: 'super-1',
      email: 'super@sistema.com',
      tipo: 'SUPER_ADMIN',
      empresaId: null,
      permissoes: ['sistema.editar'],
    });

    expect(findMany).toHaveBeenCalledWith({
      where: {
        ativo: true,
        chave: {
          in: [...PERMISSOES_EMPRESARIAIS_DELEGAVEIS],
        },
      },
      select: {
        id: true,
        chave: true,
        nome: true,
        descricao: true,
        modulo: true,
        ativo: true,
      },
      orderBy: {
        chave: 'asc',
      },
    });

    expect(resultado.meta.total).toBe(1);
    expect(resultado.data).toHaveLength(1);
  });

  it('retorna PaginatedResponse para o interceptor preservar o contrato paginado', async () => {
    prisma.permissao.findMany.mockResolvedValue([
      {
        id: 'p1',
        chave: 'agenda.visualizar',
        nome: 'Visualizar agenda',
        descricao: null,
        modulo: 'agenda',
        ativo: true,
      },
    ]);

    const resultado = await service.listarDelegaveis({
      id: 'super-1',
      email: 'super@sistema.com',
      tipo: 'SUPER_ADMIN',
      empresaId: null,
      permissoes: [],
    });

    expect(resultado).toBeInstanceOf(PaginatedResponse);
    expect(resultado.data).toHaveLength(1);
    expect(resultado.meta).toEqual({
      total: 1,
      page: 1,
      limit: 1,
      totalPages: 1,
    });
  });

  it('retorna PaginatedResponse também quando não há permissões delegáveis', async () => {
    const resultado = await service.listarDelegaveis({
      id: 'admin-1',
      email: 'admin@sistema.com',
      tipo: 'ADMIN_EMPRESA',
      empresaId: 'empresa-1',
      permissoes: [],
    });

    expect(resultado).toBeInstanceOf(PaginatedResponse);
    expect(resultado.data).toEqual([]);
    expect(resultado.meta).toEqual({
      total: 0,
      page: 1,
      limit: 0,
      totalPages: 0,
    });
  });

  it('ADMIN_EMPRESA recebe somente interseção entre catálogo e próprias permissões', async () => {
    prisma.permissao.findMany.mockResolvedValue([
      {
        id: 'p1',
        chave: 'clientes.visualizar',
        nome: 'Visualizar clientes',
        descricao: null,
        modulo: 'clientes',
        ativo: true,
      },
    ]);

    await service.listarDelegaveis({
      id: 'admin-1',
      email: 'admin@sistema.com',
      tipo: 'ADMIN_EMPRESA',
      empresaId: 'empresa-1',
      permissoes: [
        'clientes.visualizar',
        'perfis.permissoes.gerenciar',
        'sistema.editar',
      ],
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          ativo: true,
          chave: {
            in: ['clientes.visualizar'],
          },
        },
      }),
    );
  });

  it('não consulta banco quando ADMIN não possui nenhuma delegável', async () => {
    const resultado = await service.listarDelegaveis({
      id: 'admin-1',
      email: 'admin@sistema.com',
      tipo: 'ADMIN_EMPRESA',
      empresaId: 'empresa-1',
      permissoes: [
        'perfis.visualizar',
        'perfis.permissoes.gerenciar',
        'sistema.editar',
      ],
    });

    expect(findMany).not.toHaveBeenCalled();

    expect(resultado).toEqual({
      data: [],
      meta: {
        total: 0,
        page: 1,
        limit: 0,
        totalPages: 0,
      },
    });
  });

  it('não inclui chave não delegável mesmo quando ADMIN a possui', async () => {
    prisma.permissao.findMany.mockResolvedValue([]);

    await service.listarDelegaveis({
      id: 'admin-1',
      email: 'admin@sistema.com',
      tipo: 'ADMIN_EMPRESA',
      empresaId: 'empresa-1',
      permissoes: [
        'usuarios.editar',
        'clientes.visualizar',
        'perfis.permissoes.gerenciar',
      ],
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          ativo: true,
          chave: {
            in: ['clientes.visualizar'],
          },
        },
      }),
    );
  });

  it('consulta somente permissões ativas', async () => {
    prisma.permissao.findMany.mockResolvedValue([]);

    await service.listarDelegaveis({
      id: 'super-1',
      email: 'super@sistema.com',
      tipo: 'SUPER_ADMIN',
      empresaId: null,
      permissoes: [],
    });

    expect(findMany).toHaveBeenCalledWith({
      where: {
        ativo: true,
        chave: {
          in: [...PERMISSOES_EMPRESARIAIS_DELEGAVEIS],
        },
      },
      select: {
        id: true,
        chave: true,
        nome: true,
        descricao: true,
        modulo: true,
        ativo: true,
      },
      orderBy: {
        chave: 'asc',
      },
    });
  });

  it('tolera permissoes ausentes no ator sem lançar erro', async () => {
    const resultado = await service.listarDelegaveis({
      id: 'admin-1',
      email: 'admin@sistema.com',
      tipo: 'ADMIN_EMPRESA',
      empresaId: 'empresa-1',
    });

    expect(resultado.data).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });
});
