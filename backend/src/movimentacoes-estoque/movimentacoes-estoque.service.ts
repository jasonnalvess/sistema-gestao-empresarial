import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CriarMovimentacaoEstoqueDto } from './dto/criar-movimentacao-estoque.dto';
import { CriarTransferenciaEstoqueDto } from './dto/criar-transferencia-estoque.dto';
import { FiltroMovimentacoesEstoqueDto } from './dto/filtro-movimentacoes-estoque.dto';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';

@Injectable()
export class MovimentacoesEstoqueService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(dto: CriarMovimentacaoEstoqueDto, usuario: any) {
    const produto = await this.prisma.produto.findUnique({
      where: {
        id: dto.produtoId,
      },
    });

    if (!produto) {
      throw new NotFoundException('Produto não encontrado');
    }

    if (produto.empresaId !== usuario.empresaId) {
      throw new ForbiddenException('Produto pertence a outra empresa');
    }

    if (!produto.ativo) {
      throw new BadRequestException(
        'Não é possível movimentar um produto inativo',
      );
    }

    const deposito = await this.prisma.deposito.findUnique({
      where: {
        id: dto.depositoId,
      },
    });

    if (!deposito) {
      throw new NotFoundException('Depósito não encontrado');
    }

    if (deposito.empresaId !== usuario.empresaId) {
      throw new ForbiddenException('Depósito pertence a outra empresa');
    }

