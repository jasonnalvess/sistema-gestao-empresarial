import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import { CargosController } from './cargos.controller';
import { CargosService } from './cargos.service';
@Module({
  imports: [PrismaModule],
  controllers: [CargosController],
  providers: [CargosService, EmpresaContextoGuard],
})
export class CargosModule {}
