import { Module } from '@nestjs/common';
import { EmpresasService } from './empresas.service';
import { EmpresasController } from './empresas.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { IpUtil } from '../common/utils/ip.util';

@Module({
  imports: [PrismaModule],
  controllers: [EmpresasController],
  providers: [EmpresasService, IpUtil],
})
export class EmpresasModule {}
