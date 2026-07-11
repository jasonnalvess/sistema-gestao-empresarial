import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  StatusInventarioEstoque,
  StatusItemInventario,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';

import { CriarInventarioEstoqueDto } from './dto/criar-inventario-estoque.dto';
import { AtualizarInventarioEstoqueDto } from './dto/atualizar-inventario-estoque.dto';
import { ContarItemInventarioDto } from './dto/contar-item-inventario.dto';
import { FiltroInventariosEstoqueDto } from './dto/filtro-inventarios-estoque.dto';

@Injectable()
export class InventariosEstoqueService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeInventario = {
    deposito: true,
    usuarioAbertura: {
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
      },
    },
    usuarioConclusao: {
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
      },
    },
    itens: {
      include: {
        produto: {
          include: {
            unidadeMedida: true,
          },
        },
      },
      orderBy: {
        produto: {
          nome: 'asc' as const,
        },
      },
    },
  };

  private async validarDeposito(
    depositoId: string,
    usuario: any,
  ) {
    const deposito = await this.prisma.deposito.findUnique({
      where: {
        id: depositoId,
      },
    });

    if (!deposito) {
      throw new NotFoundException('Depósito não encontrado');
    }

    if (
      usuario.tipo !== 'SUPER_ADMIN' &&
      deposito.empresaId !== usuario.empresaId
    ) {
      throw new ForbiddenException(
        'Depósito pertence a outra empresa',
      );
    }

    if (!deposito.ativo) {
      throw new BadRequestException(
        'Não é possível abrir inventário em depósito inativo',
      );
    }

    return deposito;
  }

  async criar(
    dados: CriarInventarioEstoqueDto,
    usuario: any,
  ) {
    const deposito = await this.validarDeposito(
      dados.depositoId,
      usuario,
    );

    const inventarioAberto =
      await this.prisma.inventarioEstoque.findFirst({
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

    return this.prisma.$transaction(async (tx) => {
      const ultimoInventario =
        await tx.inventarioEstoque.findFirst({
          where: {
            empresaId: deposito.empresaId,
          },
          orderBy: {
            numero: 'desc',
          },
          select: {
            numero: true,
          },
        });

      const numero = (ultimoInventario?.numero ?? 0) + 1;

      const estoques = await tx.estoqueProduto.findMany({
        where: {
          empresaId: deposito.empresaId,
          depositoId: deposito.id,
        },
        include: {
          produto: true,
        },
      });

      const inventario = await tx.inventarioEstoque.create({
        data: {
          numero,
          descricao: dados.descricao,
          observacao: dados.observacao,
          status: StatusInventarioEstoque.ABERTO,
          empresaId: deposito.empresaId,
          depositoId: deposito.id,
          usuarioAberturaId: usuario.id ?? usuario.sub,
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

      return inventario;
    });
  }

  async listar(
    usuario: any,
    filtros: FiltroInventariosEstoqueDto,
  ) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 10;
    const { skip, take } = calcularPaginacao(page, limit);

    const where: any =
      usuario.tipo === 'SUPER_ADMIN'
        ? {}
        : {
            empresaId: usuario.empresaId,
          };

    if (filtros.status) {
      where.status = filtros.status;
    }

    if (filtros.depositoId) {
      where.depositoId = filtros.depositoId;
    }

    if (filtros.search) {
      const numero = Number(filtros.search);

      where.OR = [
        {
          descricao: {
            contains: filtros.search,
            mode: 'insensitive',
          },
        },
        {
          observacao: {
            contains: filtros.search,
            mode: 'insensitive',
          },
        },
        {
          deposito: {
            nome: {
              contains: filtros.search,
              mode: 'insensitive',
            },
          },
        },
      ];

      if (!Number.isNaN(numero)) {
        where.OR.push({
          numero,
        });
      }
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.inventarioEstoque.findMany({
        where,
        include: {
          deposito: true,
          usuarioAbertura: {
            select: {
              id: true,
              nome: true,
              email: true,
              tipo: true,
            },
          },
          usuarioConclusao: {
            select: {
              id: true,
              nome: true,
              email: true,
              tipo: true,
            },
          },
          _count: {
            select: {
              itens: true,
            },
          },
        },
        orderBy: {
          [filtros.sortBy ?? 'createdAt']:
            filtros.order ?? 'desc',
        },
        skip,
        take,
      }),
      this.prisma.inventarioEstoque.count({
        where,
      }),
    ]);

    return respostaPaginada(data, total, page, limit);
  }

  async buscarPorId(id: string, usuario: any) {
    const inventario =
      await this.prisma.inventarioEstoque.findUnique({
        where: {
          id,
        },
        include: this.includeInventario,
      });

    if (!inventario) {
      throw new NotFoundException('Inventário não encontrado');
    }

    if (
      usuario.tipo !== 'SUPER_ADMIN' &&
      inventario.empresaId !== usuario.empresaId
    ) {
      throw new ForbiddenException(
        'Inventário pertence a outra empresa',
      );
    }

    return inventario;
  }

  async atualizar(
    id: string,
    dados: AtualizarInventarioEstoqueDto,
    usuario: any,
  ) {
    const inventario = await this.buscarPorId(id, usuario);

    if (
      inventario.status === StatusInventarioEstoque.FINALIZADO ||
      inventario.status === StatusInventarioEstoque.CANCELADO
    ) {
      throw new BadRequestException(
        'Inventário finalizado ou cancelado não pode ser alterado',
      );
    }

    return this.prisma.inventarioEstoque.update({
      where: {
        id,
      },
      data: {
        descricao: dados.descricao,
        observacao: dados.observacao,
      },
      include: this.includeInventario,
    });
  }

  async contarItem(
    inventarioId: string,
    itemId: string,
    dados: ContarItemInventarioDto,
    usuario: any,
  ) {
    const inventario = await this.buscarPorId(
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

    const item = inventario.itens.find(
      (registro) => registro.id === itemId,
    );

    if (!item) {
      throw new NotFoundException(
        'Item não encontrado neste inventário',
      );
    }

    const quantidadeContada = dados.quantidadeContada;
    const diferenca =
      quantidadeContada - Number(item.quantidadeSistema);

    return this.prisma.$transaction(async (tx) => {
      const itemAtualizado =
        await tx.inventarioEstoqueItem.update({
          where: {
            id: itemId,
          },
          data: {
            quantidadeContada,
            diferenca,
            observacao: dados.observacao,
            status: StatusItemInventario.CONTADO,
          },
          include: {
            produto: {
              include: {
                unidadeMedida: true,
              },
            },
          },
        });

      if (
        inventario.status === StatusInventarioEstoque.ABERTO
      ) {
        await tx.inventarioEstoque.update({
          where: {
            id: inventarioId,
          },
          data: {
            status: StatusInventarioEstoque.EM_CONTAGEM,
          },
        });
      }

      return itemAtualizado;
    });
  }

  async cancelar(id: string, usuario: any) {
    const inventario = await this.buscarPorId(id, usuario);

    if (
      inventario.status === StatusInventarioEstoque.FINALIZADO
    ) {
      throw new BadRequestException(
        'Inventário finalizado não pode ser cancelado',
      );
    }

    if (
      inventario.status === StatusInventarioEstoque.CANCELADO
    ) {
      return inventario;
    }

    return this.prisma.inventarioEstoque.update({
      where: {
        id,
      },
      data: {
        status: StatusInventarioEstoque.CANCELADO,
      },
      include: this.includeInventario,
    });
  }

  async finalizar(id: string, usuario: any) {
    const inventario = await this.buscarPorId(id, usuario);

    if (
      inventario.status === StatusInventarioEstoque.FINALIZADO
    ) {
      throw new BadRequestException(
        'Inventário já foi finalizado',
      );
    }

    if (
      inventario.status === StatusInventarioEstoque.CANCELADO
    ) {
      throw new BadRequestException(
        'Inventário cancelado não pode ser finalizado',
      );
    }

    const itensPendentes = inventario.itens.filter(
      (item) =>
        item.status === StatusItemInventario.PENDENTE ||
        item.quantidadeContada === null,
    );

    if (itensPendentes.length > 0) {
      throw new BadRequestException(
        `Existem ${itensPendentes.length} item(ns) ainda não contado(s)`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of inventario.itens) {
        const quantidadeContada = Number(
          item.quantidadeContada,
        );

        let estoque = await tx.estoqueProduto.findFirst({
          where: {
            empresaId: inventario.empresaId,
            depositoId: inventario.depositoId,
            produtoId: item.produtoId,
          },
        });

        if (!estoque) {
          estoque = await tx.estoqueProduto.create({
            data: {
              empresaId: inventario.empresaId,
              depositoId: inventario.depositoId,
              produtoId: item.produtoId,
              quantidadeAtual: 0,
              estoqueMinimo: 0,
              custoMedio: 0,
              ultimoCusto: 0,
            },
          });
        }

        const saldoAnterior = Number(
          estoque.quantidadeAtual,
        );

        if (saldoAnterior === quantidadeContada) {
          continue;
        }

        await tx.estoqueProduto.update({
          where: {
            id: estoque.id,
          },
          data: {
            quantidadeAtual: quantidadeContada,
          },
        });

        await tx.movimentacaoEstoque.create({
          data: {
            tipo: 'INVENTARIO',
            quantidade: quantidadeContada,
            saldoAnterior,
            saldoPosterior: quantidadeContada,
            observacao:
              item.observacao ||
              `Ajuste pelo inventário nº ${inventario.numero}`,
            documentoReferencia: `INVENTARIO-${inventario.numero}`,
            empresaId: inventario.empresaId,
            produtoId: item.produtoId,
            depositoId: inventario.depositoId,
            usuarioId: usuario.id ?? usuario.sub,
          },
        });
      }

      return tx.inventarioEstoque.update({
        where: {
          id,
        },
        data: {
          status: StatusInventarioEstoque.FINALIZADO,
          dataConclusao: new Date(),
          usuarioConclusaoId: usuario.id ?? usuario.sub,
        },
        include: this.includeInventario,
      });
    });
  }
}