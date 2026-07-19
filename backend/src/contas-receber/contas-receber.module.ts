import { Module, forwardRef } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { VendasModule } from '../vendas/vendas.module';

import { ContasReceberController } from './contas-receber.controller';
import { ContasReceberService } from './contas-receber.service';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => VendasModule),
  ],
  controllers: [ContasReceberController],
  providers: [ContasReceberService],
  exports: [ContasReceberService],
})
export class ContasReceberModule {}