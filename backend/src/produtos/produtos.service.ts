import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

import { PrismaService } from '../prisma/prisma.service';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';
import { obterEmpresaId } from '../common/utils/obter-empresa-id';

import { CriarProdutoDto } from './dto/criar-produto.dto';
import { AtualizarProdutoDto } from './dto/atualizar-produto.dto';
import { FiltroProdutosDto } from './dto/filtro-produtos.dto';
import { CriarProdutoHistoricoDto } from './dto/criar-produto-historico.dto';

const PRODUTO_INCLUDE = {
  categoria: true,
  marca: true,
  unidadeMedida: true,
  estoques: {
    include: {
      deposito: true,
    },
  },
} satisfies Prisma.ProdutoInclude;

type ProdutoCompleto = Prisma.ProdutoGetPayload<{
  include: typeof PRODUTO_INCLUDE;
}>;

@Injectable()
export class ProdutosService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeProduto = PRODUTO_INCLUDE;

  private tratarErroPrisma(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.map(String)
        : [];

      if (target.includes('codigoBarras')) {
        throw new ConflictException(
          'Já existe um produto com este código de barras nesta empresa',
        );
      }

      if (target.includes('codigo')) {
        throw new ConflictException(
          'Já existe um produto com este código interno nesta empresa',
        );
      }

      if (target.includes('nome')) {
        throw new ConflictException(
          'Já existe um produto com este nome nesta empresa',
        );
      }

      throw new ConflictException('Já existe um produto com esses dados');
    }

    throw error;
  }

  private valorComparavel(valor: unknown): string {
    if (valor === null || valor === undefined) {
      return '';
    }

    return String(valor);
  }

  private valorExibicao(valor: unknown): string {
    if (valor === null || valor === undefined || valor === '') {
      return 'não informado';
    }

    return String(valor);
  }

  private montarDescricaoAlteracoes(
    anterior: ProdutoCompleto,
    atualizado: ProdutoCompleto,
  ): string | null {
    const campos = [
      {
        label: 'Nome',
        anterior: anterior.nome,
        atualizado: atualizado.nome,
      },
      {
        label: 'Descrição',
        anterior: anterior.descricao,
        atualizado: atualizado.descricao,
      },
      {
        label: 'Código interno',
        anterior: anterior.codigo,
        atualizado: atualizado.codigo,
      },
      {
        label: 'Código de barras',
        anterior: anterior.codigoBarras,
        atualizado: atualizado.codigoBarras,
      },
      {
        label: 'NCM',
        anterior: anterior.ncm,
        atualizado: atualizado.ncm,
      },
      {
        label: 'Preço de custo',
        anterior: anterior.precoCusto,
        atualizado: atualizado.precoCusto,
      },
      {
        label: 'Preço de venda',
        anterior: anterior.precoVenda,
        atualizado: atualizado.precoVenda,
      },
      {
        label: 'Estoque mínimo',
        anterior: anterior.estoqueMinimo,
        atualizado: atualizado.estoqueMinimo,
      },
      {
        label: 'Estoque máximo',
        anterior: anterior.estoqueMaximo,
        atualizado: atualizado.estoqueMaximo,
      },
      {
        label: 'Peso',
        anterior: anterior.peso,
        atualizado: atualizado.peso,
      },
      {
        label: 'Altura',
        anterior: anterior.altura,
        atualizado: atualizado.altura,
      },
      {
        label: 'Largura',
        anterior: anterior.largura,
        atualizado: atualizado.largura,
      },
      {
        label: 'Comprimento',
        anterior: anterior.comprimento,
        atualizado: atualizado.comprimento,
      },
      {
        label: 'Categoria',
        anterior: anterior.categoria?.nome,
        atualizado: atualizado.categoria?.nome,
      },
      {
        label: 'Marca',
        anterior: anterior.marca?.nome,
        atualizado: atualizado.marca?.nome,
      },
      {
        label: 'Unidade de medida',
        anterior: anterior.unidadeMedida
          ? `${anterior.unidadeMedida.sigla} - ${anterior.unidadeMedida.nome}`
          : null,
        atualizado: atualizado.unidadeMedida
          ? `${atualizado.unidadeMedida.sigla} - ${atualizado.unidadeMedida.nome}`
          : null,
      },
    ];

    const alteracoes = campos
      .filter(
        (campo) =>
          this.valorComparavel(campo.anterior) !==
          this.valorComparavel(campo.atualizado),
      )
      .map(
        (campo) =>
          `${campo.label}: ${this.valorExibicao(
            campo.anterior,
          )} → ${this.valorExibicao(campo.atualizado)}`,
      );

    if (alteracoes.length === 0) {
      return null;
    }

    return `Produto atualizado.\n${alteracoes.join('\n')}`;
  }

  private async registrarHistorico(
    produtoId: string,
    descricao: string,
    usuarioLogado: AuthenticatedUser,
  ) {
    return this.prisma.produtoHistorico.create({
      data: {
        produtoId,
        descricao,
        usuarioId: usuarioLogado.id,
      },
    });
  }

  private async validarVinculos(
    dados: {
      categoriaId?: string;
      marcaId?: string;
      unidadeMedidaId?: string;
    },
    empresaId: string,
  ) {
    if (dados.categoriaId) {
      const categoria = await this.prisma.categoriaProduto.findUnique({
        where: {
          id: dados.categoriaId,
        },
      });

      if (!categoria) {
        throw new NotFoundException('Categoria não encontrada');
      }

      if (categoria.empresaId !== empresaId) {
        throw new ForbiddenException('Categoria pertence a outra empresa');
      }

      if (!categoria.ativo) {
        throw new BadRequestException(
          'Não é possível vincular uma categoria inativa',
        );
      }
    }

    if (dados.marcaId) {
      const marca = await this.prisma.marcaProduto.findUnique({
        where: {
          id: dados.marcaId,
        },
      });

      if (!marca) {
        throw new NotFoundException('Marca não encontrada');
      }

      if (marca.empresaId !== empresaId) {
        throw new ForbiddenException('Marca pertence a outra empresa');
      }

      if (!marca.ativo) {
        throw new BadRequestException(
          'Não é possível vincular uma marca inativa',
        );
      }
    }

    if (dados.unidadeMedidaId) {
      const unidade = await this.prisma.unidadeMedida.findUnique({
        where: {
          id: dados.unidadeMedidaId,
        },
      });

      if (!unidade) {
        throw new NotFoundException('Unidade de medida não encontrada');
      }

      if (unidade.empresaId !== empresaId) {
        throw new ForbiddenException(
          'Unidade de medida pertence a outra empresa',
        );
      }

      if (!unidade.ativo) {
        throw new BadRequestException(
          'Não é possível vincular uma unidade de medida inativa',
        );
      }
    }
  }

  async criar(dados: CriarProdutoDto, usuarioLogado: AuthenticatedUser) {
    const empresaId = obterEmpresaId(usuarioLogado);

    await this.validarVinculos(
      {
        categoriaId: dados.categoriaId,
        marcaId: dados.marcaId,
        unidadeMedidaId: dados.unidadeMedidaId,
      },
      empresaId,
    );

    try {
      const produto = await this.prisma.produto.create({
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

      await this.registrarHistorico(
        produto.id,
        `Produto criado com preço de venda de R$ ${Number(
          produto.precoVenda,
        ).toFixed(2)}.`,
        usuarioLogado,
      );

      return produto;
    } catch (error) {
      this.tratarErroPrisma(error);
    }
  }

  async listar(usuarioLogado: AuthenticatedUser, filtros: FiltroProdutosDto) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 10;

    const { skip, take } = calcularPaginacao(page, limit);

    const where: Prisma.ProdutoWhereInput =
      usuarioLogado.tipo === 'SUPER_ADMIN'
        ? {}
        : {
            empresaId: obterEmpresaId(usuarioLogado),
          };

    if (filtros.search) {
      where.OR = [
        {
          nome: {
            contains: filtros.search,
            mode: 'insensitive',
          },
        },
        {
          descricao: {
            contains: filtros.search,
            mode: 'insensitive',
          },
        },
        {
          codigo: {
            contains: filtros.search,
            mode: 'insensitive',
          },
        },
        {
          codigoBarras: {
            contains: filtros.search,
            mode: 'insensitive',
          },
        },
        {
          ncm: {
            contains: filtros.search,
            mode: 'insensitive',
          },
        },
        {
          categoria: {
            nome: {
              contains: filtros.search,
              mode: 'insensitive',
            },
          },
        },
        {
          marca: {
            nome: {
              contains: filtros.search,
              mode: 'insensitive',
            },
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

    if (filtros.marcaId) {
      where.marcaId = filtros.marcaId;
    }

    if (filtros.unidadeMedidaId) {
      where.unidadeMedidaId = filtros.unidadeMedidaId;
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

      this.prisma.produto.count({
        where,
      }),
    ]);

    return respostaPaginada(data, total, page, limit);
  }

  async buscarPorId(id: string, usuarioLogado: AuthenticatedUser) {
    const produto = await this.prisma.produto.findUnique({
      where: {
        id,
      },
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

  async atualizar(
    id: string,
    dados: AtualizarProdutoDto,
    usuarioLogado: AuthenticatedUser,
  ) {
    const produtoAnterior = await this.buscarPorId(id, usuarioLogado);

    await this.validarVinculos(
      {
        categoriaId: dados.categoriaId,
        marcaId: dados.marcaId,
        unidadeMedidaId: dados.unidadeMedidaId,
      },
      produtoAnterior.empresaId,
    );

    try {
      const produtoAtualizado = await this.prisma.produto.update({
        where: {
          id,
        },
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

      const descricaoHistorico = this.montarDescricaoAlteracoes(
        produtoAnterior,
        produtoAtualizado,
      );

      if (descricaoHistorico) {
        await this.registrarHistorico(id, descricaoHistorico, usuarioLogado);
      }

      return produtoAtualizado;
    } catch (error) {
      this.tratarErroPrisma(error);
    }
  }

  async ativar(id: string, usuarioLogado: AuthenticatedUser) {
    const produto = await this.buscarPorId(id, usuarioLogado);

    if (produto.ativo) {
      return produto;
    }

    const produtoAtualizado = await this.prisma.produto.update({
      where: {
        id,
      },
      data: {
        ativo: true,
      },
      include: this.includeProduto,
    });

    await this.registrarHistorico(id, 'Produto ativado.', usuarioLogado);

    return produtoAtualizado;
  }

  async desativar(id: string, usuarioLogado: AuthenticatedUser) {
    const produto = await this.buscarPorId(id, usuarioLogado);

    if (!produto.ativo) {
      return produto;
    }

    const produtoAtualizado = await this.prisma.produto.update({
      where: {
        id,
      },
      data: {
        ativo: false,
      },
      include: this.includeProduto,
    });

    await this.registrarHistorico(id, 'Produto desativado.', usuarioLogado);

    return produtoAtualizado;
  }

  async adicionarHistorico(
    produtoId: string,
    dados: CriarProdutoHistoricoDto,
    usuarioLogado: AuthenticatedUser,
  ) {
    await this.buscarPorId(produtoId, usuarioLogado);

    return this.prisma.produtoHistorico.create({
      data: {
        produtoId,
        descricao: dados.descricao,
        usuarioId: usuarioLogado.id,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            tipo: true,
          },
        },
      },
    });
  }

  async listarHistorico(produtoId: string, usuarioLogado: AuthenticatedUser) {
    await this.buscarPorId(produtoId, usuarioLogado);

    return this.prisma.produtoHistorico.findMany({
      where: {
        produtoId,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            tipo: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
