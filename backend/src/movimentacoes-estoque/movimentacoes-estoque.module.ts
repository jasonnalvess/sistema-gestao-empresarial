import { Module } from '@nestjs/common';
import { MovimentacoesEstoqueService } from './movimentacoes-estoque.service';
import { MovimentacoesEstoqueController } from './movimentacoes-estoque.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';

@Module({
  imports: [PrismaModule],
  controllers: [MovimentacoesEstoqueController],
  providers: [MovimentacoesEstoqueService, EmpresaContextoGuard],
})
export class MovimentacoesEstoqueModule {}
