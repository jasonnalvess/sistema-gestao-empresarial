import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import { EstoqueController } from './estoque.controller';
import { EstoqueService } from './estoque.service';

const empresa = { empresaId: 'empresa-1', origem: 'JWT' as const };
const usuario: AuthenticatedUser = {
  id: 'usuario-1',
  email: 'u@e.com',
  tipo: 'ADMIN_EMPRESA',
  empresaId: 'empresa-1',
};
const roles = ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA'];

describe('EstoqueController', () => {
  const service = {
    criar: jest.fn(),
    listar: jest.fn(),
    buscarPorId: jest.fn(),
    atualizar: jest.fn(),
  };
  const controller = new EstoqueController(
    service as unknown as EstoqueService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('deve ser definido', () => expect(controller).toBeDefined());

  it('declara os quatro guards na ordem oficial', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, EstoqueController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
      PermissionsGuard,
      EmpresaContextoGuard,
    ]);
  });

  it.each([
    ['criar', 'estoque.ajustes.realizar'],
    ['listar', 'estoque.visualizar'],
    ['buscarPorId', 'estoque.visualizar'],
    ['atualizar', 'estoque.ajustes.realizar'],
  ] as const)('protege %s com %s e os três papéis', (metodo, permissao) => {
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, EstoqueController.prototype[metodo]),
    ).toEqual([permissao]);
    expect(
      Reflect.getMetadata(ROLES_KEY, EstoqueController.prototype[metodo]),
    ).toEqual(roles);
  });

  it('encaminha empresaId, IDs, DTOs, filtros e usuário', async () => {
    const criar = { produtoId: 'p1', depositoId: 'd1' };
    const atualizar = { estoqueMinimo: 2 };
    const filtros = { page: 1 };
    await Promise.all([
      controller.criar(empresa, criar, usuario),
      controller.listar(empresa, filtros),
      controller.buscarPorId(empresa, 's1'),
      controller.atualizar(empresa, 's1', atualizar, usuario),
    ]);
    expect(service.criar).toHaveBeenCalledWith('empresa-1', criar, usuario);
    expect(service.listar).toHaveBeenCalledWith('empresa-1', filtros);
    expect(service.buscarPorId).toHaveBeenCalledWith('empresa-1', 's1');
    expect(service.atualizar).toHaveBeenCalledWith(
      'empresa-1',
      's1',
      atualizar,
      usuario,
    );
  });
});
