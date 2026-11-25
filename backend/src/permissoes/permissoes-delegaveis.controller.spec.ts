import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PermissoesController } from './permissoes.controller';
import { PermissoesService } from './permissoes.service';

describe('PermissoesController - delegaveis', () => {
  let controller: PermissoesController;

  const service = {
    listar: jest.fn(),
    listarDelegaveis: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermissoesController],
      providers: [
        {
          provide: PermissoesService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get(PermissoesController);
  });

  it('encaminha ator autenticado para o service', async () => {
    const ator: AuthenticatedUser = {
      id: 'admin-1',
      email: 'admin@sistema.com',
      tipo: 'ADMIN_EMPRESA',
      empresaId: 'empresa-1',
      permissoes: ['clientes.visualizar'],
    };

    service.listarDelegaveis.mockResolvedValue({
      data: [],
      meta: {
        total: 0,
        page: 1,
        limit: 0,
        totalPages: 0,
      },
    });

    await controller.listarDelegaveis(ator);

    expect(service.listarDelegaveis).toHaveBeenCalledWith(ator);
  });
});
