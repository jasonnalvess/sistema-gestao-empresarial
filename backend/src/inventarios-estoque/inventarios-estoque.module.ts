import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InventariosEstoqueService } from './inventarios-estoque.service';
import { InventariosEstoqueController } from './inventarios-estoque.controller';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';

@Module({
  imports: [PrismaModule],
  controllers: [InventariosEstoqueController],
  providers: [InventariosEstoqueService, EmpresaContextoGuard],
})
export class InventariosEstoqueModule {}
