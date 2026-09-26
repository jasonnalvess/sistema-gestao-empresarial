import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import { CategoriasProdutosController } from './categorias-produtos.controller';
import { CategoriasProdutosService } from './categorias-produtos.service';

const empresa = { empresaId: 'empresa-1', origem: 'JWT' as const };
const roles = ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA'];

describe('CategoriasProdutosController', () => {
  const service = {
    criar: jest.fn(),
    listar: jest.fn(),
    buscarPorId: jest.fn(),
    atualizar: jest.fn(),
    ativar: jest.fn(),
    desativar: jest.fn(),
  };
  const controller = new CategoriasProdutosController(
    service as unknown as CategoriasProdutosService,
  );

  beforeEach(() => jest.clearAllMocks());
  it('deve ser definido', () => expect(controller).toBeDefined());
  it('declara os quatro guards na ordem oficial', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, CategoriasProdutosController),
    ).toEqual([
      JwtAuthGuard,
      RolesGuard,
      PermissionsGuard,
      EmpresaContextoGuard,
    ]);
  });
  it.each([
    ['criar', 'estoque.categorias.criar'],
    ['listar', 'estoque.categorias.visualizar'],
    ['buscarPorId', 'estoque.categorias.visualizar'],
    ['atualizar', 'estoque.categorias.editar'],
    ['ativar', 'estoque.categorias.editar'],
    ['desativar', 'estoque.categorias.editar'],
  ] as const)('protege %s com %s', (metodo, permissao) => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        CategoriasProdutosController.prototype[metodo],
      ),
    ).toEqual([permissao]);
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        CategoriasProdutosController.prototype[metodo],
      ),
    ).toEqual(roles);
  });
  it('encaminha empresaId, IDs, DTOs e filtros', async () => {
    const criar = { nome: 'Categoria' };
    const atualizar = { nome: 'Nova' };
    const filtros = { page: 1 };
    await Promise.all([
      controller.criar(empresa, criar),
      controller.listar(empresa, filtros),
      controller.buscarPorId(empresa, 'id'),
      controller.atualizar(empresa, 'id', atualizar),
      controller.ativar(empresa, 'id'),
      controller.desativar(empresa, 'id'),
    ]);
    expect(service.criar).toHaveBeenCalledWith('empresa-1', criar);
    expect(service.listar).toHaveBeenCalledWith('empresa-1', filtros);
    expect(service.buscarPorId).toHaveBeenCalledWith('empresa-1', 'id');
    expect(service.atualizar).toHaveBeenCalledWith(
      'empresa-1',
      'id',
      atualizar,
    );
    expect(service.ativar).toHaveBeenCalledWith('empresa-1', 'id');
    expect(service.desativar).toHaveBeenCalledWith('empresa-1', 'id');
  });
});
