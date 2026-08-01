import { Test, TestingModule } from '@nestjs/testing';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import type { EmpresaContexto } from '../common/types/empresa-contexto.type';
import { PedidosCompraController } from './pedidos-compra.controller';
import { PedidosCompraService } from './pedidos-compra.service';
import type { CriarPedidoCompraDto } from './dto/criar-pedido-compra.dto';
import type { AtualizarPedidoCompraDto } from './dto/atualizar-pedido-compra.dto';
import type { FiltroPedidosCompraDto } from './dto/filtro-pedidos-compra.dto';
import type { ReceberPedidoCompraDto } from './dto/receber-pedido-compra.dto';

const TRES_PAPEIS = ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA'];

describe('PedidosCompraController', () => {
  let controller: PedidosCompraController;

  const serviceMock = {
    criar: jest.fn(),
    listar: jest.fn(),
    adicionarHistorico: jest.fn(),
    listarHistorico: jest.fn(),
    enviarParaAprovacao: jest.fn(),
    aprovar: jest.fn(),
    cancelar: jest.fn(),
    receber: jest.fn(),
    buscarPorId: jest.fn(),
    atualizar: jest.fn(),
  };

  const empresa: EmpresaContexto = {
    empresaId: 'empresa-1',
    origem: 'JWT',
  };
  const usuario: AuthenticatedUser = {
    id: 'usuario-1',
    email: 'usuario@empresa.com',
    empresaId: 'empresa-1',
    tipo: 'ADMIN_EMPRESA',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PedidosCompraController],
      providers: [{ provide: PedidosCompraService, useValue: serviceMock }],
    })
      .overrideGuard(EmpresaContextoGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(PedidosCompraController);
    jest.clearAllMocks();
  });

  it('deve ser definido', () => {
    expect(controller).toBeDefined();
  });

  it('declara os guards na ordem oficial', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, PedidosCompraController),
    ).toEqual([
      JwtAuthGuard,
      RolesGuard,
      PermissionsGuard,
      EmpresaContextoGuard,
    ]);
  });

  it.each([
    ['criar', 'pedidos_compra.criar'],
    ['listar', 'pedidos_compra.visualizar'],
    ['buscarPorId', 'pedidos_compra.visualizar'],
    ['listarHistorico', 'pedidos_compra.visualizar'],
    ['atualizar', 'pedidos_compra.editar'],
    ['adicionarHistorico', 'pedidos_compra.editar'],
    ['enviarParaAprovacao', 'pedidos_compra.editar'],
    ['aprovar', 'pedidos_compra.editar'],
    ['cancelar', 'pedidos_compra.editar'],
    ['receber', 'pedidos_compra.editar'],
  ] as const)('%s exige a permissão %s', (metodo, permissao) => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        PedidosCompraController.prototype[metodo],
      ),
    ).toEqual([permissao]);
  });

  it.each([
    'criar',
    'listar',
    'buscarPorId',
    'listarHistorico',
    'atualizar',
    'adicionarHistorico',
    'enviarParaAprovacao',
    'cancelar',
    'receber',
  ] as const)('%s aceita os três papéis', (metodo) => {
    expect(
      Reflect.getMetadata(ROLES_KEY, PedidosCompraController.prototype[metodo]),
    ).toEqual(TRES_PAPEIS);
  });

  it.each([['aprovar', ['SUPER_ADMIN', 'ADMIN_EMPRESA']]] as const)(
    '%s permanece restrito aos papéis administrativos',
    (metodo, papeis) => {
      expect(
        Reflect.getMetadata(
          ROLES_KEY,
          PedidosCompraController.prototype[metodo],
        ),
      ).toEqual(papeis);
    },
  );

  it('encaminha empresaId, DTOs, filtros, IDs e usuário ao service', async () => {
    const criarDto: CriarPedidoCompraDto = {
      fornecedorId: 'fornecedor-1',
      depositoId: 'deposito-1',
      itens: [
        {
          produtoId: 'produto-1',
          quantidadeSolicitada: 1,
          valorUnitario: 10,
        },
      ],
    };
    const atualizarDto: AtualizarPedidoCompraDto = { observacao: 'Atualizado' };
    const receberDto: ReceberPedidoCompraDto = {
      itens: [{ itemId: 'item-1', quantidadeRecebida: 1 }],
    };
    const filtros: FiltroPedidosCompraDto = { page: 2, limit: 20 };
    const historicoDto = { descricao: 'Anotação manual' };

    await controller.criar(empresa, criarDto, usuario);
    await controller.listar(empresa, filtros);
    await controller.buscarPorId(empresa, 'pedido-1');
    await controller.atualizar(empresa, 'pedido-1', atualizarDto, usuario);
    await controller.adicionarHistorico(
      empresa,
      'pedido-1',
      historicoDto,
      usuario,
    );
    await controller.listarHistorico(empresa, 'pedido-1');
    await controller.enviarParaAprovacao(empresa, 'pedido-1', usuario);
    await controller.aprovar(empresa, 'pedido-1', usuario);
    await controller.cancelar(empresa, 'pedido-1', usuario);
    await controller.receber(empresa, 'pedido-1', receberDto, usuario);

    expect(serviceMock.criar).toHaveBeenCalledWith(
      'empresa-1',
      criarDto,
      usuario,
    );
    expect(serviceMock.listar).toHaveBeenCalledWith('empresa-1', filtros);
    expect(serviceMock.buscarPorId).toHaveBeenCalledWith(
      'empresa-1',
      'pedido-1',
    );
    expect(serviceMock.atualizar).toHaveBeenCalledWith(
      'empresa-1',
      'pedido-1',
      atualizarDto,
      usuario,
    );
    expect(serviceMock.adicionarHistorico).toHaveBeenCalledWith(
      'empresa-1',
      'pedido-1',
      historicoDto,
      usuario,
    );
    expect(serviceMock.listarHistorico).toHaveBeenCalledWith(
      'empresa-1',
      'pedido-1',
    );
    expect(serviceMock.enviarParaAprovacao).toHaveBeenCalledWith(
      'empresa-1',
      'pedido-1',
      usuario,
    );
    expect(serviceMock.aprovar).toHaveBeenCalledWith(
      'empresa-1',
      'pedido-1',
      usuario,
    );
    expect(serviceMock.cancelar).toHaveBeenCalledWith(
      'empresa-1',
      'pedido-1',
      usuario,
    );
    expect(serviceMock.receber).toHaveBeenCalledWith(
      'empresa-1',
      'pedido-1',
      receberDto,
      usuario,
    );
  });
});
