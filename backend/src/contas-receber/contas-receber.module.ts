import { Module, forwardRef } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { VendasModule } from '../vendas/vendas.module';
import { CaixasModule } from '../caixas/caixas.module';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';

import { ContasReceberController } from './contas-receber.controller';
import { ContasReceberService } from './contas-receber.service';

@Module({
  imports: [PrismaModule, CaixasModule, forwardRef(() => VendasModule)],
  controllers: [ContasReceberController],
  providers: [ContasReceberService, EmpresaContextoGuard],
  exports: [ContasReceberService],
})
export class ContasReceberModule {}
