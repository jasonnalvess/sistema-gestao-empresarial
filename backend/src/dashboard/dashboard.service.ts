import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { obterEmpresaId } from '../common/utils/obter-empresa-id';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async resumo(usuarioLogado: AuthenticatedUser) {
    if (usuarioLogado.tipo === 'SUPER_ADMIN') {
      const [
        empresas,
        usuarios,
        produtos,
        categorias,
        movimentacoesEstoque,
        auditoriaLogs,
      ] = await this.prisma.$transaction([
        this.prisma.empresa.count(),
        this.prisma.usuario.count(),
        this.prisma.produto.count(),
        this.prisma.categoriaProduto.count(),
        this.prisma.movimentacaoEstoque.count(),
        this.prisma.auditoriaLog.count(),
      ]);

      return {
        empresas,
        usuarios,
        produtos,
        categorias,
        movimentacoesEstoque,
        auditoriaLogs,
      };
    }

    const empresaId = obterEmpresaId(usuarioLogado);

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
