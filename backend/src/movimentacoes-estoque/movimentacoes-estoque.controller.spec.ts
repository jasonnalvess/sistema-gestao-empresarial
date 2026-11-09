import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import { MovimentacoesEstoqueController } from './movimentacoes-estoque.controller';
import { MovimentacoesEstoqueService } from './movimentacoes-estoque.service';
import { TipoMovimentacaoEstoqueDto } from './dto/criar-movimentacao-estoque.dto';

const empresa = { empresaId: 'empresa-1', origem: 'JWT' as const };
const usuario: AuthenticatedUser = {
  id: 'usuario-1',
  email: 'u@e.com',
  tipo: 'ADMIN_EMPRESA',
  empresaId: 'empresa-1',
};
const roles = ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA'];

describe('MovimentacoesEstoqueController', () => {
  const service = {
    criar: jest.fn(),
    transferir: jest.fn(),
    listar: jest.fn(),
  };
  const controller = new MovimentacoesEstoqueController(
    service as unknown as MovimentacoesEstoqueService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('deve ser definido', () => expect(controller).toBeDefined());

  it('declara os quatro guards na ordem oficial', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, MovimentacoesEstoqueController),
    ).toEqual([
      JwtAuthGuard,
      RolesGuard,
      PermissionsGuard,
      EmpresaContextoGuard,
    ]);
  });

  it.each(['criar', 'transferir', 'listar'] as const)(
    'aceita os três papéis em %s',
    (metodo) => {
      expect(
        Reflect.getMetadata(
          ROLES_KEY,
          MovimentacoesEstoqueController.prototype[metodo],
        ),
      ).toEqual(roles);
    },
  );

  it('usa autorização dinâmica no registro polimórfico', () => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        MovimentacoesEstoqueController.prototype['criar'],
      ),
    ).toBeUndefined();
  });

  it('protege transferência e listagem com permissões específicas', () => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        MovimentacoesEstoqueController.prototype['transferir'],
      ),
    ).toEqual(['estoque.transferencias.realizar']);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        MovimentacoesEstoqueController.prototype['listar'],
      ),
    ).toEqual(['estoque.movimentacoes.visualizar']);
  });

  it('encaminha empresaId, DTOs, filtros e usuário', async () => {
    const movimento = {
      produtoId: 'p1',
      depositoId: 'd1',
      tipo: TipoMovimentacaoEstoqueDto.ENTRADA,
      quantidade: 1,
    };
    const transferencia = {
      produtoId: 'p1',
      depositoOrigemId: 'd1',
      depositoDestinoId: 'd2',
      quantidade: 1,
    };
    const filtros = { page: 1 };
    await Promise.all([
      controller.criar(empresa, movimento, usuario),
      controller.transferir(empresa, transferencia, usuario),
      controller.listar(empresa, filtros),
    ]);
    expect(service.criar).toHaveBeenCalledWith('empresa-1', movimento, usuario);
    expect(service.transferir).toHaveBeenCalledWith(
      'empresa-1',
      transferencia,
      usuario,
    );
    expect(service.listar).toHaveBeenCalledWith('empresa-1', filtros);
  });
});
