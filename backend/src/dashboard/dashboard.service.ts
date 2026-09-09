import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async resumo(empresaId: string) {
    const [
      usuarios,
      produtos,
      categorias,
      movimentacoesEstoque,
      auditoriaLogs,
    ] = await this.prisma.$transaction([
      this.prisma.usuario.count({ where: { empresaId } }),
      this.prisma.produto.count({ where: { empresaId } }),
      this.prisma.categoriaProduto.count({ where: { empresaId } }),
      this.prisma.movimentacaoEstoque.count({ where: { empresaId } }),
      this.prisma.auditoriaLog.count({ where: { empresaId } }),
    ]);

    return {
      empresas: 1,
      usuarios,
      produtos,
      categorias,
      movimentacoesEstoque,
      auditoriaLogs,
    };
  }
}
