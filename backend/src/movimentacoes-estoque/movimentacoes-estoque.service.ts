import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CriarMovimentacaoEstoqueDto } from './dto/criar-movimentacao-estoque.dto';
import { FiltroMovimentacoesEstoqueDto } from './dto/filtro-movimentacoes-estoque.dto';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';

@Injectable()
export class MovimentacoesEstoqueService {
  constructor(private prisma: PrismaService) {}

  async criar(dto: CriarMovimentacaoEstoqueDto, usuario: any) {
    const estoque = await this.prisma.estoqueProduto.findFirst({
      where: {
        produtoId: dto.produtoId,
      },
    });

    if (!estoque) {
      throw new NotFoundException('Estoque não encontrado');
    }

    if (estoque.empresaId !== usuario.empresaId) {
      throw new ForbiddenException();
    }

    let novaQuantidade = Number(estoque.quantidadeAtual);

    switch (dto.tipo) {
      case 'ENTRADA':
        novaQuantidade += dto.quantidade;
        break;

      case 'SAIDA':
        novaQuantidade -= dto.quantidade;

        if (novaQuantidade < 0) {
          throw new ForbiddenException(
            'Estoque insuficiente',
          );
        }

        break;

      case 'AJUSTE':
        novaQuantidade = dto.quantidade;
        break;

      case 'INVENTARIO':
        novaQuantidade = dto.quantidade;
        break;
    }

    await this.prisma.estoqueProduto.update({
      where: {
        id: estoque.id,
      },
      data: {
        quantidadeAtual: novaQuantidade,
      },
    });

    return this.prisma.movimentacaoEstoque.create({
      data: {
        tipo: dto.tipo,
        quantidade: dto.quantidade,
        observacao: dto.observacao,
        empresaId: usuario.empresaId,
        produtoId: dto.produtoId,
        usuarioId: usuario.id,
      },
      include: {
        produto: true,
      },
    });
  }

  async listar(usuario: any, filtros: FiltroMovimentacoesEstoqueDto) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 10;

    const { skip, take } = calcularPaginacao(page, limit);

    const where: any = {
      empresaId: usuario.empresaId,
    };

    if (filtros.produtoId) {
      where.produtoId = filtros.produtoId;
    }

    if (filtros.tipo) {
      where.tipo = filtros.tipo;
    }

    if (filtros.search) {
      where.OR = [
        { observacao: { contains: filtros.search, mode: 'insensitive' } },
        {
          produto: {
            nome: { contains: filtros.search, mode: 'insensitive' },
          },
        },
        {
          produto: {
            codigo: { contains: filtros.search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.movimentacaoEstoque.findMany({
        where,
        include: {
          produto: true,
        },
        orderBy: {
  [filtros.sortBy ?? 'createdAt']: filtros.order ?? 'desc',
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
