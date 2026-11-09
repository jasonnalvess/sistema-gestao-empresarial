import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';

import { CondicaoPagamentoVenda, FormaPagamentoVenda } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

import { VendasController } from './vendas.controller';
import { VendasService } from './vendas.service';

const empresa = { empresaId: 'empresa-1', origem: 'JWT' as const };

const usuario: AuthenticatedUser = {
  id: 'usuario-1',
  email: 'usuario@empresa.com',
  empresaId: 'empresa-1',
  tipo: 'ADMIN_EMPRESA',
};

describe('VendasController', () => {
  let controller: VendasController;
  let service: Record<string, jest.Mock>;

  beforeEach(() => {
    service = {
      criar: jest.fn(),
      listar: jest.fn(),
      atualizar: jest.fn(),
      adicionarHistorico: jest.fn(),
      listarHistorico: jest.fn(),
      enviarParaAprovacao: jest.fn(),
      aprovar: jest.fn(),
      faturar: jest.fn(),
      cancelar: jest.fn(),
      dashboard: jest.fn(),
      buscarPorId: jest.fn(),
    };

    controller = new VendasController(service as unknown as VendasService);
  });

  it('encaminha criação com DTO e usuário autenticado', async () => {
    const dto = {
      clienteId: 'cliente-1',
      depositoId: 'deposito-1',
      condicaoPagamento: CondicaoPagamentoVenda.AVISTA,
      formaPagamento: FormaPagamentoVenda.PIX,
      itens: [
        {
          produtoId: 'produto-1',
          quantidade: 1,
          valorUnitario: 10,
        },
      ],
    };

    await controller.criar(empresa, dto, usuario);

    expect(service.criar).toHaveBeenCalledWith('empresa-1', dto, 'usuario-1');
  });

  it('encaminha atualização com id, DTO e usuário', async () => {
    const dto = {
      observacao: 'Atualizada',
    };

    await controller.atualizar(empresa, 'venda-1', dto, usuario);

    expect(service.atualizar).toHaveBeenCalledWith(
      'empresa-1',
      'venda-1',
      dto,
      'usuario-1',
    );
  });

  it('encaminha transições de status ao service', async () => {
    await controller.enviarParaAprovacao(empresa, 'venda-1', usuario);

    await controller.aprovar(empresa, 'venda-1', usuario);

    await controller.faturar(
      empresa,
      'venda-1',
      { documento: 'NF-1' },
      usuario,
    );

    await controller.cancelar(
      empresa,
      'venda-1',
      { motivo: 'Erro operacional' },
      usuario,
    );

    expect(service.enviarParaAprovacao).toHaveBeenCalledWith(
      'empresa-1',
      'venda-1',
      'usuario-1',
    );

    expect(service.aprovar).toHaveBeenCalledWith(
      'empresa-1',
      'venda-1',
      'usuario-1',
    );

    expect(service.faturar).toHaveBeenCalledWith(
      'empresa-1',
      'venda-1',
      { documento: 'NF-1' },
      'usuario-1',
    );

    expect(service.cancelar).toHaveBeenCalledWith(
      'empresa-1',
      'venda-1',
      { motivo: 'Erro operacional' },
      'usuario-1',
    );
  });

  it('encaminha busca por id com o tenant do usuário', async () => {
    await controller.buscarPorId(empresa, 'venda-1');

    expect(service.buscarPorId).toHaveBeenCalledWith('empresa-1', 'venda-1');
  });

  it('declara os quatro guards na ordem oficial', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, VendasController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
      PermissionsGuard,
      EmpresaContextoGuard,
    ]);
  });

  it.each([
    ['criar', 'vendas.criar'],
    ['listar', 'vendas.visualizar'],
    ['dashboard', 'vendas.visualizar'],
    ['buscarPorId', 'vendas.visualizar'],
    ['listarHistorico', 'vendas.visualizar'],
    ['adicionarHistorico', 'vendas.historico.adicionar'],
    ['atualizar', 'vendas.editar'],
    ['enviarParaAprovacao', 'vendas.editar'],
    ['aprovar', 'vendas.aprovar'],
    ['faturar', 'vendas.faturar'],
    ['cancelar', 'vendas.cancelar'],
  ] as const)('exige a permissão oficial em %s', (metodo, permissao) => {
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, VendasController.prototype[metodo]),
    ).toEqual([permissao]);
  });

  it.each([
    'criar',
    'listar',
    'dashboard',
    'buscarPorId',
    'listarHistorico',
    'adicionarHistorico',
    'atualizar',
    'enviarParaAprovacao',
    'aprovar',
    'faturar',
    'cancelar',
  ] as const)('aceita os três papéis em %s', (metodo) => {
    expect(
      Reflect.getMetadata(ROLES_KEY, VendasController.prototype[metodo]),
    ).toEqual(['SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA']);
  });
});
