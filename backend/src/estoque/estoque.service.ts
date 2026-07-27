import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TipoMovimentacaoEstoque } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { obterEmpresaId } from '../common/utils/obter-empresa-id';
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

@Injectable()
export class EstoqueService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(dados: CriarEstoqueProdutoDto, usuario: AuthenticatedUser) {
    const empresaId = obterEmpresaId(usuario);
    const quantidadeInicial = new Prisma.Decimal(dados.quantidadeAtual ?? 0);
    if (!quantidadeInicial.isFinite() || quantidadeInicial.lt(0)) {
      throw new BadRequestException(
        'A quantidade inicial não pode ser negativa',
      );
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        await validarProdutoEstoque(tx, dados.produtoId, empresaId);
        await validarDepositoEstoque(tx, dados.depositoId, empresaId);
        await bloquearEstoques(tx, [
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
        const estoque = await tx.estoqueProduto.create({
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
    } catch (error) {
      tratarP2002Estoque(error);
    }
  }

  async listar(usuario: AuthenticatedUser, filtros: FiltroEstoqueDto) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 10;
    const { skip, take } = calcularPaginacao(page, limit);
    const where: Prisma.EstoqueProdutoWhereInput = {
      empresaId: obterEmpresaId(usuario),
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
    const [data, total] = await this.prisma.$transaction([
      this.prisma.estoqueProduto.findMany({
        where,
        include: { produto: true, deposito: true },
        orderBy: { [filtros.sortBy ?? 'createdAt']: filtros.order ?? 'desc' },
        skip,
        take,
      }),
      this.prisma.estoqueProduto.count({ where }),
    ]);
    return respostaPaginada(data, total, page, limit);
  }

  async buscarPorId(id: string, usuario: AuthenticatedUser) {
    const estoque = await this.prisma.estoqueProduto.findUnique({
      where: { id },
      include: { produto: true, deposito: true },
    });
    if (!estoque)
      throw new NotFoundException('Estoque do produto não encontrado');
    if (estoque.empresaId !== obterEmpresaId(usuario)) {
      throw new ForbiddenException('Acesso negado a estoque de outra empresa');
    }
    return estoque;
  }

  async buscarPorProdutoDeposito(
    produtoId: string,
    depositoId: string,
    usuario: AuthenticatedUser,
  ) {
    return this.prisma.estoqueProduto.findFirst({
      where: { produtoId, depositoId, empresaId: obterEmpresaId(usuario) },
      include: { produto: true, deposito: true },
    });
  }

  async atualizar(
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
      const minimo = await tx.estoqueProduto.findUnique({
        where: { id },
        select: { empresaId: true, produtoId: true, depositoId: true },
      });
      if (!minimo)
        throw new NotFoundException('Estoque do produto não encontrado');
      if (minimo.empresaId !== obterEmpresaId(usuario)) {
        throw new ForbiddenException(
          'Acesso negado a estoque de outra empresa',
        );
      }
      await bloquearEstoques(tx, [
        chaveLockEstoque(minimo.empresaId, minimo.produtoId, minimo.depositoId),
      ]);
      const estoque = await tx.estoqueProduto.findUnique({ where: { id } });
      if (!estoque || estoque.empresaId !== obterEmpresaId(usuario)) {
        throw new NotFoundException('Estoque do produto não encontrado');
      }
      const saldoAnterior = new Prisma.Decimal(estoque.quantidadeAtual);
      const saldoPosterior = saldoInformado ?? saldoAnterior;
      const diferenca = saldoPosterior.minus(saldoAnterior);
      const atualizado = await tx.estoqueProduto.update({
        where: { id },
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
        include: { produto: true, deposito: true },
      });
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
      return atualizado;
    });
  }
}
