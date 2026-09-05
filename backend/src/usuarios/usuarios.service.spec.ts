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
      count: jest.fn(),
      update: jest.fn(),
    },
    empresa: { findUnique: jest.fn() },
    $transaction: jest.fn(),
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const superAdmin: AuthenticatedUser = {
    id: 'super',
    email: 'super@example.com',
    tipo: 'SUPER_ADMIN',
    empresaId: null,
  };
  const admin: AuthenticatedUser = {
    id: 'admin',
    email: 'admin@example.com',
    tipo: 'ADMIN_EMPRESA',
    empresaId: 'empresa-a',
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
          tipo: 'ADMIN_EMPRESA',
          empresaId: 'empresa-a',
        });
        await executar(operacao, admin);
        expect(prismaServiceMock.usuario.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'alvo' },
            data:
              operacao === 'atualizar'
                ? { nome: 'Nome atualizado', email: undefined, tipo: undefined }
                : { ativo: operacao === 'ativar' },
          }),
        );
      },
    );

    it.each(operacoes)(
      'SUPER_ADMIN continua podendo %s usuário empresarial de outra empresa',
      async (operacao) => {
        prismaServiceMock.usuario.findUnique.mockResolvedValueOnce({
          id: 'alvo',
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
