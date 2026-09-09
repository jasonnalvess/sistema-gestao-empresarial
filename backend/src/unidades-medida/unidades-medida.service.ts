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
import { AtualizarUnidadeMedidaDto } from './dto/atualizar-unidade-medida.dto';
import { CriarUnidadeMedidaDto } from './dto/criar-unidade-medida.dto';

const ORDENACAO_PADRAO = {
  createdAt: 'desc',
} satisfies Prisma.UnidadeMedidaOrderByWithRelationInput;

@Injectable()
export class UnidadesMedidaService {
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
          target.includes('sigla')
        : target === 'UnidadeMedida_empresaId_sigla_key';
      if (corresponde)
        throw new ConflictException(
          'Já existe uma unidade com esta sigla nesta empresa.',
        );
    }
    throw error;
  }

  async criar(empresaId: string, dados: CriarUnidadeMedidaDto) {
    try {
      return await this.prisma.unidadeMedida.create({
        data: { nome: dados.nome, sigla: dados.sigla.toUpperCase(), empresaId },
      });
    } catch (error) {
      this.tratarP2002(error);
    }
  }

  async listar(empresaId: string, paginacao: PaginacaoDto) {
    const page = paginacao.page ?? 1;
    const limit = paginacao.limit ?? 10;
    const { skip, take } = calcularPaginacao(page, limit);
    const where: Prisma.UnidadeMedidaWhereInput = { empresaId };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.unidadeMedida.findMany({
        where,
        orderBy: ORDENACAO_PADRAO,
        skip,
        take,
      }),
      this.prisma.unidadeMedida.count({ where }),
    ]);
    return respostaPaginada(data, total, page, limit);
  }

  async buscarPorId(empresaId: string, id: string) {
    const unidade = await this.prisma.unidadeMedida.findFirst({
      where: { id, empresaId },
    });
    if (!unidade)
      throw new NotFoundException('Unidade de medida não encontrada');
    return unidade;
  }

  async atualizar(
    empresaId: string,
    id: string,
    dados: AtualizarUnidadeMedidaDto,
  ) {
    await this.buscarPorId(empresaId, id);
    try {
      return await this.prisma.unidadeMedida.update({
        where: { id },
        data: { nome: dados.nome, sigla: dados.sigla?.toUpperCase() },
      });
    } catch (error) {
      this.tratarP2002(error);
    }
  }

  async ativar(empresaId: string, id: string) {
    await this.buscarPorId(empresaId, id);
    return this.prisma.unidadeMedida.update({
      where: { id },
      data: { ativo: true },
    });
  }

  async desativar(empresaId: string, id: string) {
    await this.buscarPorId(empresaId, id);
    return this.prisma.unidadeMedida.update({
      where: { id },
      data: { ativo: false },
    });
  }
}
