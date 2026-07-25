import { Module } from '@nestjs/common';
import { MarcasProdutosService } from './marcas-produtos.service';
import { MarcasProdutosController } from './marcas-produtos.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MarcasProdutosController],
  providers: [MarcasProdutosService],
})
export class MarcasProdutosModule {}
