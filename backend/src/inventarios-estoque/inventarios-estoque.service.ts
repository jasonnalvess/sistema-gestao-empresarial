import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
import { obterEmpresaId } from '../common/utils/obter-empresa-id';
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
  };

  private async validarDeposito(
    tx: Prisma.TransactionClient,
    depositoId: string,
    usuario: AuthenticatedUser,
  ) {
    const deposito = await tx.deposito.findUnique({
      where: { id: depositoId },
    });
    if (!deposito) throw new NotFoundException('Depósito não encontrado');
    if (
      usuario.tipo !== 'SUPER_ADMIN' &&
      deposito.empresaId !== obterEmpresaId(usuario)
    ) {
      throw new ForbiddenException('Depósito pertence a outra empresa');
    }
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
    const chave = `inventario:${empresaId}:${depositoId}`;
    await tx.$queryRaw`
      SELECT pg_advisory_xact_lock(hashtextextended(${chave}, 0))
    `;
  }

  private async bloquearInventario(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw`
      SELECT "id"
      FROM "InventarioEstoque"
      WHERE "id" = ${id}
      FOR UPDATE
    `;
  }

  private async buscarInventarioMutacao(
    tx: Prisma.TransactionClient,
    id: string,
    usuario: AuthenticatedUser,
  ) {
    await this.bloquearInventario(tx, id);
    const inventario = await tx.inventarioEstoque.findUnique({
      where: { id },
      include: this.includeInventario,
    });
    if (!inventario) throw new NotFoundException('Inventário não encontrado');
    if (
      usuario.tipo !== 'SUPER_ADMIN' &&
      inventario.empresaId !== obterEmpresaId(usuario)
    ) {
      throw new ForbiddenException('Inventário pertence a outra empresa');
    }
    return inventario;
  }

  private isP2002Numero(error: unknown) {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== 'P2002'
    ) {
      return false;
    }
    const target = error.meta?.target;
    return Array.isArray(target)
      ? target.includes('empresaId') && target.includes('numero')
      : typeof target === 'string' &&
          target.includes('InventarioEstoque_empresaId_numero_key');
  }

  async criar(dados: CriarInventarioEstoqueDto, usuario: AuthenticatedUser) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const deposito = await this.validarDeposito(
          tx,
          dados.depositoId,
          usuario,
        );
        await this.bloquearCriacao(tx, deposito.empresaId, deposito.id);
        const inventarioAberto = await tx.inventarioEstoque.findFirst({
          where: {
            empresaId: deposito.empresaId,
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
          where: { empresaId: deposito.empresaId },
          orderBy: { numero: 'desc' },
          select: { numero: true },
        });
        const estoques = await tx.estoqueProduto.findMany({
          where: { empresaId: deposito.empresaId, depositoId: deposito.id },
        });
        return tx.inventarioEstoque.create({
          data: {
            numero: (ultimo?.numero ?? 0) + 1,
            descricao: dados.descricao,
            observacao: dados.observacao,
            status: StatusInventarioEstoque.ABERTO,
            empresaId: deposito.empresaId,
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
      });
    } catch (error) {
      if (this.isP2002Numero(error)) {
        throw new ConflictException(
          'Conflito ao gerar a numeração do inventário; repita a operação',
        );
      }
      throw error;
    }
  }

  async listar(
    usuario: AuthenticatedUser,
    filtros: FiltroInventariosEstoqueDto,
  ) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 10;
    const { skip, take } = calcularPaginacao(page, limit);
    const where: Prisma.InventarioEstoqueWhereInput =
      usuario.tipo === 'SUPER_ADMIN'
        ? {}
        : { empresaId: obterEmpresaId(usuario) };
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
        orderBy: { [filtros.sortBy ?? 'createdAt']: filtros.order ?? 'desc' },
        skip,
        take,
      }),
      this.prisma.inventarioEstoque.count({ where }),
    ]);
    return respostaPaginada(data, total, page, limit);
  }

  async buscarPorId(id: string, usuario: AuthenticatedUser) {
    const inventario = await this.prisma.inventarioEstoque.findUnique({
      where: { id },
      include: this.includeInventario,
    });
    if (!inventario) throw new NotFoundException('Inventário não encontrado');
    if (
      usuario.tipo !== 'SUPER_ADMIN' &&
      inventario.empresaId !== obterEmpresaId(usuario)
    ) {
      throw new ForbiddenException('Inventário pertence a outra empresa');
    }
    return inventario;
  }

  async atualizar(
    id: string,
    dados: AtualizarInventarioEstoqueDto,
    usuario: AuthenticatedUser,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const inventario = await this.buscarInventarioMutacao(tx, id, usuario);
      if (
        inventario.status === StatusInventarioEstoque.FINALIZADO ||
        inventario.status === StatusInventarioEstoque.CANCELADO
      ) {
        throw new BadRequestException(
          'Inventário finalizado ou cancelado não pode ser alterado',
        );
      }
      return tx.inventarioEstoque.update({
        where: { id },
        data: { descricao: dados.descricao, observacao: dados.observacao },
        include: this.includeInventario,
      });
    });
  }

  async contarItem(
    inventarioId: string,
    itemId: string,
    dados: ContarItemInventarioDto,
    usuario: AuthenticatedUser,
  ) {
    const quantidadeContada = new Prisma.Decimal(dados.quantidadeContada);
    return this.prisma.$transaction(async (tx) => {
      const inventario = await this.buscarInventarioMutacao(
        tx,
        inventarioId,
        usuario,
      );
      if (
        inventario.status === StatusInventarioEstoque.FINALIZADO ||
        inventario.status === StatusInventarioEstoque.CANCELADO
      ) {
        throw new BadRequestException(
          'Este inventário não aceita novas contagens',
        );
      }
      const item = inventario.itens.find((registro) => registro.id === itemId);
      if (!item)
        throw new NotFoundException('Item não encontrado neste inventário');
      const itemAtualizado = await tx.inventarioEstoqueItem.update({
        where: { id: itemId },
        data: {
          quantidadeContada,
          diferenca: quantidadeContada.minus(item.quantidadeSistema),
          observacao: dados.observacao,
          status: StatusItemInventario.CONTADO,
        },
        include: { produto: { include: { unidadeMedida: true } } },
      });
      if (inventario.status === StatusInventarioEstoque.ABERTO) {
        const transicao = await tx.inventarioEstoque.updateMany({
          where: {
            id: inventarioId,
            empresaId: inventario.empresaId,
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
      return itemAtualizado;
    });
  }

  async cancelar(id: string, usuario: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      const inventario = await this.buscarInventarioMutacao(tx, id, usuario);
      if (inventario.status === StatusInventarioEstoque.FINALIZADO) {
        throw new BadRequestException(
          'Inventário finalizado não pode ser cancelado',
        );
      }
      if (inventario.status === StatusInventarioEstoque.CANCELADO)
        return inventario;
      const transicao = await tx.inventarioEstoque.updateMany({
        where: {
          id,
          empresaId: inventario.empresaId,
          status: inventario.status,
        },
        data: { status: StatusInventarioEstoque.CANCELADO },
      });
      if (transicao.count !== 1) {
        throw new BadRequestException(
          'O inventário já foi alterado e não pode ser cancelado',
        );
      }
      return tx.inventarioEstoque.findUniqueOrThrow({
        where: { id },
        include: this.includeInventario,
      });
    });
  }

  async finalizar(id: string, usuario: AuthenticatedUser) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const inventario = await this.buscarInventarioMutacao(tx, id, usuario);
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
        const itens = [...inventario.itens].sort((a, b) =>
          chaveLockEstoque(
            inventario.empresaId,
            a.produtoId,
            inventario.depositoId,
          ).localeCompare(
            chaveLockEstoque(
              inventario.empresaId,
              b.produtoId,
              inventario.depositoId,
            ),
          ),
        );
        if (
          new Set(itens.map((item) => item.produtoId)).size !== itens.length
        ) {
          throw new BadRequestException(
            'O inventário possui produtos duplicados',
          );
        }
        await bloquearEstoques(
          tx,
          inventario.empresaId,
          itens.map((item) =>
            chaveLockEstoque(
              inventario.empresaId,
              item.produtoId,
              inventario.depositoId,
            ),
          ),
        );
        for (const item of itens) {
          const quantidadeContada = new Prisma.Decimal(item.quantidadeContada!);
          let estoque = await tx.estoqueProduto.findUnique({
            where: {
              empresaId_produtoId_depositoId: {
                empresaId: inventario.empresaId,
                produtoId: item.produtoId,
                depositoId: inventario.depositoId,
              },
            },
          });
          if (!estoque && quantidadeContada.eq(0)) continue;
          if (!estoque) {
            estoque = await tx.estoqueProduto.create({
              data: {
                empresaId: inventario.empresaId,
                depositoId: inventario.depositoId,
                produtoId: item.produtoId,
                quantidadeAtual: new Prisma.Decimal(0),
                estoqueMinimo: new Prisma.Decimal(0),
                custoMedio: new Prisma.Decimal(0),
                ultimoCusto: new Prisma.Decimal(0),
              },
            });
          }
          const saldoAnterior = new Prisma.Decimal(estoque.quantidadeAtual);
          if (saldoAnterior.eq(quantidadeContada)) continue;
          await tx.estoqueProduto.update({
            where: { id: estoque.id },
            data: { quantidadeAtual: quantidadeContada },
          });
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
              empresaId: inventario.empresaId,
              produtoId: item.produtoId,
              depositoId: inventario.depositoId,
              usuarioId: usuario.id,
            },
          });
        }
        const transicao = await tx.inventarioEstoque.updateMany({
          where: {
            id,
            empresaId: inventario.empresaId,
            status: inventario.status,
          },
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
        return tx.inventarioEstoque.findUniqueOrThrow({
          where: { id },
          include: this.includeInventario,
        });
      });
    } catch (error) {
      tratarP2002Estoque(error);
    }
  }
}
