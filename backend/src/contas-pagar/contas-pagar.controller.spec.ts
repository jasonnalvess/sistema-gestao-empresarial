import { FormaPagamento } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

import { ContasPagarController } from './contas-pagar.controller';
import { ContasPagarService } from './contas-pagar.service';

const usuario: AuthenticatedUser = {
  id: 'u1',
  email: 'usuario@empresa.com',
  empresaId: 'e1',
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

  it('encaminha criação e usuário', async () => {
    const dto = {
      descricao: 'Conta',
      dataVencimento: '2026-08-10',
      valorOriginal: 10,
    };

    await controller.criar(dto, usuario);

    expect(service.criar).toHaveBeenCalledWith(dto, usuario);
  });

  it('encaminha pagamento sem alterar contrato', async () => {
    const dto = {
      valor: 10,
      formaPagamento: FormaPagamento.PIX,
    };

    await controller.registrarPagamento('c1', dto, usuario);

    expect(service.registrarPagamento).toHaveBeenCalledWith('c1', dto, usuario);
  });

  it('encaminha cancelamento e geração por pedido', async () => {
    await controller.cancelar('c1', usuario);

    const dto = {
      dataVencimento: '2026-08-10',
    };

    await controller.gerarAPartirPedidoCompra('p1', dto, usuario);

    expect(service.cancelar).toHaveBeenCalledWith('c1', usuario);
    expect(service.gerarAPartirPedidoCompra).toHaveBeenCalledWith(
      'p1',
      dto,
      usuario,
    );
  });

  it('preserva endpoints de consulta e edição', async () => {
    await controller.buscarPorId('c1', usuario);
    await controller.atualizar('c1', { descricao: 'Nova' }, usuario);

    expect(service.buscarPorId).toHaveBeenCalledWith('c1', usuario);
    expect(service.atualizar).toHaveBeenCalledWith(
      'c1',
      { descricao: 'Nova' },
      usuario,
    );
  });
});
