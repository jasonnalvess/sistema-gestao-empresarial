import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriarProdutoDto } from './dto/criar-produto.dto';
import { AtualizarProdutoDto } from './dto/atualizar-produto.dto';
import { FiltroProdutosDto } from './dto/filtro-produtos.dto';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';

@Injectable()
export class ProdutosService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(dados: CriarProdutoDto, usuarioLogado: any) {
    if (dados.categoriaId) {
      const categoria = await this.prisma.categoriaProduto.findUnique({
        where: { id: dados.categoriaId },
      });

      if (!categoria) {
        throw new NotFoundException('Categoria não encontrada');
      }

      if (categoria.empresaId !== usuarioLogado.empresaId) {
        throw new ForbiddenException('Categoria pertence a outra empresa');
      }
    }

    return this.prisma.produto.create({
      data: {
        nome: dados.nome,
        descricao: dados.descricao,
        codigo: dados.codigo,
        precoVenda: dados.precoVenda,
        categoriaId: dados.categoriaId,
        empresaId: usuarioLogado.empresaId,
      },
      include: {
        categoria: true,
      },
    });
  }

  async listar(usuarioLogado: any, filtros: FiltroProdutosDto) {
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
        { codigo: { contains: filtros.search, mode: 'insensitive' } },
      ];
    }

    if (filtros.ativo !== undefined) {
      where.ativo = filtros.ativo;
    }

    if (filtros.categoriaId) {
      where.categoriaId = filtros.categoriaId;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.produto.findMany({
        where,
        include: {
          categoria: true,
        },
        orderBy: {
  [filtros.sortBy ?? 'createdAt']: filtros.order ?? 'desc',
},
        skip,
        take,
      }),
      this.prisma.produto.count({
        where,
      }),
    ]);

    return respostaPaginada(data, total, page, limit);
  }

  async buscarPorId(id: string, usuarioLogado: any) {
    const produto = await this.prisma.produto.findUnique({
      where: { id },
      include: {
        categoria: true,
      },
    });

    if (!produto) {
      throw new NotFoundException('Produto não encontrado');
    }

    if (produto.empresaId !== usuarioLogado.empresaId) {
      throw new ForbiddenException('Acesso negado a produto de outra empresa');
    }

    return produto;
  }

  async atualizar(id: string, dados: AtualizarProdutoDto, usuarioLogado: any) {
    await this.buscarPorId(id, usuarioLogado);

    if (dados.categoriaId) {
      const categoria = await this.prisma.categoriaProduto.findUnique({
        where: { id: dados.categoriaId },
      });

      if (!categoria) {
        throw new NotFoundException('Categoria não encontrada');
      }

      if (categoria.empresaId !== usuarioLogado.empresaId) {
        throw new ForbiddenException('Categoria pertence a outra empresa');
      }
    }

    return this.prisma.produto.update({
      where: { id },
      data: dados,
      include: {
        categoria: true,
      },
    });
  }

  async ativar(id: string, usuarioLogado: any) {
    await this.buscarPorId(id, usuarioLogado);

    return this.prisma.produto.update({
      where: { id },
      data: { ativo: true },
      include: {
        categoria: true,
      },
    });
  }

  async desativar(id: string, usuarioLogado: any) {
    await this.buscarPorId(id, usuarioLogado);

    return this.prisma.produto.update({
      where: { id },
      data: { ativo: false },
      include: {
        categoria: true,
      },
    });
  }
}
