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
