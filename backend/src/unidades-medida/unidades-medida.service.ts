import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { obterEmpresaId } from '../common/utils/obter-empresa-id';
import { CriarUnidadeMedidaDto } from './dto/criar-unidade-medida.dto';
import { AtualizarUnidadeMedidaDto } from './dto/atualizar-unidade-medida.dto';
import { PaginacaoDto } from '../common/dto/paginacao.dto';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';

@Injectable()
export class UnidadesMedidaService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(dados: CriarUnidadeMedidaDto, usuarioLogado: AuthenticatedUser) {
    return this.prisma.unidadeMedida.create({
      data: {
        nome: dados.nome,
        sigla: dados.sigla.toUpperCase(),
        empresaId: obterEmpresaId(usuarioLogado),
      },
    });
  }

  async listar(usuarioLogado: AuthenticatedUser, paginacao: PaginacaoDto) {
    const page = paginacao.page ?? 1;
    const limit = paginacao.limit ?? 10;
    const { skip, take } = calcularPaginacao(page, limit);

    const where: Prisma.UnidadeMedidaWhereInput =
      usuarioLogado.tipo === 'SUPER_ADMIN'
        ? {}
        : { empresaId: obterEmpresaId(usuarioLogado) };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.unidadeMedida.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.unidadeMedida.count({ where }),
    ]);

    return respostaPaginada(data, total, page, limit);
  }

  async buscarPorId(id: string, usuarioLogado: AuthenticatedUser) {
    const unidade = await this.prisma.unidadeMedida.findUnique({
      where: { id },
    });

    if (!unidade) {
      throw new NotFoundException('Unidade de medida não encontrada');
    }

    if (
      usuarioLogado.tipo !== 'SUPER_ADMIN' &&
      unidade.empresaId !== obterEmpresaId(usuarioLogado)
    ) {
      throw new ForbiddenException('Acesso negado a unidade de outra empresa');
    }

    return unidade;
  }

  async atualizar(
    id: string,
    dados: AtualizarUnidadeMedidaDto,
    usuarioLogado: AuthenticatedUser,
  ) {
    await this.buscarPorId(id, usuarioLogado);

    return this.prisma.unidadeMedida.update({
      where: { id },
      data: {
        nome: dados.nome,
        sigla: dados.sigla ? dados.sigla.toUpperCase() : undefined,
      },
    });
  }

  async ativar(id: string, usuarioLogado: AuthenticatedUser) {
    await this.buscarPorId(id, usuarioLogado);

    return this.prisma.unidadeMedida.update({
      where: { id },
      data: { ativo: true },
    });
  }

  async desativar(id: string, usuarioLogado: AuthenticatedUser) {
    await this.buscarPorId(id, usuarioLogado);

    return this.prisma.unidadeMedida.update({
      where: { id },
      data: { ativo: false },
    });
  }
}
