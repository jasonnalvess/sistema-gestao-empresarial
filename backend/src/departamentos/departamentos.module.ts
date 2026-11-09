import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import { DepartamentosController } from './departamentos.controller';
import { DepartamentosService } from './departamentos.service';
@Module({
  imports: [PrismaModule],
  controllers: [DepartamentosController],
  providers: [DepartamentosService, EmpresaContextoGuard],
})
export class DepartamentosModule {}
