import { Test, TestingModule } from '@nestjs/testing';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { ClientesController } from './clientes.controller';
import { ClientesService } from './clientes.service';
import { AtualizarClienteDto } from './dto/atualizar-cliente.dto';
import { CriarClienteDto } from './dto/criar-cliente.dto';
import { FiltroClientesDto } from './dto/filtro-clientes.dto';

describe('ClientesController', () => {
  let controller: ClientesController;

  const clientesServiceMock = {
    criar: jest.fn(),
    listar: jest.fn(),
    buscarPorId: jest.fn(),
    atualizar: jest.fn(),
    ativar: jest.fn(),
    desativar: jest.fn(),
    adicionarHistorico: jest.fn(),
    listarHistorico: jest.fn(),
  };

  const usuario: AuthenticatedUser = {
    id: 'usuario-1',
    email: 'usuario@empresa.com',
    tipo: 'ADMIN_EMPRESA',
    empresaId: 'empresa-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientesController],
      providers: [{ provide: ClientesService, useValue: clientesServiceMock }],
    }).compile();

    controller = module.get<ClientesController>(ClientesController);
    jest.clearAllMocks();
  });

  it('deve ser definido', () => {
    expect(controller).toBeDefined();
  });

  it('deve encaminhar DTOs, ID, filtros e usuário ao service', async () => {
    const criarDto: CriarClienteDto = { nome: 'Cliente' };
    const atualizarDto: AtualizarClienteDto = { email: 'novo@cliente.com' };
    const filtros: FiltroClientesDto = { page: 2, limit: 20, ativo: 'true' };

    await Promise.all([
      controller.criar(criarDto, usuario),
      controller.listar(usuario, filtros),
      controller.buscarPorId('cliente-1', usuario),
      controller.atualizar('cliente-1', atualizarDto, usuario),
      controller.ativar('cliente-1', usuario),
      controller.desativar('cliente-1', usuario),
      controller.adicionarHistorico(
        'cliente-1',
        { descricao: 'Contato' },
        usuario,
      ),
      controller.listarHistorico('cliente-1', usuario),
    ]);

    expect(clientesServiceMock.criar).toHaveBeenCalledWith(criarDto, usuario);
    expect(clientesServiceMock.listar).toHaveBeenCalledWith(usuario, filtros);
    expect(clientesServiceMock.buscarPorId).toHaveBeenCalledWith(
      'cliente-1',
      usuario,
    );
    expect(clientesServiceMock.atualizar).toHaveBeenCalledWith(
      'cliente-1',
      atualizarDto,
      usuario,
    );
    expect(clientesServiceMock.ativar).toHaveBeenCalledWith(
      'cliente-1',
      usuario,
    );
    expect(clientesServiceMock.desativar).toHaveBeenCalledWith(
      'cliente-1',
      usuario,
    );
    expect(clientesServiceMock.adicionarHistorico).toHaveBeenCalledWith(
      'cliente-1',
      { descricao: 'Contato' },
      usuario,
    );
    expect(clientesServiceMock.listarHistorico).toHaveBeenCalledWith(
      'cliente-1',
      usuario,
    );
  });

  it.each([
    ['criar', 'clientes.criar'],
    ['listar', 'clientes.visualizar'],
    ['buscarPorId', 'clientes.visualizar'],
    ['listarHistorico', 'clientes.visualizar'],
    ['atualizar', 'clientes.editar'],
    ['ativar', 'clientes.editar'],
    ['desativar', 'clientes.editar'],
    ['adicionarHistorico', 'clientes.editar'],
  ] as const)('deve exigir %s em %s', (metodo, permissao) => {
    const metadata = Reflect.getMetadata(
      PERMISSIONS_KEY,
      ClientesController.prototype[metodo],
    ) as unknown;

    expect(metadata).toEqual([permissao]);
  });
});
