import { Test, TestingModule } from '@nestjs/testing';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
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

  const empresa = { empresaId: 'empresa-1', origem: 'JWT' as const };

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
    })
      .overrideGuard(EmpresaContextoGuard)
      .useValue({ canActivate: () => true })
      .compile();

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
      controller.criar(empresa, criarDto, usuario),
      controller.listar(empresa, filtros),
      controller.buscarPorId(empresa, 'cliente-1'),
      controller.atualizar(empresa, 'cliente-1', atualizarDto, usuario),
      controller.ativar(empresa, 'cliente-1', usuario),
      controller.desativar(empresa, 'cliente-1', usuario),
      controller.adicionarHistorico(
        empresa,
        'cliente-1',
        { descricao: 'Contato' },
        usuario,
      ),
      controller.listarHistorico(empresa, 'cliente-1'),
    ]);

    expect(clientesServiceMock.criar).toHaveBeenCalledWith(
      'empresa-1',
      criarDto,
      usuario,
    );
    expect(clientesServiceMock.listar).toHaveBeenCalledWith(
      'empresa-1',
      filtros,
    );
    expect(clientesServiceMock.buscarPorId).toHaveBeenCalledWith(
      'empresa-1',
      'cliente-1',
    );
    expect(clientesServiceMock.atualizar).toHaveBeenCalledWith(
      'empresa-1',
      'cliente-1',
      atualizarDto,
      usuario,
    );
    expect(clientesServiceMock.ativar).toHaveBeenCalledWith(
      'empresa-1',
      'cliente-1',
      usuario,
    );
    expect(clientesServiceMock.desativar).toHaveBeenCalledWith(
      'empresa-1',
      'cliente-1',
      usuario,
    );
    expect(clientesServiceMock.adicionarHistorico).toHaveBeenCalledWith(
      'empresa-1',
      'cliente-1',
      { descricao: 'Contato' },
      usuario,
    );
    expect(clientesServiceMock.listarHistorico).toHaveBeenCalledWith(
      'empresa-1',
      'cliente-1',
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
  it('declara os guards na ordem JWT, papéis, permissões e empresa', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, ClientesController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
      PermissionsGuard,
      EmpresaContextoGuard,
    ]);
  });

  it.each([
    'criar',
    'listar',
    'buscarPorId',
    'listarHistorico',
    'atualizar',
    'ativar',
    'desativar',
    'adicionarHistorico',
  ] as const)('deve aceitar SUPER_ADMIN no papel de %s', (metodo) => {
    const metadata = Reflect.getMetadata(
      ROLES_KEY,
      ClientesController.prototype[metodo],
    ) as string[];

    expect(metadata).toContain('SUPER_ADMIN');
  });
});
