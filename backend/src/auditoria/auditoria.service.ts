import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CampoOrdenacaoAuditoria,
  FiltroAuditoriaDto,
} from './dto/filtro-auditoria.dto';
import { FiltroAuditoriaGlobalDto } from './dto/filtro-auditoria-global.dto';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditoriaService {
  constructor(private readonly prisma: PrismaService) {}

  registrar(dados: {
    acao: string;
    entidade: string;
    entidadeId?: string;
    dadosAntigos?: Prisma.InputJsonValue;
    dadosNovos?: Prisma.InputJsonValue;
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

  listarEmpresa(empresaId: string, filtros: FiltroAuditoriaDto) {
    return this.listar({ empresaId }, filtros);
  }

  listarGlobal(filtros: FiltroAuditoriaGlobalDto) {
    const where: Prisma.AuditoriaLogWhereInput = filtros.empresaId
      ? { empresaId: filtros.empresaId }
      : {};

    return this.listar(where, filtros);
  }

  private async listar(
    whereInicial: Prisma.AuditoriaLogWhereInput,
    filtros: FiltroAuditoriaDto,
  ) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 10;
    const { skip, take } = calcularPaginacao(page, limit);
    const where = this.criarWhere(whereInicial, filtros);
    const campoOrdenacao = this.obterCampoOrdenacao(filtros.sortBy);

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
            select: { id: true, nome: true, cnpj: true, ativa: true },
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
        orderBy: { [campoOrdenacao]: this.obterOrdem(filtros.order) },
        skip,
        take,
      }),
      this.prisma.auditoriaLog.count({ where }),
    ]);

    return respostaPaginada(data, total, page, limit);
  }

  private criarWhere(
    whereInicial: Prisma.AuditoriaLogWhereInput,
    filtros: FiltroAuditoriaDto,
  ): Prisma.AuditoriaLogWhereInput {
    const where: Prisma.AuditoriaLogWhereInput = { ...whereInicial };

    if (filtros.acao) where.acao = filtros.acao;
    if (filtros.entidade) where.entidade = filtros.entidade;
    if (filtros.usuarioId) where.usuarioId = filtros.usuarioId;
    if (filtros.entidadeId) where.entidadeId = filtros.entidadeId;

    const search = filtros.search?.trim();
    if (search) {
      where.OR = [
        { entidade: { contains: search, mode: 'insensitive' } },
        { entidadeId: { contains: search, mode: 'insensitive' } },
        { ip: { contains: search, mode: 'insensitive' } },
        {
          usuario: {
            is: {
              OR: [
                { nome: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        },
        {
          empresa: {
            is: {
              OR: [
                { nome: { contains: search, mode: 'insensitive' } },
                { cnpj: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }

    return where;
  }

  private obterOrdem(order: 'asc' | 'desc' | undefined): 'asc' | 'desc' {
    return order === 'asc' ? 'asc' : 'desc';
  }

  private obterCampoOrdenacao(
    sortBy: CampoOrdenacaoAuditoria | undefined,
  ): CampoOrdenacaoAuditoria {
    return sortBy === 'acao' || sortBy === 'entidade' ? sortBy : 'createdAt';
  }
}
