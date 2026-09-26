import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Prisma, TipoMovimentacaoEstoque } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import {
  CriarMovimentacaoEstoqueDto,
  TipoMovimentacaoEstoqueDto,
} from './dto/criar-movimentacao-estoque.dto';
import { CriarTransferenciaEstoqueDto } from './dto/criar-transferencia-estoque.dto';
import { FiltroMovimentacoesEstoqueDto } from './dto/filtro-movimentacoes-estoque.dto';
import {
  bloquearEstoques,
  chaveLockEstoque,
  tratarP2002Estoque,
  validarDepositoEstoque,
  validarProdutoEstoque,
} from '../estoque/estoque-transacional';

@Injectable()
export class MovimentacoesEstoqueService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly camposOrdenacao: Record<
    string,
    keyof Prisma.MovimentacaoEstoqueOrderByWithRelationInput
  > = {
    tipo: 'tipo',
    quantidade: 'quantidade',
    custoUnitario: 'custoUnitario',
    documentoReferencia: 'documentoReferencia',
    createdAt: 'createdAt',
  };

  private readonly permissaoPorTipo: Record<
    TipoMovimentacaoEstoqueDto,
    string
  > = {
    [TipoMovimentacaoEstoqueDto.ENTRADA]: 'estoque.entradas.registrar',
    [TipoMovimentacaoEstoqueDto.SAIDA]: 'estoque.saidas.registrar',
    [TipoMovimentacaoEstoqueDto.AJUSTE]: 'estoque.ajustes.realizar',
    [TipoMovimentacaoEstoqueDto.INVENTARIO]: 'estoque.inventarios.finalizar',
  };

  private decimal(valor: Prisma.Decimal.Value) {
    return new Prisma.Decimal(valor);
  }

  private async criarSaldo(
    tx: Prisma.TransactionClient,
    data: Prisma.EstoqueProdutoUncheckedCreateInput,
  ) {
    try {
      return await tx.estoqueProduto.create({ data });
    } catch (error) {
      tratarP2002Estoque(error);
    }
  }

  async criar(
    empresaId: string,
    dto: CriarMovimentacaoEstoqueDto,
    usuario: AuthenticatedUser,
  ) {
    const permissaoNecessaria = this.permissaoPorTipo[dto.tipo];
    if (!usuario.permissoes?.includes(permissaoNecessaria)) {
      throw new ForbiddenException(
        'Usuário não possui permissão para este tipo de movimentação.',
      );
    }
    const quantidade = this.decimal(dto.quantidade);
    const custoUnitario =
      dto.custoUnitario === undefined
        ? undefined
        : this.decimal(dto.custoUnitario);
    return this.prisma.$transaction(async (tx) => {
      const produto = await validarProdutoEstoque(tx, empresaId, dto.produtoId);
      await validarDepositoEstoque(tx, empresaId, dto.depositoId);
      await bloquearEstoques(tx, empresaId, [
        chaveLockEstoque(empresaId, dto.produtoId, dto.depositoId),
      ]);

      let estoque = await tx.estoqueProduto.findUnique({
        where: {
          empresaId_produtoId_depositoId: {
            empresaId,
            produtoId: dto.produtoId,
            depositoId: dto.depositoId,
          },
        },
      });
      if (!estoque) {
        if (dto.tipo === TipoMovimentacaoEstoqueDto.SAIDA) {
          throw new BadRequestException(
            'Não existe saldo disponível neste depósito',
          );
        }
        estoque = await this.criarSaldo(tx, {
          empresaId,
          produtoId: dto.produtoId,
          depositoId: dto.depositoId,
          quantidadeAtual: new Prisma.Decimal(0),
          estoqueMinimo: produto.estoqueMinimo,
          estoqueMaximo: produto.estoqueMaximo,
          custoMedio: new Prisma.Decimal(0),
          ultimoCusto: new Prisma.Decimal(0),
        });
      }

      const saldoAnterior = this.decimal(estoque.quantidadeAtual);
      let saldoPosterior: Prisma.Decimal;
      let data: Prisma.EstoqueProdutoUpdateInput;
      if (dto.tipo === TipoMovimentacaoEstoqueDto.ENTRADA) {
        saldoPosterior = saldoAnterior.plus(quantidade);
        let custoMedio = estoque.custoMedio;
        if (custoUnitario !== undefined && saldoPosterior.gt(0)) {
          custoMedio = saldoAnterior
            .mul(estoque.custoMedio)
            .plus(quantidade.mul(custoUnitario))
            .div(saldoPosterior);
        }
        data = {
          quantidadeAtual: { increment: quantidade },
          custoMedio,
          ultimoCusto: custoUnitario ?? estoque.ultimoCusto,
        };
      } else if (dto.tipo === TipoMovimentacaoEstoqueDto.SAIDA) {
        saldoPosterior = saldoAnterior.minus(quantidade);
        if (saldoPosterior.lt(0)) {
          throw new BadRequestException(
            `Estoque insuficiente. Saldo disponível: ${saldoAnterior.toString()}`,
          );
        }
        const baixa = await tx.estoqueProduto.updateMany({
          where: {
            id: estoque.id,
            empresaId,
            quantidadeAtual: { gte: quantidade },
          },
          data: { quantidadeAtual: { decrement: quantidade } },
        });
        if (baixa.count !== 1)
          throw new BadRequestException('Estoque insuficiente');
        data = {};
      } else if (
        dto.tipo === TipoMovimentacaoEstoqueDto.AJUSTE ||
        dto.tipo === TipoMovimentacaoEstoqueDto.INVENTARIO
      ) {
        saldoPosterior = quantidade;
        data = { quantidadeAtual: quantidade };
      } else {
        throw new BadRequestException('Tipo de movimentação não suportado');
      }

      if (Object.keys(data).length) {
        const alteracao = await tx.estoqueProduto.updateMany({
          where: { id: estoque.id, empresaId },
          data,
        });
        if (alteracao.count !== 1) {
          throw new BadRequestException('Estoque não encontrado');
        }
      }
      const estoqueAtualizado = await tx.estoqueProduto.findFirstOrThrow({
        where: { id: estoque.id, empresaId },
        include: { produto: true, deposito: true },
      });
      const movimentacao = await tx.movimentacaoEstoque.create({
        data: {
          tipo: dto.tipo,
          quantidade,
          saldoAnterior,
          saldoPosterior,
          custoUnitario,
          documentoReferencia: dto.documentoReferencia,
          observacao: dto.observacao,
          empresaId,
          produtoId: dto.produtoId,
          depositoId: dto.depositoId,
          usuarioId: usuario.id,
        },
        include: {
          produto: true,
          deposito: true,
          usuario: {
            select: { id: true, nome: true, email: true, tipo: true },
          },
        },
      });
      return { movimentacao, estoque: estoqueAtualizado };
    });
  }

  async transferir(
    empresaId: string,
    dto: CriarTransferenciaEstoqueDto,
    usuario: AuthenticatedUser,
  ) {
    if (dto.depositoOrigemId === dto.depositoDestinoId) {
      throw new BadRequestException(
        'O depósito de origem deve ser diferente do depósito de destino',
      );
    }
    const quantidade = this.decimal(dto.quantidade);
    return this.prisma.$transaction(async (tx) => {
      await validarProdutoEstoque(tx, empresaId, dto.produtoId);
      const depositoOrigem = await validarDepositoEstoque(
        tx,
        empresaId,
        dto.depositoOrigemId,
      );
      const depositoDestino = await validarDepositoEstoque(
        tx,
        empresaId,
        dto.depositoDestinoId,
      );
      await bloquearEstoques(tx, empresaId, [
        chaveLockEstoque(empresaId, dto.produtoId, dto.depositoOrigemId),
        chaveLockEstoque(empresaId, dto.produtoId, dto.depositoDestinoId),
      ]);
      const origem = await tx.estoqueProduto.findUnique({
        where: {
          empresaId_produtoId_depositoId: {
            empresaId,
            produtoId: dto.produtoId,
            depositoId: dto.depositoOrigemId,
          },
        },
      });
      if (!origem)
        throw new BadRequestException(
          'Não existe estoque do produto no depósito de origem',
        );
      const saldoOrigemAnterior = this.decimal(origem.quantidadeAtual);
      const saldoOrigemPosterior = saldoOrigemAnterior.minus(quantidade);
      if (saldoOrigemPosterior.lt(0)) {
        throw new BadRequestException(
          `Estoque insuficiente no depósito de origem. Saldo disponível: ${saldoOrigemAnterior.toString()}`,
        );
      }
      let destino = await tx.estoqueProduto.findUnique({
        where: {
          empresaId_produtoId_depositoId: {
            empresaId,
            produtoId: dto.produtoId,
            depositoId: dto.depositoDestinoId,
          },
        },
      });
      if (!destino)
        destino = await this.criarSaldo(tx, {
          empresaId,
          produtoId: dto.produtoId,
          depositoId: dto.depositoDestinoId,
          quantidadeAtual: new Prisma.Decimal(0),
          estoqueMinimo: new Prisma.Decimal(0),
          custoMedio: origem.custoMedio,
          ultimoCusto: origem.ultimoCusto,
        });
      const saldoDestinoAnterior = this.decimal(destino.quantidadeAtual);
      const saldoDestinoPosterior = saldoDestinoAnterior.plus(quantidade);
      const baixa = await tx.estoqueProduto.updateMany({
        where: {
          id: origem.id,
          empresaId,
          quantidadeAtual: { gte: quantidade },
        },
        data: { quantidadeAtual: { decrement: quantidade } },
      });
      if (baixa.count !== 1)
        throw new BadRequestException(
          'Estoque insuficiente no depósito de origem',
        );
      const entrada = await tx.estoqueProduto.updateMany({
        where: { id: destino.id, empresaId },
        data: {
          quantidadeAtual: { increment: quantidade },
          custoMedio: origem.custoMedio,
          ultimoCusto: origem.ultimoCusto,
        },
      });
      if (entrada.count !== 1) {
        throw new BadRequestException('Estoque de destino não encontrado');
      }
      const estoqueDestino = await tx.estoqueProduto.findFirstOrThrow({
        where: { id: destino.id, empresaId },
        include: { produto: true, deposito: true },
      });
      const estoqueOrigem = await tx.estoqueProduto.findFirstOrThrow({
        where: { id: origem.id, empresaId },
        include: { produto: true, deposito: true },
      });
      const observacao =
        dto.observacao ||
        `Transferência de ${depositoOrigem.nome} para ${depositoDestino.nome}`;
      const comum = {
        quantidade,
        custoUnitario: origem.custoMedio,
        documentoReferencia: dto.documentoReferencia,
        observacao,
        empresaId,
        produtoId: dto.produtoId,
        usuarioId: usuario.id,
      };
      const movimentacaoSaida = await tx.movimentacaoEstoque.create({
        data: {
          ...comum,
          tipo: TipoMovimentacaoEstoque.TRANSFERENCIA_SAIDA,
          depositoId: dto.depositoOrigemId,
          saldoAnterior: saldoOrigemAnterior,
          saldoPosterior: saldoOrigemPosterior,
        },
        include: { produto: true, deposito: true, usuario: true },
      });
      const movimentacaoEntrada = await tx.movimentacaoEstoque.create({
        data: {
          ...comum,
          tipo: TipoMovimentacaoEstoque.TRANSFERENCIA_ENTRADA,
          depositoId: dto.depositoDestinoId,
          saldoAnterior: saldoDestinoAnterior,
          saldoPosterior: saldoDestinoPosterior,
        },
        include: { produto: true, deposito: true, usuario: true },
      });
      return {
        movimentacaoSaida,
        movimentacaoEntrada,
        estoqueOrigem,
        estoqueDestino,
      };
    });
  }

  async listar(empresaId: string, filtros: FiltroMovimentacoesEstoqueDto) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 10;
    const { skip, take } = calcularPaginacao(page, limit);
    const where: Prisma.MovimentacaoEstoqueWhereInput = { empresaId };
    if (filtros.produtoId) where.produtoId = filtros.produtoId;
    if (filtros.depositoId) where.depositoId = filtros.depositoId;
    if (filtros.tipo) where.tipo = filtros.tipo;
    if (filtros.search)
      where.OR = [
        { observacao: { contains: filtros.search, mode: 'insensitive' } },
        {
          documentoReferencia: {
            contains: filtros.search,
            mode: 'insensitive',
          },
        },
        {
          produto: { nome: { contains: filtros.search, mode: 'insensitive' } },
        },
        {
          produto: {
            codigo: { contains: filtros.search, mode: 'insensitive' },
          },
        },
        {
          deposito: { nome: { contains: filtros.search, mode: 'insensitive' } },
        },
      ];
    const campoOrdenacao =
      this.camposOrdenacao[filtros.sortBy ?? 'createdAt'] ?? 'createdAt';
    const orderBy: Prisma.MovimentacaoEstoqueOrderByWithRelationInput = {
      [campoOrdenacao]: filtros.order ?? 'desc',
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.movimentacaoEstoque.findMany({
        where,
        include: {
          produto: true,
          deposito: true,
          usuario: {
            select: { id: true, nome: true, email: true, tipo: true },
          },
        },
        orderBy,
        skip,
        take,
      }),
      this.prisma.movimentacaoEstoque.count({ where }),
    ]);
    return respostaPaginada(data, total, page, limit);
  }
}
