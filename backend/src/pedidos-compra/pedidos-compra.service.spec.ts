import { Test, TestingModule } from '@nestjs/testing';
import { PedidosCompraService } from './pedidos-compra.service';

describe('PedidosCompraService', () => {
  let service: PedidosCompraService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PedidosCompraService],
    }).compile();

    service = module.get<PedidosCompraService>(PedidosCompraService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
