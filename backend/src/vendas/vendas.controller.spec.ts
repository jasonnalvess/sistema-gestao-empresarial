import { CondicaoPagamentoVenda, FormaPagamentoVenda } from '@prisma/client';
import { VendasController } from './vendas.controller';
import { VendasService } from './vendas.service';

const usuario = {
  id: 'usuario-1',
  empresaId: 'empresa-1',
  tipo: 'ADMIN_EMPRESA',
};

describe('VendasController', () => {
  let controller: VendasController;
  let service: Record<string, jest.Mock>;

  beforeEach(() => {
    service = {
      criar: jest.fn(),
      atualizar: jest.fn(),
      enviarParaAprovacao: jest.fn(),
      aprovar: jest.fn(),
      faturar: jest.fn(),
      cancelar: jest.fn(),
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
      itens: [{ produtoId: 'produto-1', quantidade: 1, valorUnitario: 10 }],
    };
    await controller.criar(dto, { user: usuario });
    expect(service.criar).toHaveBeenCalledWith(dto, usuario);
  });

  it('encaminha atualização com id, DTO e usuário', async () => {
    const dto = { observacao: 'Atualizada' };
    await controller.atualizar('venda-1', dto, {
      user: usuario,
    });
    expect(service.atualizar).toHaveBeenCalledWith('venda-1', dto, usuario);
  });

  it('encaminha transições de status ao service', async () => {
    const req = { user: usuario };
    await controller.enviarParaAprovacao('venda-1', req);
    await controller.aprovar('venda-1', req);
    await controller.faturar('venda-1', { documento: 'NF-1' }, req);
    await controller.cancelar('venda-1', { motivo: 'Erro operacional' }, req);
    expect(service.enviarParaAprovacao).toHaveBeenCalledWith(
      'venda-1',
      usuario,
    );
    expect(service.aprovar).toHaveBeenCalledWith('venda-1', usuario);
    expect(service.faturar).toHaveBeenCalledWith(
      'venda-1',
      { documento: 'NF-1' },
      usuario,
    );
    expect(service.cancelar).toHaveBeenCalledWith(
      'venda-1',
      { motivo: 'Erro operacional' },
      usuario,
    );
  });

  it('encaminha busca por id com o tenant do usuário', async () => {
    await controller.buscarPorId('venda-1', { user: usuario });
    expect(service.buscarPorId).toHaveBeenCalledWith('venda-1', usuario);
  });
});
