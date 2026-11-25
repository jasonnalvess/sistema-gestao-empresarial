import { Module } from '@nestjs/common';
import { DepositosService } from './depositos.service';
import { DepositosController } from './depositos.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';

@Module({
  imports: [PrismaModule],
  controllers: [DepositosController],
  providers: [DepositosService, EmpresaContextoGuard],
})
export class DepositosModule {}
