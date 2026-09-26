import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { calcularPaginacao } from '../common/utils/paginacao';
import { PaginatedResponse } from '../common/responses/paginated-response';
import { respostaPaginada } from '../common/utils/resposta-paginada';
import { FiltroPermissoesDto } from './dto/filtro-permissoes.dto';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PERMISSOES_EMPRESARIAIS_DELEGAVEIS } from '../perfis/permissoes-delegaveis';

@Injectable()
export class PermissoesService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(filtros: FiltroPermissoesDto) {
    const { page = 1, limit = 10, search, modulo, ativo } = filtros;
    const where: Prisma.PermissaoWhereInput = {
      modulo,
      ativo,
      ...(search
        ? {
            OR: [
              { nome: { contains: search, mode: 'insensitive' } },
              { chave: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.permissao.findMany({
        where,
        select: {
          id: true,
          chave: true,
          nome: true,
          descricao: true,
          modulo: true,
          ativo: true,
        },
        ...calcularPaginacao(page, limit),
        orderBy: { chave: 'asc' },
      }),
      this.prisma.permissao.count({ where }),
    ]);
    return respostaPaginada(data, total, page, limit);
  }

  async listarDelegaveis(ator: AuthenticatedUser) {
    const permissoesDoAtor = ator.permissoes ?? [];

    const chaves =
      ator.tipo === 'SUPER_ADMIN'
        ? [...PERMISSOES_EMPRESARIAIS_DELEGAVEIS]
        : PERMISSOES_EMPRESARIAIS_DELEGAVEIS.filter((chave) =>
            permissoesDoAtor.includes(chave),
          );

    if (chaves.length === 0) {
      return new PaginatedResponse([], {
        total: 0,
        page: 1,
        limit: 0,
        totalPages: 0,
      });
    }

    const permissoes = await this.prisma.permissao.findMany({
      where: {
        ativo: true,
        chave: {
          in: chaves,
        },
      },
      select: {
        id: true,
        chave: true,
        nome: true,
        descricao: true,
        modulo: true,
        ativo: true,
      },
      orderBy: {
        chave: 'asc',
      },
    });

    if (permissoes.length === 0) {
      return new PaginatedResponse([], {
        total: 0,
        page: 1,
        limit: 0,
        totalPages: 0,
      });
    }

    return respostaPaginada(
      permissoes,
      permissoes.length,
      1,
      permissoes.length,
    );
  }
}
