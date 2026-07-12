import { Test, TestingModule } from '@nestjs/testing';
import { PedidosCompraController } from './pedidos-compra.controller';

describe('PedidosCompraController', () => {
  let controller: PedidosCompraController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PedidosCompraController],
    }).compile();

    controller = module.get<PedidosCompraController>(PedidosCompraController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
