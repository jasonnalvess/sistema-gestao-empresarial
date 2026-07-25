import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InventariosEstoqueService } from './inventarios-estoque.service';
import { InventariosEstoqueController } from './inventarios-estoque.controller';

@Module({
  imports: [PrismaModule],
  controllers: [InventariosEstoqueController],
  providers: [InventariosEstoqueService],
})
export class InventariosEstoqueModule {}
