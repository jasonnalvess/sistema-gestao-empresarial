import { Module } from '@nestjs/common';
import { CategoriasProdutosService } from './categorias-produtos.service';
import { CategoriasProdutosController } from './categorias-produtos.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';

@Module({
  imports: [PrismaModule],
  controllers: [CategoriasProdutosController],
  providers: [CategoriasProdutosService, EmpresaContextoGuard],
})
export class CategoriasProdutosModule {}
