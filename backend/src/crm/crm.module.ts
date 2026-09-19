import { Module } from '@nestjs/common';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import { ModuloAtivoGuard } from '../common/guards/modulo-ativo.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { CrmInteracoesController } from './crm-interacoes.controller';
import { CrmInteracoesService } from './crm-interacoes.service';

@Module({
  imports: [PrismaModule],
  controllers: [CrmInteracoesController],
  providers: [CrmInteracoesService, EmpresaContextoGuard, ModuloAtivoGuard],
})
export class CrmModule {}
