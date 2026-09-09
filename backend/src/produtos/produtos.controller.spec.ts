import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import { ProdutosController } from './produtos.controller';
import { ProdutosService } from './produtos.service';

const empresa = { empresaId: 'empresa-1', origem: 'JWT' as const };
const usuario: AuthenticatedUser = {
  id: 'usuario-1',
  email: 'u@e.com',
  tipo: 'ADMIN_EMPRESA',
  empresaId: 'empresa-1',
};
const roles = ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA'];

describe('ProdutosController', () => {
  const service = {
    criar: jest.fn(),
    listar: jest.fn(),
    buscarPorId: jest.fn(),
    atualizar: jest.fn(),
    ativar: jest.fn(),
    desativar: jest.fn(),
    adicionarHistorico: jest.fn(),
    listarHistorico: jest.fn(),
  };
  const controller = new ProdutosController(
    service as unknown as ProdutosService,
  );
  beforeEach(() => jest.clearAllMocks());

  it('deve ser definido', () => expect(controller).toBeDefined());
  it('declara os quatro guards na ordem oficial', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, ProdutosController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
      PermissionsGuard,
      EmpresaContextoGuard,
    ]);
  });
  it.each([
    ['criar', 'estoque.produtos.criar'],
    ['listar', 'estoque.produtos.visualizar'],
    ['buscarPorId', 'estoque.produtos.visualizar'],
    ['listarHistorico', 'estoque.produtos.visualizar'],
    ['atualizar', 'estoque.produtos.editar'],
    ['ativar', 'estoque.produtos.editar'],
    ['desativar', 'estoque.produtos.editar'],
    ['adicionarHistorico', 'estoque.produtos.editar'],
  ] as const)('protege %s com %s e os três papéis', (metodo, permissao) => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        ProdutosController.prototype[metodo],
      ),
    ).toEqual([permissao]);
    expect(
      Reflect.getMetadata(ROLES_KEY, ProdutosController.prototype[metodo]),
    ).toEqual(roles);
  });
  it('encaminha empresaId, IDs, DTOs, filtros e usuário', async () => {
    const criar = { nome: 'Produto', precoVenda: 10 };
    const atualizar = { nome: 'Novo' };
    const filtros = { page: 1 };
    const historico = { descricao: 'Nota' };
    await Promise.all([
      controller.criar(empresa, criar, usuario),
      controller.listar(empresa, filtros),
      controller.buscarPorId(empresa, 'p1'),
      controller.atualizar(empresa, 'p1', atualizar, usuario),
      controller.ativar(empresa, 'p1', usuario),
      controller.desativar(empresa, 'p1', usuario),
      controller.adicionarHistorico(empresa, 'p1', historico, usuario),
      controller.listarHistorico(empresa, 'p1'),
    ]);
    expect(service.criar).toHaveBeenCalledWith('empresa-1', criar, usuario);
    expect(service.listar).toHaveBeenCalledWith('empresa-1', filtros);
    expect(service.buscarPorId).toHaveBeenCalledWith('empresa-1', 'p1');
    expect(service.atualizar).toHaveBeenCalledWith(
      'empresa-1',
      'p1',
      atualizar,
      usuario,
    );
    expect(service.ativar).toHaveBeenCalledWith('empresa-1', 'p1', usuario);
    expect(service.desativar).toHaveBeenCalledWith('empresa-1', 'p1', usuario);
    expect(service.adicionarHistorico).toHaveBeenCalledWith(
      'empresa-1',
      'p1',
      historico,
      usuario,
    );
    expect(service.listarHistorico).toHaveBeenCalledWith('empresa-1', 'p1');
  });
});
