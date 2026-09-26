import { Module } from '@nestjs/common';
import { UnidadesMedidaService } from './unidades-medida.service';
import { UnidadesMedidaController } from './unidades-medida.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';

@Module({
  imports: [PrismaModule],
  controllers: [UnidadesMedidaController],
  providers: [UnidadesMedidaService, EmpresaContextoGuard],
})
export class UnidadesMedidaModule {}
