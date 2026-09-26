import { Module } from '@nestjs/common';
import { EstoqueService } from './estoque.service';
import { EstoqueController } from './estoque.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';

@Module({
  imports: [PrismaModule],
  controllers: [EstoqueController],
  providers: [EstoqueService, EmpresaContextoGuard],
})
export class EstoqueModule {}
