import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import { PedidosCompraController } from './pedidos-compra.controller';
import { PedidosCompraService } from './pedidos-compra.service';

@Module({
  imports: [PrismaModule],
  controllers: [PedidosCompraController],
  providers: [PedidosCompraService, EmpresaContextoGuard],
})
export class PedidosCompraModule {}
