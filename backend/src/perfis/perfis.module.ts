import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PerfisController } from './perfis.controller';
import { PerfisService } from './perfis.service';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';

@Module({
  imports: [PrismaModule],
  controllers: [PerfisController],
  providers: [PerfisService, EmpresaContextoGuard],
})
export class PerfisModule {}
