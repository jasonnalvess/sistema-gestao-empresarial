import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import { FuncionariosController } from './funcionarios.controller';
import { FuncionariosService } from './funcionarios.service';
@Module({
  imports: [PrismaModule],
  controllers: [FuncionariosController],
  providers: [FuncionariosService, EmpresaContextoGuard],
})
export class FuncionariosModule {}
