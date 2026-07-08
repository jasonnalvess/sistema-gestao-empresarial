import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FiltroAuditoriaDto } from './dto/filtro-auditoria.dto';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';

@Injectable()
export class AuditoriaService {
  constructor(private readonly prisma: PrismaService) {}

  registrar(dados: {
    acao: string;
    entidade: string;
    entidadeId?: string;
    dadosAntigos?: any;
    dadosNovos?: any;
    empresaId?: string;
    usuarioId?: string;
    ip?: string;
  }) {
    return this.prisma.auditoriaLog.create({
      data: {
        acao: dados.acao,
        entidade: dados.entidade,
        entidadeId: dados.entidadeId,
        dadosAntigos: dados.dadosAntigos,
        dadosNovos: dados.dadosNovos,
        empresaId: dados.empresaId,
        usuarioId: dados.usuarioId,
        ip: dados.ip,
      },
    });
  }

  async listar(usuarioLogado: any, filtros: FiltroAuditoriaDto) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 10;

    const { skip, take } = calcularPaginacao(page, limit);

    const where: any =
  usuarioLogado.tipo === 'SUPER_ADMIN'
    ? {}
    : { empresaId: usuarioLogado.empresaId };

    if (filtros.acao) {
      where.acao = filtros.acao;
    }

    if (filtros.entidade) {
      where.entidade = filtros.entidade;
    }

    if (filtros.usuarioId) {
      where.usuarioId = filtros.usuarioId;
    }

    if (filtros.entidadeId) {
      where.entidadeId = filtros.entidadeId;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditoriaLog.findMany({
        where,
        select: {
          id: true,
          acao: true,
          entidade: true,
          entidadeId: true,
          dadosAntigos: true,
          dadosNovos: true,
          ip: true,
          empresaId: true,
          usuarioId: true,
          createdAt: true,
          empresa: {
            select: {
              id: true,
              nome: true,
              cnpj: true,
              ativa: true,
            },
          },
          usuario: {
            select: {
              id: true,
              nome: true,
              email: true,
              tipo: true,
              ativo: true,
              empresaId: true,
            },
          },
        },
        orderBy: {
  [filtros.sortBy ?? 'createdAt']: filtros.order ?? 'desc',
},
        skip,
        take,
      }),
      this.prisma.auditoriaLog.count({
        where,
      }),
    ]);

    return respostaPaginada(data, total, page, limit);
  }
}
