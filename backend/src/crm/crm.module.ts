import { Module } from '@nestjs/common';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import { ModuloAtivoGuard } from '../common/guards/modulo-ativo.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { CrmEtapasController } from './crm-etapas.controller';
import { CrmEtapasService } from './crm-etapas.service';
import { CrmInteracoesController } from './crm-interacoes.controller';
import { CrmInteracoesService } from './crm-interacoes.service';
import { CrmOportunidadesController } from './crm-oportunidades.controller';
import { CrmOportunidadesService } from './crm-oportunidades.service';
import { CrmResponsaveisController } from './crm-responsaveis.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    CrmInteracoesController,
    CrmEtapasController,
    CrmOportunidadesController,
    CrmResponsaveisController,
  ],
  providers: [
    CrmInteracoesService,
    CrmEtapasService,
    CrmOportunidadesService,
    EmpresaContextoGuard,
    ModuloAtivoGuard,
  ],
})
export class CrmModule {}
