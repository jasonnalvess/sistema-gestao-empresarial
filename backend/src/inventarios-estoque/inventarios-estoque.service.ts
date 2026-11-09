import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  StatusInventarioEstoque,
  StatusItemInventario,
  TipoMovimentacaoEstoque,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CriarInventarioEstoqueDto } from './dto/criar-inventario-estoque.dto';
import { AtualizarInventarioEstoqueDto } from './dto/atualizar-inventario-estoque.dto';
import { ContarItemInventarioDto } from './dto/contar-item-inventario.dto';
import { FiltroInventariosEstoqueDto } from './dto/filtro-inventarios-estoque.dto';
import {
  bloquearEstoques,
  chaveLockEstoque,
  tratarP2002Estoque,
} from '../estoque/estoque-transacional';

@Injectable()
export class InventariosEstoqueService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeInventario = {
    deposito: true,
    usuarioAbertura: {
      select: { id: true, nome: true, email: true, tipo: true },
    },
    usuarioConclusao: {
      select: { id: true, nome: true, email: true, tipo: true },
    },
    itens: {
      include: { produto: { include: { unidadeMedida: true } } },
      orderBy: { produto: { nome: 'asc' as const } },
    },
  } satisfies Prisma.InventarioEstoqueInclude;

  private readonly camposOrdenacao: Record<
    string,
    keyof Prisma.InventarioEstoqueOrderByWithRelationInput
  > = {
    numero: 'numero',
    status: 'status',
    dataAbertura: 'dataAbertura',
    dataConclusao: 'dataConclusao',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  };

  private async validarDeposito(
    tx: Prisma.TransactionClient,
    empresaId: string,
    depositoId: string,
  ) {
    const deposito = await tx.deposito.findFirst({
      where: { id: depositoId, empresaId },
    });
    if (!deposito) throw new NotFoundException('Depósito não encontrado');
    if (!deposito.ativo) {
      throw new BadRequestException(
        'Não é possível abrir inventário em depósito inativo',
      );
    }
    return deposito;
  }

  private async bloquearCriacao(
    tx: Prisma.TransactionClient,
    empresaId: string,
    depositoId: string,
  ) {
    const chaveNumero = `inventario-numero:${empresaId}`;
    const chaveDeposito = `inventario-aberto:${empresaId}:${depositoId}`;
    await tx.$executeRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${chaveNumero}, 0))`,
    );
    await tx.$executeRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${chaveDeposito}, 0))`,
    );
  }

  private async bloquearInventario(
    tx: Prisma.TransactionClient,
    empresaId: string,
    id: string,
  ) {
    const bloqueados = await tx.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        SELECT "id"
        FROM "InventarioEstoque"
        WHERE "id" = ${id}
          AND "empresaId" = ${empresaId}
        FOR UPDATE
      `,
    );
    if (bloqueados.length === 0) {
      throw new NotFoundException('Inventário não encontrado');
    }
  }

  private async buscarInventarioMutacao(
    tx: Prisma.TransactionClient,
    empresaId: string,
    id: string,
  ) {
    await this.bloquearInventario(tx, empresaId, id);
    const inventario = await tx.inventarioEstoque.findFirst({
      where: { id, empresaId },
      include: this.includeInventario,
    });
    if (!inventario) throw new NotFoundException('Inventário não encontrado');
    return inventario;
  }

  private targetExato(
    error: unknown,
    campos: string[],
    constraint: string,
  ): boolean {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== 'P2002'
    ) {
      return false;
    }
    const target = error.meta?.target;
    return Array.isArray(target)
      ? target.length === campos.length &&
          campos.every((campo) => target.includes(campo))
      : target === constraint;
  }

  private isP2002Numero(error: unknown) {
    return this.targetExato(
      error,
      ['empresaId', 'numero'],
      'InventarioEstoque_empresaId_numero_key',
    );
  }

  private isP2002Item(error: unknown) {
    return this.targetExato(
      error,
      ['inventarioId', 'produtoId'],
      'InventarioEstoqueItem_inventarioId_produtoId_key',
    );
  }

  private async validarProdutos(
    tx: Prisma.TransactionClient,
    empresaId: string,
    produtoIds: string[],
  ) {
    const idsUnicos = [...new Set(produtoIds)];
    if (idsUnicos.length !== produtoIds.length) {
      throw new BadRequestException('O inventário possui produtos duplicados');
    }
    if (idsUnicos.length === 0) return;
    const produtos = await tx.produto.findMany({
      where: { empresaId, id: { in: idsUnicos } },
      select: { id: true, ativo: true },
    });
    if (produtos.length !== idsUnicos.length) {
      throw new NotFoundException('Produto não encontrado');
    }
    if (produtos.some((produto) => !produto.ativo)) {
      throw new BadRequestException(
        'Não é possível inventariar um produto inativo',
      );
    }
  }

  async criar(
    empresaId: string,
    dados: CriarInventarioEstoqueDto,
    usuario: AuthenticatedUser,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const deposito = await this.validarDeposito(
        tx,
        empresaId,
        dados.depositoId,
      );
      await this.bloquearCriacao(tx, empresaId, deposito.id);
      const inventarioAberto = await tx.inventarioEstoque.findFirst({
        where: {
          empresaId,
          depositoId: deposito.id,
          status: {
            in: [
              StatusInventarioEstoque.ABERTO,
              StatusInventarioEstoque.EM_CONTAGEM,
            ],
          },
        },
      });
      if (inventarioAberto) {
        throw new BadRequestException(
          'Já existe um inventário aberto para este depósito',
        );
      }
      const ultimo = await tx.inventarioEstoque.findFirst({
        where: { empresaId },
        orderBy: { numero: 'desc' },
        select: { numero: true },
      });
      const estoques = await tx.estoqueProduto.findMany({
        where: { empresaId, depositoId: deposito.id },
      });
      if (estoques.length === 0) {
        throw new BadRequestException(
          'Não existem itens de estoque cadastrados neste depósito para realizar o inventário.',
        );
      }
      await this.validarProdutos(
        tx,
        empresaId,
        estoques.map((estoque) => estoque.produtoId),
      );
      try {
        return await tx.inventarioEstoque.create({
          data: {
            numero: (ultimo?.numero ?? 0) + 1,
            descricao: dados.descricao,
            observacao: dados.observacao,
            status: StatusInventarioEstoque.ABERTO,
            empresaId,
            depositoId: deposito.id,
            usuarioAberturaId: usuario.id,
            itens: {
              create: estoques.map((estoque) => ({
                produtoId: estoque.produtoId,
                quantidadeSistema: estoque.quantidadeAtual,
                status: StatusItemInventario.PENDENTE,
              })),
            },
          },
          include: this.includeInventario,
        });
      } catch (error) {
        if (this.isP2002Numero(error)) {
          throw new ConflictException(
            'Conflito ao gerar a numeração do inventário; repita a operação',
          );
        }
        if (this.isP2002Item(error)) {
          throw new ConflictException(
            'O inventário não pode conter o mesmo produto mais de uma vez',
          );
        }
        throw error;
      }
    });
  }

  async listar(empresaId: string, filtros: FiltroInventariosEstoqueDto) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 10;
    const { skip, take } = calcularPaginacao(page, limit);
    const where: Prisma.InventarioEstoqueWhereInput = { empresaId };
    if (filtros.status) where.status = filtros.status;
    if (filtros.depositoId) where.depositoId = filtros.depositoId;
    if (filtros.search) {
      const numero = Number(filtros.search);
      where.OR = [
        { descricao: { contains: filtros.search, mode: 'insensitive' } },
        { observacao: { contains: filtros.search, mode: 'insensitive' } },
        {
          deposito: { nome: { contains: filtros.search, mode: 'insensitive' } },
        },
      ];
      if (!Number.isNaN(numero)) where.OR.push({ numero });
    }
    const campoOrdenacao =
      this.camposOrdenacao[filtros.sortBy ?? 'createdAt'] ?? 'createdAt';
    const orderBy: Prisma.InventarioEstoqueOrderByWithRelationInput = {
      [campoOrdenacao]: filtros.order ?? 'desc',
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.inventarioEstoque.findMany({
        where,
        include: {
          deposito: true,
          usuarioAbertura: {
            select: { id: true, nome: true, email: true, tipo: true },
          },
          usuarioConclusao: {
            select: { id: true, nome: true, email: true, tipo: true },
          },
          _count: { select: { itens: true } },
        },
        orderBy,
        skip,
        take,
      }),
      this.prisma.inventarioEstoque.count({ where }),
    ]);
    return respostaPaginada(data, total, page, limit);
  }

  async buscarPorId(empresaId: string, id: string) {
    const inventario = await this.prisma.inventarioEstoque.findFirst({
      where: { id, empresaId },
      include: this.includeInventario,
    });
    if (!inventario) throw new NotFoundException('Inventário não encontrado');
    return inventario;
  }

  async atualizar(
    empresaId: string,
    id: string,
    dados: AtualizarInventarioEstoqueDto,
    usuario: AuthenticatedUser,
  ) {
    void usuario;
    return this.prisma.$transaction(async (tx) => {
      const inventario = await this.buscarInventarioMutacao(tx, empresaId, id);
      if (
        inventario.status === StatusInventarioEstoque.FINALIZADO ||
        inventario.status === StatusInventarioEstoque.CANCELADO
      ) {
        throw new BadRequestException(
          'Inventário finalizado ou cancelado não pode ser alterado',
        );
      }
      const alteracao = await tx.inventarioEstoque.updateMany({
        where: { id, empresaId, status: inventario.status },
        data: { descricao: dados.descricao, observacao: dados.observacao },
      });
      if (alteracao.count !== 1) {
        throw new BadRequestException('O inventário já foi alterado');
      }
      return tx.inventarioEstoque.findFirstOrThrow({
        where: { id, empresaId },
        include: this.includeInventario,
      });
    });
  }

  async contarItem(
    empresaId: string,
    inventarioId: string,
    itemId: string,
    dados: ContarItemInventarioDto,
    usuario: AuthenticatedUser,
  ) {
    void usuario;
    const quantidadeContada = new Prisma.Decimal(dados.quantidadeContada);
    return this.prisma.$transaction(async (tx) => {
      const inventario = await this.buscarInventarioMutacao(
        tx,
        empresaId,
        inventarioId,
      );
      if (
        inventario.status === StatusInventarioEstoque.FINALIZADO ||
        inventario.status === StatusInventarioEstoque.CANCELADO
      ) {
        throw new BadRequestException(
          'Este inventário não aceita novas contagens',
        );
      }
      const item = await tx.inventarioEstoqueItem.findFirst({
        where: {
          id: itemId,
          inventarioId,
          inventario: { empresaId },
          produto: { empresaId },
        },
      });
      if (!item) {
        throw new NotFoundException('Item não encontrado neste inventário');
      }
      const alteracao = await tx.inventarioEstoqueItem.updateMany({
        where: { id: itemId, inventarioId },
        data: {
          quantidadeContada,
          diferenca: quantidadeContada.minus(item.quantidadeSistema),
          observacao: dados.observacao,
          status: StatusItemInventario.CONTADO,
        },
      });
      if (alteracao.count !== 1) {
        throw new BadRequestException('O item já foi alterado');
      }
      if (inventario.status === StatusInventarioEstoque.ABERTO) {
        const transicao = await tx.inventarioEstoque.updateMany({
          where: {
            id: inventarioId,
            empresaId,
            status: StatusInventarioEstoque.ABERTO,
          },
          data: { status: StatusInventarioEstoque.EM_CONTAGEM },
        });
        if (transicao.count !== 1) {
          throw new BadRequestException(
            'O inventário não está mais aberto para contagem',
          );
        }
      }
      return tx.inventarioEstoqueItem.findFirstOrThrow({
        where: { id: itemId, inventarioId, inventario: { empresaId } },
        include: { produto: { include: { unidadeMedida: true } } },
      });
    });
  }

  async cancelar(empresaId: string, id: string, usuario: AuthenticatedUser) {
    void usuario;
    return this.prisma.$transaction(async (tx) => {
      const inventario = await this.buscarInventarioMutacao(tx, empresaId, id);
      if (inventario.status === StatusInventarioEstoque.FINALIZADO) {
        throw new BadRequestException(
          'Inventário finalizado não pode ser cancelado',
        );
      }
      if (inventario.status === StatusInventarioEstoque.CANCELADO) {
        return inventario;
      }
      const transicao = await tx.inventarioEstoque.updateMany({
        where: { id, empresaId, status: inventario.status },
        data: { status: StatusInventarioEstoque.CANCELADO },
      });
      if (transicao.count !== 1) {
        throw new BadRequestException(
          'O inventário já foi alterado e não pode ser cancelado',
        );
      }
      return tx.inventarioEstoque.findFirstOrThrow({
        where: { id, empresaId },
        include: this.includeInventario,
      });
    });
  }

  private async criarSaldoInventario(
    tx: Prisma.TransactionClient,
    empresaId: string,
    depositoId: string,
    produtoId: string,
  ) {
    try {
      return await tx.estoqueProduto.create({
        data: {
          empresaId,
          depositoId,
          produtoId,
          quantidadeAtual: new Prisma.Decimal(0),
          estoqueMinimo: new Prisma.Decimal(0),
          custoMedio: new Prisma.Decimal(0),
          ultimoCusto: new Prisma.Decimal(0),
        },
      });
    } catch (error) {
      tratarP2002Estoque(error);
    }
  }

  async finalizar(empresaId: string, id: string, usuario: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      const inventario = await this.buscarInventarioMutacao(tx, empresaId, id);
      if (inventario.status === StatusInventarioEstoque.FINALIZADO) {
        throw new BadRequestException('Inventário já foi finalizado');
      }
      if (inventario.status === StatusInventarioEstoque.CANCELADO) {
        throw new BadRequestException(
          'Inventário cancelado não pode ser finalizado',
        );
      }
      const itensPendentes = inventario.itens.filter(
        (item) =>
          item.status === StatusItemInventario.PENDENTE ||
          item.quantidadeContada === null,
      );
      if (itensPendentes.length) {
        throw new BadRequestException(
          `Existem ${itensPendentes.length} item(ns) ainda não contado(s)`,
        );
      }
      await this.validarDeposito(tx, empresaId, inventario.depositoId);
      await this.validarProdutos(
        tx,
        empresaId,
        inventario.itens.map((item) => item.produtoId),
      );
      const itens = [...inventario.itens].sort((a, b) =>
        chaveLockEstoque(
          empresaId,
          a.produtoId,
          inventario.depositoId,
        ).localeCompare(
          chaveLockEstoque(empresaId, b.produtoId, inventario.depositoId),
        ),
      );
      await bloquearEstoques(
        tx,
        empresaId,
        itens.map((item) =>
          chaveLockEstoque(empresaId, item.produtoId, inventario.depositoId),
        ),
      );
      for (const item of itens) {
        const quantidadeContada = new Prisma.Decimal(item.quantidadeContada!);
        let estoque = await tx.estoqueProduto.findUnique({
          where: {
            empresaId_produtoId_depositoId: {
              empresaId,
              produtoId: item.produtoId,
              depositoId: inventario.depositoId,
            },
          },
        });
        if (!estoque && quantidadeContada.eq(0)) continue;
        if (!estoque) {
          estoque = await this.criarSaldoInventario(
            tx,
            empresaId,
            inventario.depositoId,
            item.produtoId,
          );
        }
        const saldoAnterior = new Prisma.Decimal(estoque.quantidadeAtual);
        if (saldoAnterior.eq(quantidadeContada)) continue;
        const alteracao = await tx.estoqueProduto.updateMany({
          where: { id: estoque.id, empresaId },
          data: { quantidadeAtual: quantidadeContada },
        });
        if (alteracao.count !== 1) {
          throw new BadRequestException('O saldo de estoque já foi alterado');
        }
        await tx.movimentacaoEstoque.create({
          data: {
            tipo: TipoMovimentacaoEstoque.INVENTARIO,
            quantidade: quantidadeContada.minus(saldoAnterior).abs(),
            saldoAnterior,
            saldoPosterior: quantidadeContada,
            observacao:
              item.observacao ||
              `Ajuste pelo inventário nº ${inventario.numero}`,
            documentoReferencia: `INVENTARIO-${inventario.numero}`,
            empresaId,
            produtoId: item.produtoId,
            depositoId: inventario.depositoId,
            usuarioId: usuario.id,
          },
        });
      }
      const transicao = await tx.inventarioEstoque.updateMany({
        where: { id, empresaId, status: inventario.status },
        data: {
          status: StatusInventarioEstoque.FINALIZADO,
          dataConclusao: new Date(),
          usuarioConclusaoId: usuario.id,
        },
      });
      if (transicao.count !== 1) {
        throw new BadRequestException(
          'O inventário já foi alterado e não pode ser finalizado',
        );
      }
      return tx.inventarioEstoque.findFirstOrThrow({
        where: { id, empresaId },
        include: this.includeInventario,
      });
    });
  }
}
