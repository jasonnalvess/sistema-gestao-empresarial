import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';
import { FiltroPermissoesDto } from './dto/filtro-permissoes.dto';

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
}
