import { GUARDS_METADATA } from '@nestjs/common/constants';
import { FormaPagamento } from '@prisma/client';

import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';

import { ContasPagarController } from './contas-pagar.controller';
import { ContasPagarService } from './contas-pagar.service';

const empresa = { empresaId: 'empresa-1', origem: 'JWT' as const };
const usuario: AuthenticatedUser = {
  id: 'usuario-1',
  email: 'usuario@empresa.com',
  empresaId: 'empresa-1',
  tipo: 'ADMIN_EMPRESA',
};

describe('ContasPagarController', () => {
  let controller: ContasPagarController;
  let service: Record<string, jest.Mock>;

  beforeEach(() => {
    service = {
      criar: jest.fn(),
      listar: jest.fn(),
      buscarPorId: jest.fn(),
      atualizar: jest.fn(),
      registrarPagamento: jest.fn(),
      cancelar: jest.fn(),
      gerarAPartirPedidoCompra: jest.fn(),
      adicionarHistorico: jest.fn(),
      listarHistorico: jest.fn(),
    };
    controller = new ContasPagarController(
      service as unknown as ContasPagarService,
    );
  });

  it('deve ser definido', () => {
    expect(controller).toBeDefined();
  });

  it('encaminha empresa, DTOs, IDs, filtros e usuário ao service', async () => {
    const criarDto = {
      descricao: 'Conta',
      dataVencimento: '2026-08-10',
      valorOriginal: 10,
    };
    const atualizarDto = { descricao: 'Nova' };
    const pagamentoDto = { valor: 10, formaPagamento: FormaPagamento.PIX };
    const historicoDto = { descricao: 'Anotação' };
    const gerarDto = { dataVencimento: '2026-08-10' };
    const filtros = { page: 2, limit: 20 };

    await Promise.all([
      controller.criar(empresa, criarDto, usuario),
      controller.listar(empresa, filtros),
      controller.buscarPorId(empresa, 'conta-1'),
      controller.atualizar(empresa, 'conta-1', atualizarDto, usuario),
      controller.registrarPagamento(empresa, 'conta-1', pagamentoDto, usuario),
      controller.cancelar(empresa, 'conta-1', usuario),
      controller.gerarAPartirPedidoCompra(
        empresa,
        'pedido-1',
        gerarDto,
        usuario,
      ),
      controller.adicionarHistorico(empresa, 'conta-1', historicoDto, usuario),
      controller.listarHistorico(empresa, 'conta-1'),
    ]);

    expect(service.criar).toHaveBeenCalledWith('empresa-1', criarDto, usuario);
    expect(service.listar).toHaveBeenCalledWith('empresa-1', filtros);
    expect(service.buscarPorId).toHaveBeenCalledWith('empresa-1', 'conta-1');
    expect(service.atualizar).toHaveBeenCalledWith(
      'empresa-1',
      'conta-1',
      atualizarDto,
      usuario,
    );
    expect(service.registrarPagamento).toHaveBeenCalledWith(
      'empresa-1',
      'conta-1',
      pagamentoDto,
      usuario,
    );
    expect(service.cancelar).toHaveBeenCalledWith(
      'empresa-1',
      'conta-1',
      usuario,
    );
    expect(service.gerarAPartirPedidoCompra).toHaveBeenCalledWith(
      'empresa-1',
      'pedido-1',
      gerarDto,
      usuario,
    );
    expect(service.adicionarHistorico).toHaveBeenCalledWith(
      'empresa-1',
      'conta-1',
      historicoDto,
      usuario,
    );
    expect(service.listarHistorico).toHaveBeenCalledWith(
      'empresa-1',
      'conta-1',
    );
  });

  it('declara os guards na ordem JWT, papéis, permissões e empresa', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, ContasPagarController)).toEqual(
      [JwtAuthGuard, RolesGuard, PermissionsGuard, EmpresaContextoGuard],
    );
  });

  it.each([
    ['criar', 'financeiro.contas_pagar.criar'],
    ['gerarAPartirPedidoCompra', 'financeiro.contas_pagar.criar'],
    ['listar', 'financeiro.contas_pagar.visualizar'],
    ['buscarPorId', 'financeiro.contas_pagar.visualizar'],
    ['listarHistorico', 'financeiro.contas_pagar.visualizar'],
    ['atualizar', 'financeiro.contas_pagar.editar'],
    ['adicionarHistorico', 'financeiro.contas_pagar.editar'],
    ['registrarPagamento', 'financeiro.contas_pagar.pagar'],
    ['cancelar', 'financeiro.contas_pagar.cancelar'],
  ] as const)('deve exigir %s em %s', (metodo, permissao) => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        ContasPagarController.prototype[metodo],
      ),
    ).toEqual([permissao]);
  });

  it.each([
    'criar',
    'gerarAPartirPedidoCompra',
    'listar',
    'buscarPorId',
    'listarHistorico',
    'atualizar',
    'adicionarHistorico',
    'registrarPagamento',
    'cancelar',
  ] as const)('deve aceitar os três papéis em %s', (metodo) => {
    expect(
      Reflect.getMetadata(ROLES_KEY, ContasPagarController.prototype[metodo]),
    ).toEqual(['SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA']);
  });
});
