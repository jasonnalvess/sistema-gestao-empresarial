import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TipoMovimentacaoEstoque } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CriarEstoqueProdutoDto } from './dto/criar-estoque-produto.dto';
import { AtualizarEstoqueProdutoDto } from './dto/atualizar-estoque-produto.dto';
import { FiltroEstoqueDto } from './dto/filtro-estoque.dto';
import {
  bloquearEstoques,
  chaveLockEstoque,
  tratarP2002Estoque,
  validarDepositoEstoque,
  validarProdutoEstoque,
} from './estoque-transacional';

type EstoqueComRelacoes = Prisma.EstoqueProdutoGetPayload<{
  include: { produto: true; deposito: true };
}>;

@Injectable()
export class EstoqueService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly camposOrdenacao: Record<
    string,
    keyof Prisma.EstoqueProdutoOrderByWithRelationInput
  > = {
    quantidadeAtual: 'quantidadeAtual',
    estoqueMinimo: 'estoqueMinimo',
    estoqueMaximo: 'estoqueMaximo',
    custoMedio: 'custoMedio',
    ultimoCusto: 'ultimoCusto',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  };

  async criar(
    empresaId: string,
    dados: CriarEstoqueProdutoDto,
    usuario: AuthenticatedUser,
  ) {
    const quantidadeInicial = new Prisma.Decimal(dados.quantidadeAtual ?? 0);
    if (!quantidadeInicial.isFinite() || quantidadeInicial.lt(0)) {
      throw new BadRequestException(
        'A quantidade inicial não pode ser negativa',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      await validarProdutoEstoque(tx, empresaId, dados.produtoId);
      await validarDepositoEstoque(tx, empresaId, dados.depositoId);
      await bloquearEstoques(tx, empresaId, [
        chaveLockEstoque(empresaId, dados.produtoId, dados.depositoId),
      ]);
      const existente = await tx.estoqueProduto.findUnique({
        where: {
          empresaId_produtoId_depositoId: {
            empresaId,
            produtoId: dados.produtoId,
            depositoId: dados.depositoId,
          },
        },
        select: { id: true },
      });
      if (existente) {
        throw new ConflictException(
          'Já existe estoque para o produto neste depósito',
        );
      }
      let estoque: EstoqueComRelacoes;
      try {
        estoque = await tx.estoqueProduto.create({
          data: {
            produtoId: dados.produtoId,
            depositoId: dados.depositoId,
            empresaId,
            quantidadeAtual: quantidadeInicial,
            estoqueMinimo: new Prisma.Decimal(dados.estoqueMinimo ?? 0),
            estoqueMaximo:
              dados.estoqueMaximo === undefined
                ? undefined
                : new Prisma.Decimal(dados.estoqueMaximo),
          },
          include: { produto: true, deposito: true },
        });
      } catch (error) {
        tratarP2002Estoque(error);
      }
      if (quantidadeInicial.gt(0)) {
        await tx.movimentacaoEstoque.create({
          data: {
            tipo: TipoMovimentacaoEstoque.ENTRADA,
            quantidade: quantidadeInicial,
            saldoAnterior: new Prisma.Decimal(0),
            saldoPosterior: quantidadeInicial,
            observacao:
              dados.motivoAjuste?.trim() ||
              'Saldo inicial informado no cadastro do estoque.',
            documentoReferencia: `ESTOQUE-${estoque.id}`,
            empresaId,
            produtoId: dados.produtoId,
            depositoId: dados.depositoId,
            usuarioId: usuario.id,
          },
        });
      }
      return estoque;
    });
  }

  async listar(empresaId: string, filtros: FiltroEstoqueDto) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 10;
    const { skip, take } = calcularPaginacao(page, limit);
    const where: Prisma.EstoqueProdutoWhereInput = {
      empresaId,
    };
    if (filtros.produtoId) where.produtoId = filtros.produtoId;
    if (filtros.depositoId) where.depositoId = filtros.depositoId;
    if (filtros.search)
      where.produto = {
        OR: [
          { nome: { contains: filtros.search, mode: 'insensitive' } },
          { codigo: { contains: filtros.search, mode: 'insensitive' } },
        ],
      };
    const campoOrdenacao =
      this.camposOrdenacao[filtros.sortBy ?? 'updatedAt'] ?? 'updatedAt';
    const orderBy: Prisma.EstoqueProdutoOrderByWithRelationInput = {
      [campoOrdenacao]: filtros.order ?? 'desc',
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.estoqueProduto.findMany({
        where,
        include: { produto: true, deposito: true },
        orderBy,
        skip,
        take,
      }),
      this.prisma.estoqueProduto.count({ where }),
    ]);
    return respostaPaginada(data, total, page, limit);
  }

  async buscarPorId(empresaId: string, id: string) {
    const estoque = await this.prisma.estoqueProduto.findFirst({
      where: { id, empresaId },
      include: { produto: true, deposito: true },
    });
    if (!estoque)
      throw new NotFoundException('Estoque do produto não encontrado');
    return estoque;
  }

  async buscarPorProdutoDeposito(
    empresaId: string,
    produtoId: string,
    depositoId: string,
  ) {
    return this.prisma.estoqueProduto.findFirst({
      where: { produtoId, depositoId, empresaId },
      include: { produto: true, deposito: true },
    });
  }

  async atualizar(
    empresaId: string,
    id: string,
    dados: AtualizarEstoqueProdutoDto,
    usuario: AuthenticatedUser,
  ) {
    const saldoInformado =
      dados.quantidadeAtual === undefined
        ? undefined
        : new Prisma.Decimal(dados.quantidadeAtual);
    if (
      saldoInformado &&
      (!saldoInformado.isFinite() || saldoInformado.lt(0))
    ) {
      throw new BadRequestException('A quantidade atual não pode ser negativa');
    }
    return this.prisma.$transaction(async (tx) => {
      const minimo = await tx.estoqueProduto.findFirst({
        where: { id, empresaId },
        select: { produtoId: true, depositoId: true },
      });
      if (!minimo)
        throw new NotFoundException('Estoque do produto não encontrado');
      await bloquearEstoques(tx, empresaId, [
        chaveLockEstoque(empresaId, minimo.produtoId, minimo.depositoId),
      ]);
      const estoque = await tx.estoqueProduto.findFirst({
        where: { id, empresaId },
      });
      if (!estoque) {
        throw new NotFoundException('Estoque do produto não encontrado');
      }
      const saldoAnterior = new Prisma.Decimal(estoque.quantidadeAtual);
      const saldoPosterior = saldoInformado ?? saldoAnterior;
      const diferenca = saldoPosterior.minus(saldoAnterior);
      const alteracao = await tx.estoqueProduto.updateMany({
        where: { id, empresaId },
        data: {
          quantidadeAtual: diferenca.eq(0) ? undefined : saldoPosterior,
          estoqueMinimo:
            dados.estoqueMinimo === undefined
              ? undefined
              : new Prisma.Decimal(dados.estoqueMinimo),
          estoqueMaximo:
            dados.estoqueMaximo === undefined
              ? undefined
              : new Prisma.Decimal(dados.estoqueMaximo),
        },
      });
      if (alteracao.count !== 1) {
        throw new NotFoundException('Estoque do produto não encontrado');
      }
      if (!diferenca.eq(0)) {
        const sentido = diferenca.gt(0) ? 'Aumento' : 'Redução';
        await tx.movimentacaoEstoque.create({
          data: {
            tipo: TipoMovimentacaoEstoque.AJUSTE,
            quantidade: diferenca.abs(),
            saldoAnterior,
            saldoPosterior,
            observacao:
              dados.motivoAjuste?.trim() ||
              `Ajuste manual realizado pelo cadastro de estoque (${sentido.toLowerCase()} de saldo).`,
            documentoReferencia: `ESTOQUE-${estoque.id}`,
            empresaId: estoque.empresaId,
            produtoId: estoque.produtoId,
            depositoId: estoque.depositoId,
            usuarioId: usuario.id,
          },
        });
      }
      return tx.estoqueProduto.findFirstOrThrow({
        where: { id, empresaId },
        include: { produto: true, deposito: true },
      });
    });
  }
}
