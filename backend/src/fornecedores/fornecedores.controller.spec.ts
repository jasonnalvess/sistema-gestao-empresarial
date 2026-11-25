import { Test, TestingModule } from '@nestjs/testing';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import { FornecedoresController } from './fornecedores.controller';
import { FornecedoresService } from './fornecedores.service';
import { AtualizarFornecedorDto } from './dto/atualizar-fornecedor.dto';
import { CriarFornecedorDto } from './dto/criar-fornecedor.dto';
import { FiltroFornecedoresDto } from './dto/filtro-fornecedores.dto';

describe('FornecedoresController', () => {
  let controller: FornecedoresController;

  const serviceMock = {
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
      controllers: [FornecedoresController],
      providers: [
        {
          provide: FornecedoresService,
          useValue: serviceMock,
        },
      ],
    })
      .overrideGuard(EmpresaContextoGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FornecedoresController>(FornecedoresController);

    jest.clearAllMocks();
  });

  it('deve ser definido', () => {
    expect(controller).toBeDefined();
  });

  it('deve encaminhar empresa, DTOs, ID, filtros e usuário ao service', async () => {
    const criarDto: CriarFornecedorDto = {
      razaoSocial: 'Fornecedor',
      documento: '12345678000199',
    };
    const atualizarDto: AtualizarFornecedorDto = {
      email: 'novo@fornecedor.com',
    };
    const filtros: FiltroFornecedoresDto = { page: 2, limit: 20 };

    await Promise.all([
      controller.criar(empresa, criarDto, usuario),
      controller.listar(empresa, filtros),
      controller.buscarPorId(empresa, 'fornecedor-1'),
      controller.atualizar(empresa, 'fornecedor-1', atualizarDto, usuario),
      controller.ativar(empresa, 'fornecedor-1', usuario),
      controller.desativar(empresa, 'fornecedor-1', usuario),
      controller.adicionarHistorico(
        empresa,
        'fornecedor-1',
        { descricao: 'Contato' },
        usuario,
      ),
      controller.listarHistorico(empresa, 'fornecedor-1'),
    ]);

    expect(serviceMock.criar).toHaveBeenCalledWith(
      'empresa-1',
      criarDto,
      usuario,
    );
    expect(serviceMock.listar).toHaveBeenCalledWith('empresa-1', filtros);
    expect(serviceMock.buscarPorId).toHaveBeenCalledWith(
      'empresa-1',
      'fornecedor-1',
    );
    expect(serviceMock.atualizar).toHaveBeenCalledWith(
      'empresa-1',
      'fornecedor-1',
      atualizarDto,
      usuario,
    );
    expect(serviceMock.ativar).toHaveBeenCalledWith(
      'empresa-1',
      'fornecedor-1',
      usuario,
    );
    expect(serviceMock.desativar).toHaveBeenCalledWith(
      'empresa-1',
      'fornecedor-1',
      usuario,
    );
    expect(serviceMock.adicionarHistorico).toHaveBeenCalledWith(
      'empresa-1',
      'fornecedor-1',
      { descricao: 'Contato' },
      usuario,
    );
    expect(serviceMock.listarHistorico).toHaveBeenCalledWith(
      'empresa-1',
      'fornecedor-1',
    );
  });

  it('declara os guards na ordem JWT, papéis, permissões e empresa', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, FornecedoresController),
    ).toEqual([
      JwtAuthGuard,
      RolesGuard,
      PermissionsGuard,
      EmpresaContextoGuard,
    ]);
  });

  it.each([
    ['criar', 'fornecedores.criar'],
    ['listar', 'fornecedores.visualizar'],
    ['buscarPorId', 'fornecedores.visualizar'],
    ['listarHistorico', 'fornecedores.visualizar'],
    ['atualizar', 'fornecedores.editar'],
    ['ativar', 'fornecedores.editar'],
    ['desativar', 'fornecedores.editar'],
    ['adicionarHistorico', 'fornecedores.editar'],
  ] as const)('deve exigir %s em %s', (metodo, permissao) => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        FornecedoresController.prototype[metodo],
      ),
    ).toEqual([permissao]);
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
  ] as const)('deve aceitar os três papéis em %s', (metodo) => {
    expect(
      Reflect.getMetadata(ROLES_KEY, FornecedoresController.prototype[metodo]),
    ).toEqual(['SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA']);
  });
});
