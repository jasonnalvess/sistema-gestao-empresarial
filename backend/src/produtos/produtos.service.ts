import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

import { PrismaService } from '../prisma/prisma.service';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';

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

const CAMPOS_ORDENACAO = {
  nome: 'nome',
  codigo: 'codigo',
  codigoBarras: 'codigoBarras',
  precoVenda: 'precoVenda',
  precoCusto: 'precoCusto',
  ativo: 'ativo',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
} as const satisfies Record<
  string,
  keyof Prisma.ProdutoOrderByWithRelationInput
>;

function ehCampoOrdenacao(
  campo: string,
): campo is keyof typeof CAMPOS_ORDENACAO {
  return campo in CAMPOS_ORDENACAO;
}

type ClienteProduto = Pick<
  Prisma.TransactionClient,
  | 'produto'
  | 'produtoHistorico'
  | 'categoriaProduto'
  | 'marcaProduto'
  | 'unidadeMedida'
>;
@Injectable()
export class ProdutosService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeProduto = PRODUTO_INCLUDE;

  private tratarErroPrisma(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = error.meta?.target;
      const campos =
        Array.isArray(target) && target.length === 2
          ? target.map(String)
          : null;
      const nome = campos
        ? campos.includes('empresaId') && campos.includes('nome')
        : target === 'Produto_empresaId_nome_key';
      const codigo = campos
        ? campos.includes('empresaId') && campos.includes('codigo')
        : target === 'Produto_empresaId_codigo_key';
      const codigoBarras = campos
        ? campos.includes('empresaId') && campos.includes('codigoBarras')
        : target === 'Produto_empresaId_codigoBarras_key';

      if (nome) {
        throw new ConflictException(
          'Já existe um produto com este nome nesta empresa.',
        );
      }
      if (codigo) {
        throw new ConflictException(
          'Já existe um produto com este código nesta empresa.',
        );
      }
      if (codigoBarras) {
        throw new ConflictException(
          'Já existe um produto com este código de barras nesta empresa.',
        );
      }
    }
    throw error;
  }
  private valorTexto(valor: unknown): string {
    if (
      typeof valor === 'string' ||
      typeof valor === 'number' ||
      typeof valor === 'bigint' ||
      typeof valor === 'boolean'
    ) {
      return String(valor);
    }
    if (valor instanceof Date) return valor.toISOString();
    if (Prisma.Decimal.isDecimal(valor)) return valor.toString();
    return JSON.stringify(valor) ?? '';
  }

  private valorComparavel(valor: unknown): string {
    if (valor === null || valor === undefined) return '';
    return this.valorTexto(valor);
  }

  private valorExibicao(valor: unknown): string {
    if (valor === null || valor === undefined || valor === '') {
      return 'não informado';
    }
    return this.valorTexto(valor);
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
    cliente: ClienteProduto,
    produtoId: string,
    descricao: string,
    usuario: AuthenticatedUser,
  ) {
    return cliente.produtoHistorico.create({
      data: { produtoId, descricao, usuarioId: usuario.id },
    });
  }

  private async buscarProduto(
    cliente: ClienteProduto,
    empresaId: string,
    id: string,
  ) {
    const produto = await cliente.produto.findFirst({
      where: { id, empresaId },
      include: this.includeProduto,
    });
    if (!produto) throw new NotFoundException('Produto não encontrado');
    return produto;
  }

  private async validarVinculos(
    cliente: ClienteProduto,
    empresaId: string,
    dados: {
      categoriaId?: string;
      marcaId?: string;
      unidadeMedidaId?: string;
    },
  ) {
    if (dados.categoriaId) {
      const categoria = await cliente.categoriaProduto.findFirst({
        where: { id: dados.categoriaId, empresaId },
      });
      if (!categoria) throw new NotFoundException('Categoria não encontrada');
      if (!categoria.ativo) {
        throw new BadRequestException(
          'Não é possível vincular uma categoria inativa',
        );
      }
    }
    if (dados.marcaId) {
      const marca = await cliente.marcaProduto.findFirst({
        where: { id: dados.marcaId, empresaId },
      });
      if (!marca) throw new NotFoundException('Marca não encontrada');
      if (!marca.ativo) {
        throw new BadRequestException(
          'Não é possível vincular uma marca inativa',
        );
      }
    }
    if (dados.unidadeMedidaId) {
      const unidade = await cliente.unidadeMedida.findFirst({
        where: { id: dados.unidadeMedidaId, empresaId },
      });
      if (!unidade) {
        throw new NotFoundException('Unidade de medida não encontrada');
      }
      if (!unidade.ativo) {
        throw new BadRequestException(
          'Não é possível vincular uma unidade de medida inativa',
        );
      }
    }
  }

  async criar(
    empresaId: string,
    dados: CriarProdutoDto,
    usuario: AuthenticatedUser,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.validarVinculos(tx, empresaId, dados);
        const produto = await tx.produto.create({
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
          tx,
          produto.id,
          `Produto criado com preço de venda de R$ ${Number(
            produto.precoVenda,
          ).toFixed(2)}.`,
          usuario,
        );
        return produto;
      });
    } catch (error) {
      this.tratarErroPrisma(error);
    }
  }

  async listar(empresaId: string, filtros: FiltroProdutosDto) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 10;
    const { skip, take } = calcularPaginacao(page, limit);
    const where: Prisma.ProdutoWhereInput = { empresaId };
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
    if (filtros.ativo !== undefined) where.ativo = filtros.ativo;
    if (filtros.categoriaId) where.categoriaId = filtros.categoriaId;
    if (filtros.marcaId) where.marcaId = filtros.marcaId;
    if (filtros.unidadeMedidaId) {
      where.unidadeMedidaId = filtros.unidadeMedidaId;
    }
    const campo =
      filtros.sortBy && ehCampoOrdenacao(filtros.sortBy)
        ? CAMPOS_ORDENACAO[filtros.sortBy]
        : 'createdAt';
    const orderBy: Prisma.ProdutoOrderByWithRelationInput = {
      [campo]: filtros.order ?? 'desc',
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.produto.findMany({
        where,
        include: this.includeProduto,
        orderBy,
        skip,
        take,
      }),
      this.prisma.produto.count({ where }),
    ]);
    return respostaPaginada(data, total, page, limit);
  }

  async buscarPorId(empresaId: string, id: string) {
    return this.buscarProduto(this.prisma, empresaId, id);
  }

  async atualizar(
    empresaId: string,
    id: string,
    dados: AtualizarProdutoDto,
    usuario: AuthenticatedUser,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const anterior = await this.buscarProduto(tx, empresaId, id);
        await this.validarVinculos(tx, empresaId, dados);
        const atualizado = await tx.produto.update({
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
        const descricao = this.montarDescricaoAlteracoes(anterior, atualizado);
        if (descricao) {
          await this.registrarHistorico(tx, id, descricao, usuario);
        }
        return atualizado;
      });
    } catch (error) {
      this.tratarErroPrisma(error);
    }
  }

  async ativar(empresaId: string, id: string, usuario: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      const produto = await this.buscarProduto(tx, empresaId, id);
      if (produto.ativo) return produto;
      const atualizado = await tx.produto.update({
        where: { id },
        data: { ativo: true },
        include: this.includeProduto,
      });
      await this.registrarHistorico(tx, id, 'Produto ativado.', usuario);
      return atualizado;
    });
  }

  async desativar(empresaId: string, id: string, usuario: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      const produto = await this.buscarProduto(tx, empresaId, id);
      if (!produto.ativo) return produto;
      const atualizado = await tx.produto.update({
        where: { id },
        data: { ativo: false },
        include: this.includeProduto,
      });
      await this.registrarHistorico(tx, id, 'Produto desativado.', usuario);
      return atualizado;
    });
  }

  async adicionarHistorico(
    empresaId: string,
    produtoId: string,
    dados: CriarProdutoHistoricoDto,
    usuario: AuthenticatedUser,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.buscarProduto(tx, empresaId, produtoId);
      return tx.produtoHistorico.create({
        data: {
          produtoId,
          descricao: dados.descricao,
          usuarioId: usuario.id,
        },
        include: {
          usuario: {
            select: { id: true, nome: true, email: true, tipo: true },
          },
        },
      });
    });
  }

  async listarHistorico(empresaId: string, produtoId: string) {
    await this.buscarPorId(empresaId, produtoId);
    return this.prisma.produtoHistorico.findMany({
      where: { produtoId },
      include: {
        usuario: {
          select: { id: true, nome: true, email: true, tipo: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
