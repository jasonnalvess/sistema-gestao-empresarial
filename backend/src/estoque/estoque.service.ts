import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriarEstoqueProdutoDto } from './dto/criar-estoque-produto.dto';
import { AtualizarEstoqueProdutoDto } from './dto/atualizar-estoque-produto.dto';
import { FiltroEstoqueDto } from './dto/filtro-estoque.dto';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';

@Injectable()
export class EstoqueService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(dados: CriarEstoqueProdutoDto, usuarioLogado: any) {
    const produto = await this.prisma.produto.findUnique({
      where: { id: dados.produtoId },
    });

    if (!produto) {
      throw new NotFoundException('Produto não encontrado');
    }

    if (produto.empresaId !== usuarioLogado.empresaId) {
      throw new ForbiddenException('Produto pertence a outra empresa');
    }

    const deposito = await this.prisma.deposito.findUnique({
      where: {
        id: dados.depositoId,
      },
    });

    if (!deposito) {
      throw new NotFoundException('Depósito não encontrado');
    }

    if (deposito.empresaId !== usuarioLogado.empresaId) {
      throw new ForbiddenException('Depósito pertence a outra empresa');
    }

    if (!deposito.ativo) {
      throw new BadRequestException(
        'Não é possível utilizar um depósito inativo',
      );
    }

    return this.prisma.estoqueProduto.create({
      data: {
        produtoId: dados.produtoId,
        depositoId: dados.depositoId,
        empresaId: usuarioLogado.empresaId,
        quantidadeAtual: dados.quantidadeAtual ?? 0,
        estoqueMinimo: dados.estoqueMinimo ?? 0,
        estoqueMaximo: dados.estoqueMaximo,
      },
      include: {
        produto: true,
        deposito: true,
      },
    });
  }

  async listar(usuarioLogado: any, filtros: FiltroEstoqueDto) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 10;

    const { skip, take } = calcularPaginacao(page, limit);

    const where: any = {
      empresaId: usuarioLogado.empresaId,
    };

    if (filtros.produtoId) {
      where.produtoId = filtros.produtoId;
    }

    if (filtros.depositoId) {
      where.depositoId = filtros.depositoId;
    }

    if (filtros.search) {
      where.produto = {
        OR: [
          { nome: { contains: filtros.search, mode: 'insensitive' } },
          { codigo: { contains: filtros.search, mode: 'insensitive' } },
        ],
      };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.estoqueProduto.findMany({
        where,
        include: {
          produto: true,
          deposito: true,
        },
        orderBy: {
          [filtros.sortBy ?? 'createdAt']: filtros.order ?? 'desc',
        },
        skip,
        take,
      }),
      this.prisma.estoqueProduto.count({
        where,
      }),
    ]);

    return respostaPaginada(data, total, page, limit);
  }

  async buscarPorId(id: string, usuarioLogado: any) {
    const estoque = await this.prisma.estoqueProduto.findUnique({
      where: { id },
      include: {
        produto: true,
        deposito: true,
      },
    });

    if (!estoque) {
      throw new NotFoundException('Estoque do produto não encontrado');
    }

    if (estoque.empresaId !== usuarioLogado.empresaId) {
      throw new ForbiddenException('Acesso negado a estoque de outra empresa');
    }

    return estoque;
  }

  async buscarPorProdutoDeposito(
    produtoId: string,
    depositoId: string,
    usuarioLogado: any,
  ) {
    const estoque = await this.prisma.estoqueProduto.findFirst({
      where: {
        produtoId,
        depositoId,
        empresaId: usuarioLogado.empresaId,
      },
      include: {
        produto: true,
        deposito: true,
      },
    });

    return estoque;
  }

  async atualizar(id: string, dados: AtualizarEstoqueProdutoDto, usuarioLogado: any) {
    await this.buscarPorId(id, usuarioLogado);

    return this.prisma.estoqueProduto.update({
      where: { id },
      data: dados,
      include: {
        produto: true,
        deposito: true,
      },
    });
  }
}
