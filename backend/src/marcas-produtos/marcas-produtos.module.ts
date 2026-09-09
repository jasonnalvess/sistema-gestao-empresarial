import { Module } from '@nestjs/common';
import { MarcasProdutosService } from './marcas-produtos.service';
import { MarcasProdutosController } from './marcas-produtos.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';

@Module({
  imports: [PrismaModule],
  controllers: [MarcasProdutosController],
  providers: [MarcasProdutosService, EmpresaContextoGuard],
})
export class MarcasProdutosModule {}
