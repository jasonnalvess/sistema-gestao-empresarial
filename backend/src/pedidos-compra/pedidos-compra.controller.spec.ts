import { PedidosCompraController } from './pedidos-compra.controller';
import { PedidosCompraService } from './pedidos-compra.service';

describe('PedidosCompraController', () => {
  it('encaminha o recebimento sem alterar o contrato público', async () => {
    const service = { receber: jest.fn() };
    const controller = new PedidosCompraController(service as unknown as PedidosCompraService);
    const dto = { itens: [{ itemId: 'item1', quantidadeRecebida: 1 }] };
    const usuario = { id: 'u1', empresaId: 'e1' };
    await controller.receber('p1', dto, { user: usuario });
    expect(service.receber).toHaveBeenCalledWith('p1', dto, usuario);
  });
});
