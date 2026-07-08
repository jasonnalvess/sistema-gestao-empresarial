import { Module } from '@nestjs/common';
import { EmpresaModulosService } from './empresa-modulos.service';
import { EmpresaModulosController } from './empresa-modulos.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EmpresaModulosController],
  providers: [EmpresaModulosService],
})
export class EmpresaModulosModule {}
