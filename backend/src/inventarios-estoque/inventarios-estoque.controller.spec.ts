import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import { InventariosEstoqueController } from './inventarios-estoque.controller';
import { InventariosEstoqueService } from './inventarios-estoque.service';

const empresa = { empresaId: 'empresa-1', origem: 'JWT' as const };
const usuario: AuthenticatedUser = {
  id: 'usuario-1',
  email: 'u@e.com',
  tipo: 'ADMIN_EMPRESA',
  empresaId: 'empresa-1',
};
const roles = ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA'];

describe('InventariosEstoqueController', () => {
  const service = {
    criar: jest.fn(),
    listar: jest.fn(),
    buscarPorId: jest.fn(),
    atualizar: jest.fn(),
    contarItem: jest.fn(),
    cancelar: jest.fn(),
    finalizar: jest.fn(),
  };
  const controller = new InventariosEstoqueController(
    service as unknown as InventariosEstoqueService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('deve ser definido', () => expect(controller).toBeDefined());

  it('declara os quatro guards na ordem oficial', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, InventariosEstoqueController),
    ).toEqual([
      JwtAuthGuard,
      RolesGuard,
      PermissionsGuard,
      EmpresaContextoGuard,
    ]);
  });

  it.each([
    ['criar', 'estoque.inventarios.criar'],
    ['listar', 'estoque.inventarios.visualizar'],
    ['buscarPorId', 'estoque.inventarios.visualizar'],
    ['atualizar', 'estoque.inventarios.editar'],
    ['contarItem', 'estoque.inventarios.editar'],
    ['cancelar', 'estoque.inventarios.cancelar'],
    ['finalizar', 'estoque.inventarios.finalizar'],
  ] as const)('protege %s com %s e os três papéis', (metodo, permissao) => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        InventariosEstoqueController.prototype[metodo],
      ),
    ).toEqual([permissao]);
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        InventariosEstoqueController.prototype[metodo],
      ),
    ).toEqual(roles);
  });

  it('encaminha empresaId, IDs, DTOs, filtros e usuário', async () => {
    const criar = { depositoId: 'deposito-1' };
    const atualizar = { descricao: 'Contagem anual' };
    const contagem = { quantidadeContada: 3 };
    const filtros = { page: 1 };
    await Promise.all([
      controller.criar(empresa, criar, usuario),
      controller.listar(empresa, filtros),
      controller.buscarPorId(empresa, 'inventario-1'),
      controller.atualizar(empresa, 'inventario-1', atualizar, usuario),
      controller.contarItem(
        empresa,
        'inventario-1',
        'item-1',
        contagem,
        usuario,
      ),
      controller.cancelar(empresa, 'inventario-1', usuario),
      controller.finalizar(empresa, 'inventario-1', usuario),
    ]);
    expect(service.criar).toHaveBeenCalledWith('empresa-1', criar, usuario);
    expect(service.listar).toHaveBeenCalledWith('empresa-1', filtros);
    expect(service.buscarPorId).toHaveBeenCalledWith(
      'empresa-1',
      'inventario-1',
    );
    expect(service.atualizar).toHaveBeenCalledWith(
      'empresa-1',
      'inventario-1',
      atualizar,
      usuario,
    );
    expect(service.contarItem).toHaveBeenCalledWith(
      'empresa-1',
      'inventario-1',
      'item-1',
      contagem,
      usuario,
    );
    expect(service.cancelar).toHaveBeenCalledWith(
      'empresa-1',
      'inventario-1',
      usuario,
    );
    expect(service.finalizar).toHaveBeenCalledWith(
      'empresa-1',
      'inventario-1',
      usuario,
    );
  });
});
