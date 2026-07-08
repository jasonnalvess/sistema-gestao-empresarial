import { Module } from '@nestjs/common';
import { CategoriasProdutosService } from './categorias-produtos.service';
import { CategoriasProdutosController } from './categorias-produtos.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CategoriasProdutosController],
  providers: [CategoriasProdutosService],
})
export class CategoriasProdutosModule {}
