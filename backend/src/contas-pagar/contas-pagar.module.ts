import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { CaixasModule } from '../caixas/caixas.module';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import { ContasPagarController } from './contas-pagar.controller';
import { ContasPagarService } from './contas-pagar.service';

@Module({
  imports: [PrismaModule, CaixasModule],
  controllers: [ContasPagarController],
  providers: [ContasPagarService, EmpresaContextoGuard],
})
export class ContasPagarModule {}
