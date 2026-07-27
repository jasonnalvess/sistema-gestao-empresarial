import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

import { PedidosCompraController } from './pedidos-compra.controller';
import { PedidosCompraService } from './pedidos-compra.service';

describe('PedidosCompraController', () => {
  it('encaminha o recebimento sem alterar o contrato público', async () => {
    const service = {
      receber: jest.fn(),
    };

    const controller = new PedidosCompraController(
      service as unknown as PedidosCompraService,
    );

    const dto = {
      itens: [
        {
          itemId: 'item1',
          quantidadeRecebida: 1,
        },
      ],
    };

    const usuario: AuthenticatedUser = {
      id: 'u1',
      email: 'usuario@empresa.com',
      empresaId: 'e1',
      tipo: 'ADMIN_EMPRESA',
    };

    await controller.receber('p1', dto, usuario);

    expect(service.receber).toHaveBeenCalledWith('p1', dto, usuario);
  });
});
