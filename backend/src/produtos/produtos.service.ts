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

  private includeProduto = {
    categoria: true,
    marca: true,
    unidadeMedida: true,
    estoque: true,
  };

  private async validarVinculos(dados: {
    categoriaId?: string;
    marcaId?: string;
    unidadeMedidaId?: string;
  }, empresaId: string) {
    if (dados.categoriaId) {
      const categoria = await this.prisma.categoriaProduto.findUnique({
        where: { id: dados.categoriaId },
      });

      if (!categoria) throw new NotFoundException('Categoria não encontrada');

      if (categoria.empresaId !== empresaId) {
        throw new ForbiddenException('Categoria pertence a outra empresa');
      }
    }

    if (dados.marcaId) {
      const marca = await this.prisma.marcaProduto.findUnique({
        where: { id: dados.marcaId },
      });

      if (!marca) throw new NotFoundException('Marca não encontrada');

      if (marca.empresaId !== empresaId) {
        throw new ForbiddenException('Marca pertence a outra empresa');
      }
    }

    if (dados.unidadeMedidaId) {
      const unidade = await this.prisma.unidadeMedida.findUnique({
        where: { id: dados.unidadeMedidaId },
      });

      if (!unidade) {
        throw new NotFoundException('Unidade de medida não encontrada');
      }

      if (unidade.empresaId !== empresaId) {
        throw new ForbiddenException('Unidade de medida pertence a outra empresa');
      }
    }
  }

  async criar(dados: CriarProdutoDto, usuarioLogado: any) {
    const empresaId = usuarioLogado.empresaId;

    await this.validarVinculos(
      {
        categoriaId: dados.categoriaId,
        marcaId: dados.marcaId,
        unidadeMedidaId: dados.unidadeMedidaId,
      },
      empresaId,
    );

    return this.prisma.produto.create({
      data: {
        nome: dados.nome,
        descricao: dados.descricao,
        codigo: dados.codigo,
        codigoBarras: dados.codigoBarras,
        ncm: dados.ncm,
        precoCusto: dados.precoCusto ?? 0,
        precoVenda: dados.precoVenda,
        peso: dados.peso,
        altura: dados.altura,
        largura: dados.largura,
        comprimento: dados.comprimento,
        estoqueMinimo: dados.estoqueMinimo ?? 0,
        estoqueMaximo: dados.estoqueMaximo,
        categoriaId: dados.categoriaId,
        marcaId: dados.marcaId,
        unidadeMedidaId: dados.unidadeMedidaId,
        empresaId,
      },
      include: this.includeProduto,
    });
  }

  async listar(usuarioLogado: any, filtros: FiltroProdutosDto) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 10;
    const { skip, take } = calcularPaginacao(page, limit);

    const where: any =
      usuarioLogado.tipo === 'SUPER_ADMIN'
        ? {}
        : { empresaId: usuarioLogado.empresaId };

    if (filtros.search) {
      where.OR = [
        { nome: { contains: filtros.search, mode: 'insensitive' } },
        { descricao: { contains: filtros.search, mode: 'insensitive' } },
        { codigo: { contains: filtros.search, mode: 'insensitive' } },
        { codigoBarras: { contains: filtros.search, mode: 'insensitive' } },
        { ncm: { contains: filtros.search, mode: 'insensitive' } },
        {
          categoria: {
            nome: { contains: filtros.search, mode: 'insensitive' },
          },
        },
        {
          marca: {
            nome: { contains: filtros.search, mode: 'insensitive' },
          },
        },
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
        include: this.includeProduto,
        orderBy: {
          [filtros.sortBy ?? 'createdAt']: filtros.order ?? 'desc',
        },
        skip,
        take,
      }),
      this.prisma.produto.count({ where }),
    ]);

    return respostaPaginada(data, total, page, limit);
  }

  async buscarPorId(id: string, usuarioLogado: any) {
    const produto = await this.prisma.produto.findUnique({
      where: { id },
      include: this.includeProduto,
    });

    if (!produto) {
      throw new NotFoundException('Produto não encontrado');
    }

    if (
      usuarioLogado.tipo !== 'SUPER_ADMIN' &&
      produto.empresaId !== usuarioLogado.empresaId
    ) {
      throw new ForbiddenException('Acesso negado a produto de outra empresa');
    }

    return produto;
  }

  async atualizar(id: string, dados: AtualizarProdutoDto, usuarioLogado: any) {
    const produto = await this.buscarPorId(id, usuarioLogado);

    await this.validarVinculos(
      {
        categoriaId: dados.categoriaId,
        marcaId: dados.marcaId,
        unidadeMedidaId: dados.unidadeMedidaId,
      },
      produto.empresaId,
    );

    return this.prisma.produto.update({
      where: { id },
      data: {
        nome: dados.nome,
        descricao: dados.descricao,
        codigo: dados.codigo,
        codigoBarras: dados.codigoBarras,
        ncm: dados.ncm,
        precoCusto: dados.precoCusto,
        precoVenda: dados.precoVenda,
        peso: dados.peso,
        altura: dados.altura,
        largura: dados.largura,
        comprimento: dados.comprimento,
        estoqueMinimo: dados.estoqueMinimo,
        estoqueMaximo: dados.estoqueMaximo,
        categoriaId: dados.categoriaId,
        marcaId: dados.marcaId,
        unidadeMedidaId: dados.unidadeMedidaId,
      },
      include: this.includeProduto,
    });
  }

  async ativar(id: string, usuarioLogado: any) {
    await this.buscarPorId(id, usuarioLogado);

    return this.prisma.produto.update({
      where: { id },
      data: { ativo: true },
      include: this.includeProduto,
    });
  }

  async desativar(id: string, usuarioLogado: any) {
    await this.buscarPorId(id, usuarioLogado);

    return this.prisma.produto.update({
      where: { id },
      data: { ativo: false },
      include: this.includeProduto,
    });
  }
}
