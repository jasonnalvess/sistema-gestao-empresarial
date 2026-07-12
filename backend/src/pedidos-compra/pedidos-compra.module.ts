import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { PedidosCompraController } from './pedidos-compra.controller';
import { PedidosCompraService } from './pedidos-compra.service';

@Module({
  imports: [PrismaModule],
  controllers: [PedidosCompraController],
  providers: [PedidosCompraService],
})
export class PedidosCompraModule {}
