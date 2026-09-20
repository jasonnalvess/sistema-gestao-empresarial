import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TipoEtapaCRM } from '@prisma/client';
import { prepararJsonAuditoria } from '../auditoria/auditoria-sanitizer';
import {
  AuditoriaAcao,
  AuditoriaEntidade,
} from '../common/enums/auditoria.enum';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';
import { PrismaService } from '../prisma/prisma.service';
import { AtualizarCrmEtapaDto } from './dto/atualizar-crm-etapa.dto';
import { CriarCrmEtapaDto } from './dto/criar-crm-etapa.dto';
import { FiltroCrmEtapasDto } from './dto/filtro-crm-etapas.dto';

type EstadoEtapa = {
  id: string;
  empresaId: string;
  nome: string;
  ordem: number;
  tipo: TipoEtapaCRM;
  ativo: boolean;
};

@Injectable()
export class CrmEtapasService {
  constructor(private readonly prisma: PrismaService) {}

  private estado(etapa: EstadoEtapa): EstadoEtapa {
    return {
      id: etapa.id,
      empresaId: etapa.empresaId,
      nome: etapa.nome,
      ordem: etapa.ordem,
      tipo: etapa.tipo,
      ativo: etapa.ativo,
    };
  }

  private async auditar(
    tx: Prisma.TransactionClient,
    empresaId: string,
    usuarioId: string,
    acao: AuditoriaAcao,
    etapa: EstadoEtapa,
    antes?: EstadoEtapa,
  ) {
    await tx.auditoriaLog.create({
      data: {
        empresaId,
        usuarioId,
        entidade: AuditoriaEntidade.CRM_ETAPA,
        entidadeId: etapa.id,
        acao,
        dadosAntigos: prepararJsonAuditoria(antes),
        dadosNovos: prepararJsonAuditoria(etapa),
      },
    });
  }

  async criar(empresaId: string, usuarioId: string, dados: CriarCrmEtapaDto) {
    return this.prisma.$transaction(async (tx) => {
      const criada = await tx.crmEtapa.create({
        data: {
          empresaId,
          nome: dados.nome,
          ordem: dados.ordem,
          tipo: dados.tipo,
          ativo: dados.ativo,
        },
      });
      await this.auditar(
        tx,
        empresaId,
        usuarioId,
        AuditoriaAcao.CRIAR_ETAPA_CRM,
        this.estado(criada),
      );
      return criada;
    });
  }

  async listar(empresaId: string, filtro: FiltroCrmEtapasDto) {
    const page = filtro.page ?? 1;
    const limit = filtro.limit ?? 10;
    const { skip, take } = calcularPaginacao(page, limit);
    const where: Prisma.CrmEtapaWhereInput = {
      empresaId,
      tipo: filtro.tipo,
      ...(filtro.ativo === undefined ? {} : { ativo: filtro.ativo }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.crmEtapa.findMany({
        where,
        orderBy: [{ ordem: 'asc' }, { id: 'asc' }],
        skip,
        take,
      }),
      this.prisma.crmEtapa.count({ where }),
    ]);
    return respostaPaginada(data, total, page, limit);
  }

  async buscarPorId(empresaId: string, id: string) {
    const etapa = await this.prisma.crmEtapa.findFirst({
      where: { id, empresaId },
    });
    if (!etapa) throw new NotFoundException('Etapa CRM não encontrada');
    return etapa;
  }

  async atualizar(
    empresaId: string,
    id: string,
    usuarioId: string,
    dados: AtualizarCrmEtapaDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const antes = await tx.crmEtapa.findFirst({
        where: { id, empresaId },
      });
      if (!antes) throw new NotFoundException('Etapa CRM não encontrada');
      const atualizada = await tx.crmEtapa.update({
        where: { empresaId_id: { empresaId, id } },
        data: {
          nome: dados.nome,
          ordem: dados.ordem,
          ativo: dados.ativo,
        },
      });
      await this.auditar(
        tx,
        empresaId,
        usuarioId,
        AuditoriaAcao.ATUALIZAR_ETAPA_CRM,
        this.estado(atualizada),
        this.estado(antes),
      );
      return atualizada;
    });
  }
}
