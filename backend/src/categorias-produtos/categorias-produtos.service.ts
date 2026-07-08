import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriarCategoriaProdutoDto } from './dto/criar-categoria-produto.dto';
import { AtualizarCategoriaProdutoDto } from './dto/atualizar-categoria-produto.dto';
import { FiltroCategoriasProdutosDto } from './dto/filtro-categorias-produtos.dto';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';

@Injectable()
export class CategoriasProdutosService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(dados: CriarCategoriaProdutoDto, usuarioLogado: any) {
    return this.prisma.categoriaProduto.create({
      data: {
        nome: dados.nome,
        descricao: dados.descricao,
        empresaId: usuarioLogado.empresaId,
      },
    });
  }

  async listar(usuarioLogado: any, filtros: FiltroCategoriasProdutosDto) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 10;

    const { skip, take } = calcularPaginacao(page, limit);

    const where: any = {
      empresaId: usuarioLogado.empresaId,
    };

    if (filtros.search) {
      where.OR = [
        { nome: { contains: filtros.search, mode: 'insensitive' } },
        { descricao: { contains: filtros.search, mode: 'insensitive' } },
      ];
    }

    if (filtros.ativo !== undefined) {
      where.ativo = filtros.ativo;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.categoriaProduto.findMany({
        where,
        orderBy: {
  [filtros.sortBy ?? 'createdAt']: filtros.order ?? 'desc',
},
        skip,
        take,
      }),
      this.prisma.categoriaProduto.count({
        where,
      }),
    ]);

    return respostaPaginada(data, total, page, limit);
  }

  async buscarPorId(id: string, usuarioLogado: any) {
    const categoria = await this.prisma.categoriaProduto.findUnique({
      where: { id },
    });

    if (!categoria) {
      throw new NotFoundException('Categoria não encontrada');
    }

    if (categoria.empresaId !== usuarioLogado.empresaId) {
      throw new ForbiddenException('Acesso negado a categoria de outra empresa');
    }

    return categoria;
  }

  async atualizar(id: string, dados: AtualizarCategoriaProdutoDto, usuarioLogado: any) {
    await this.buscarPorId(id, usuarioLogado);

    return this.prisma.categoriaProduto.update({
      where: { id },
      data: dados,
    });
  }

  async ativar(id: string, usuarioLogado: any) {
    await this.buscarPorId(id, usuarioLogado);

    return this.prisma.categoriaProduto.update({
      where: { id },
      data: { ativo: true },
    });
  }

  async desativar(id: string, usuarioLogado: any) {
    await this.buscarPorId(id, usuarioLogado);

    return this.prisma.categoriaProduto.update({
      where: { id },
      data: { ativo: false },
    });
  }
}
