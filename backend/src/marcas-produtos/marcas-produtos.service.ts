import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginacaoDto } from '../common/dto/paginacao.dto';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';
import { AtualizarMarcaProdutoDto } from './dto/atualizar-marca-produto.dto';
import { CriarMarcaProdutoDto } from './dto/criar-marca-produto.dto';

const ORDENACAO_PADRAO = {
  createdAt: 'desc',
} satisfies Prisma.MarcaProdutoOrderByWithRelationInput;

@Injectable()
export class MarcasProdutosService {
  constructor(private readonly prisma: PrismaService) {}

  private tratarP2002(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = error.meta?.target;
      const corresponde = Array.isArray(target)
        ? target.length === 2 &&
          target.includes('empresaId') &&
          target.includes('nome')
        : target === 'MarcaProduto_empresaId_nome_key';
      if (corresponde)
        throw new ConflictException(
          'Já existe uma marca com este nome nesta empresa.',
        );
    }
    throw error;
  }

  async criar(empresaId: string, dados: CriarMarcaProdutoDto) {
    try {
      return await this.prisma.marcaProduto.create({
        data: { nome: dados.nome, descricao: dados.descricao, empresaId },
      });
    } catch (error) {
      this.tratarP2002(error);
    }
  }

  async listar(empresaId: string, paginacao: PaginacaoDto) {
    const page = paginacao.page ?? 1;
    const limit = paginacao.limit ?? 10;
    const { skip, take } = calcularPaginacao(page, limit);
    const where: Prisma.MarcaProdutoWhereInput = { empresaId };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.marcaProduto.findMany({
        where,
        orderBy: ORDENACAO_PADRAO,
        skip,
        take,
      }),
      this.prisma.marcaProduto.count({ where }),
    ]);
    return respostaPaginada(data, total, page, limit);
  }

  async buscarPorId(empresaId: string, id: string) {
    const marca = await this.prisma.marcaProduto.findFirst({
      where: { id, empresaId },
    });
    if (!marca) throw new NotFoundException('Marca não encontrada');
    return marca;
  }

  async atualizar(
    empresaId: string,
    id: string,
    dados: AtualizarMarcaProdutoDto,
  ) {
    await this.buscarPorId(empresaId, id);
    try {
      return await this.prisma.marcaProduto.update({
        where: { id },
        data: { nome: dados.nome, descricao: dados.descricao },
      });
    } catch (error) {
      this.tratarP2002(error);
    }
  }

  async ativar(empresaId: string, id: string) {
    await this.buscarPorId(empresaId, id);
    return this.prisma.marcaProduto.update({
      where: { id },
      data: { ativo: true },
    });
  }

  async desativar(empresaId: string, id: string) {
    await this.buscarPorId(empresaId, id);
    return this.prisma.marcaProduto.update({
      where: { id },
      data: { ativo: false },
    });
  }
}
