import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { VendasController } from './vendas.controller';
import { VendasService } from './vendas.service';

@Module({
  imports: [PrismaModule],
  controllers: [VendasController],
  providers: [VendasService],
  exports: [VendasService],
})
export class VendasModule {}
