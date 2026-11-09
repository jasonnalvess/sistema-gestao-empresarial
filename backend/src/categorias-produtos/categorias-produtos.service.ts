import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';
import { AtualizarCategoriaProdutoDto } from './dto/atualizar-categoria-produto.dto';
import { CriarCategoriaProdutoDto } from './dto/criar-categoria-produto.dto';
import { FiltroCategoriasProdutosDto } from './dto/filtro-categorias-produtos.dto';

const CAMPOS_ORDENACAO = {
  nome: 'nome',
  descricao: 'descricao',
  ativo: 'ativo',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
} as const satisfies Record<
  string,
  keyof Prisma.CategoriaProdutoOrderByWithRelationInput
>;

function ehCampoOrdenacao(
  campo: string,
): campo is keyof typeof CAMPOS_ORDENACAO {
  return campo in CAMPOS_ORDENACAO;
}

@Injectable()
export class CategoriasProdutosService {
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
        : target === 'CategoriaProduto_empresaId_nome_key';
      if (corresponde) {
        throw new ConflictException(
          'Já existe uma categoria com este nome nesta empresa.',
        );
      }
    }
    throw error;
  }

  async criar(empresaId: string, dados: CriarCategoriaProdutoDto) {
    try {
      return await this.prisma.categoriaProduto.create({
        data: { nome: dados.nome, descricao: dados.descricao, empresaId },
      });
    } catch (error) {
      this.tratarP2002(error);
    }
  }

  async listar(empresaId: string, filtros: FiltroCategoriasProdutosDto) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 10;
    const { skip, take } = calcularPaginacao(page, limit);
    const where: Prisma.CategoriaProdutoWhereInput = { empresaId };
    if (filtros.search) {
      where.OR = [
        { nome: { contains: filtros.search, mode: 'insensitive' } },
        { descricao: { contains: filtros.search, mode: 'insensitive' } },
      ];
    }
    if (filtros.ativo !== undefined) where.ativo = filtros.ativo;
    const campo =
      filtros.sortBy && ehCampoOrdenacao(filtros.sortBy)
        ? CAMPOS_ORDENACAO[filtros.sortBy]
        : 'createdAt';
    const orderBy: Prisma.CategoriaProdutoOrderByWithRelationInput = {
      [campo]: filtros.order ?? 'desc',
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.categoriaProduto.findMany({ where, orderBy, skip, take }),
      this.prisma.categoriaProduto.count({ where }),
    ]);
    return respostaPaginada(data, total, page, limit);
  }

  async buscarPorId(empresaId: string, id: string) {
    const categoria = await this.prisma.categoriaProduto.findFirst({
      where: { id, empresaId },
    });
    if (!categoria) throw new NotFoundException('Categoria não encontrada');
    return categoria;
  }

  async atualizar(
    empresaId: string,
    id: string,
    dados: AtualizarCategoriaProdutoDto,
  ) {
    await this.buscarPorId(empresaId, id);
    try {
      return await this.prisma.categoriaProduto.update({
        where: { id },
        data: dados,
      });
    } catch (error) {
      this.tratarP2002(error);
    }
  }

  async ativar(empresaId: string, id: string) {
    await this.buscarPorId(empresaId, id);
    return this.prisma.categoriaProduto.update({
      where: { id },
      data: { ativo: true },
    });
  }

  async desativar(empresaId: string, id: string) {
    await this.buscarPorId(empresaId, id);
    return this.prisma.categoriaProduto.update({
      where: { id },
      data: { ativo: false },
    });
  }
}