    if (!deposito.ativo) {
      throw new BadRequestException(
        'Não é possível movimentar um depósito inativo',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      let estoque = await tx.estoqueProduto.findFirst({
        where: {
          empresaId: usuario.empresaId,
          produtoId: dto.produtoId,
          depositoId: dto.depositoId,
        },
      });

      if (!estoque) {
        if (dto.tipo === 'SAIDA') {
          throw new BadRequestException(
            'Não existe saldo disponível neste depósito',
          );
        }

        estoque = await tx.estoqueProduto.create({
          data: {
            empresaId: usuario.empresaId,
            produtoId: dto.produtoId,
            depositoId: dto.depositoId,
            quantidadeAtual: 0,
            estoqueMinimo: produto.estoqueMinimo,
            estoqueMaximo: produto.estoqueMaximo,
            custoMedio: 0,
            ultimoCusto: 0,
          },
        });
      }

      const saldoAnterior = Number(estoque.quantidadeAtual);
      let saldoPosterior = saldoAnterior;

      switch (dto.tipo) {
        case 'ENTRADA':
          saldoPosterior = saldoAnterior + dto.quantidade;
          break;

        case 'SAIDA':
          saldoPosterior = saldoAnterior - dto.quantidade;

          if (saldoPosterior < 0) {
            throw new BadRequestException(
              `Estoque insuficiente. Saldo disponível: ${saldoAnterior}`,
            );
          }

          break;

        case 'AJUSTE':
        case 'INVENTARIO':
          saldoPosterior = dto.quantidade;
          break;

        default:
          throw new BadRequestException(
            'Tipo de movimentação não suportado',
          );
      }

      let custoMedio = Number(estoque.custoMedio);
      let ultimoCusto = Number(estoque.ultimoCusto);

      if (
        dto.tipo === 'ENTRADA' &&
        dto.custoUnitario !== undefined
      ) {
        const valorEstoqueAnterior =
          saldoAnterior * Number(estoque.custoMedio);

        const valorEntrada =
          dto.quantidade * dto.custoUnitario;

        if (saldoPosterior > 0) {
          custoMedio =
            (valorEstoqueAnterior + valorEntrada) / saldoPosterior;
        }

        ultimoCusto = dto.custoUnitario;
      }

      const estoqueAtualizado = await tx.estoqueProduto.update({
        where: {
          id: estoque.id,
        },
        data: {
          quantidadeAtual: saldoPosterior,
          custoMedio,
          ultimoCusto,
        },
        include: {
          produto: true,
          deposito: true,
        },
      });

      const movimentacao = await tx.movimentacaoEstoque.create({
        data: {
          tipo: dto.tipo,
          quantidade: dto.quantidade,
          saldoAnterior,
          saldoPosterior,
          custoUnitario: dto.custoUnitario,
          documentoReferencia: dto.documentoReferencia,
          observacao: dto.observacao,
          empresaId: usuario.empresaId,
          produtoId: dto.produtoId,
          depositoId: dto.depositoId,
          usuarioId: usuario.id ?? usuario.sub,
        },
        include: {
          produto: true,
          deposito: true,
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

      return {
        movimentacao,
        estoque: estoqueAtualizado,
      };
    });
  }

  async transferir(
    dto: CriarTransferenciaEstoqueDto,
    usuario: any,
  ) {
    if (dto.depositoOrigemId === dto.depositoDestinoId) {
      throw new BadRequestException(
        'O depósito de origem deve ser diferente do depósito de destino',
      );
    }

    const produto = await this.prisma.produto.findUnique({
      where: {
        id: dto.produtoId,
      },
    });

    if (!produto) {
      throw new NotFoundException('Produto não encontrado');
    }

    if (produto.empresaId !== usuario.empresaId) {
      throw new ForbiddenException('Produto pertence a outra empresa');
    }

    if (!produto.ativo) {
      throw new BadRequestException(
        'Não é possível movimentar um produto inativo',
      );
    }

    const [depositoOrigem, depositoDestino] = await Promise.all([
      this.prisma.deposito.findUnique({
        where: {
          id: dto.depositoOrigemId,
        },
      }),
      this.prisma.deposito.findUnique({
        where: {
          id: dto.depositoDestinoId,
        },
      }),
    ]);

    if (!depositoOrigem) {
      throw new NotFoundException('Depósito de origem não encontrado');
    }

    if (!depositoDestino) {
      throw new NotFoundException('Depósito de destino não encontrado');
    }

    if (
      depositoOrigem.empresaId !== usuario.empresaId ||
      depositoDestino.empresaId !== usuario.empresaId
    ) {
      throw new ForbiddenException(
        'Um dos depósitos pertence a outra empresa',
      );
    }

    if (!depositoOrigem.ativo || !depositoDestino.ativo) {
      throw new BadRequestException(
        'Não é possível transferir produtos utilizando depósito inativo',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const estoqueOrigem = await tx.estoqueProduto.findFirst({
        where: {
          empresaId: usuario.empresaId,
          produtoId: dto.produtoId,
          depositoId: dto.depositoOrigemId,
        },
      });

      if (!estoqueOrigem) {
        throw new BadRequestException(
          'Não existe estoque do produto no depósito de origem',
        );
      }

      const saldoOrigemAnterior = Number(
        estoqueOrigem.quantidadeAtual,
      );

      const saldoOrigemPosterior =
        saldoOrigemAnterior - dto.quantidade;

      if (saldoOrigemPosterior < 0) {
        throw new BadRequestException(
          `Estoque insuficiente no depósito de origem. Saldo disponível: ${saldoOrigemAnterior}`,
        );
      }

      let estoqueDestino = await tx.estoqueProduto.findFirst({
        where: {
          empresaId: usuario.empresaId,
          produtoId: dto.produtoId,
          depositoId: dto.depositoDestinoId,
        },
      });

      if (!estoqueDestino) {
        estoqueDestino = await tx.estoqueProduto.create({
          data: {
            empresaId: usuario.empresaId,
            produtoId: dto.produtoId,
            depositoId: dto.depositoDestinoId,
            quantidadeAtual: 0,
            estoqueMinimo: produto.estoqueMinimo,
            estoqueMaximo: produto.estoqueMaximo,
            custoMedio: estoqueOrigem.custoMedio,
            ultimoCusto: estoqueOrigem.ultimoCusto,
          },
        });
      }

      const saldoDestinoAnterior = Number(
        estoqueDestino.quantidadeAtual,
      );

      const saldoDestinoPosterior =
        saldoDestinoAnterior + dto.quantidade;

      const estoqueOrigemAtualizado =
        await tx.estoqueProduto.update({
          where: {
            id: estoqueOrigem.id,
          },
          data: {
            quantidadeAtual: saldoOrigemPosterior,
          },
          include: {
            produto: true,
            deposito: true,
          },
        });

      const estoqueDestinoAtualizado =
        await tx.estoqueProduto.update({
          where: {
            id: estoqueDestino.id,
          },
          data: {
            quantidadeAtual: saldoDestinoPosterior,
            custoMedio: estoqueOrigem.custoMedio,
            ultimoCusto: estoqueOrigem.ultimoCusto,
          },
          include: {
            produto: true,
            deposito: true,
          },
        });

      const observacao =
        dto.observacao ||
        `Transferência de ${depositoOrigem.nome} para ${depositoDestino.nome}`;

      const movimentacaoSaida =
        await tx.movimentacaoEstoque.create({
          data: {
            tipo: 'TRANSFERENCIA_SAIDA',
            quantidade: dto.quantidade,
            saldoAnterior: saldoOrigemAnterior,
            saldoPosterior: saldoOrigemPosterior,
            custoUnitario: estoqueOrigem.custoMedio,
            documentoReferencia: dto.documentoReferencia,
            observacao,
            empresaId: usuario.empresaId,
            produtoId: dto.produtoId,
            depositoId: dto.depositoOrigemId,
            usuarioId: usuario.id ?? usuario.sub,
          },
          include: {
            produto: true,
            deposito: true,
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

      const movimentacaoEntrada =
        await tx.movimentacaoEstoque.create({
          data: {
            tipo: 'TRANSFERENCIA_ENTRADA',
            quantidade: dto.quantidade,
            saldoAnterior: saldoDestinoAnterior,
            saldoPosterior: saldoDestinoPosterior,
            custoUnitario: estoqueOrigem.custoMedio,
            documentoReferencia: dto.documentoReferencia,
            observacao,
            empresaId: usuario.empresaId,
            produtoId: dto.produtoId,
            depositoId: dto.depositoDestinoId,
            usuarioId: usuario.id ?? usuario.sub,
          },
          include: {
            produto: true,
            deposito: true,
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

      return {
        movimentacaoSaida,
        movimentacaoEntrada,
        estoqueOrigem: estoqueOrigemAtualizado,
        estoqueDestino: estoqueDestinoAtualizado,
      };
    });
  }

  async listar(usuario: any, filtros: FiltroMovimentacoesEstoqueDto) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 10;

    const { skip, take } = calcularPaginacao(page, limit);

    const where: any =
      usuario.tipo === 'SUPER_ADMIN'
        ? {}
        : {
            empresaId: usuario.empresaId,
          };

    if (filtros.produtoId) {
      where.produtoId = filtros.produtoId;
    }

    if (filtros.depositoId) {
      where.depositoId = filtros.depositoId;
    }

    if (filtros.tipo) {
      where.tipo = filtros.tipo;
    }

    if (filtros.search) {
      where.OR = [
        {
          observacao: {
            contains: filtros.search,
            mode: 'insensitive',
          },
        },
        {
          documentoReferencia: {
            contains: filtros.search,
            mode: 'insensitive',
          },
        },
        {
          produto: {
            nome: {
              contains: filtros.search,
              mode: 'insensitive',
            },
          },
        },
        {
          produto: {
            codigo: {
              contains: filtros.search,
              mode: 'insensitive',
            },
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
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.movimentacaoEstoque.findMany({
        where,
        include: {
          produto: true,
          deposito: true,
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
          [filtros.sortBy ?? 'createdAt']:
            filtros.order ?? 'desc',
        },
        skip,
        take,
      }),

      this.prisma.movimentacaoEstoque.count({
        where,
      }),
    ]);

    return respostaPaginada(data, total, page, limit);
  }
}
