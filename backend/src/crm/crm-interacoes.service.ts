import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TipoInteracaoCRM } from '@prisma/client';
import { prepararJsonAuditoria } from '../auditoria/auditoria-sanitizer';
import {
  AuditoriaAcao,
  AuditoriaEntidade,
} from '../common/enums/auditoria.enum';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';
import { PrismaService } from '../prisma/prisma.service';
import { AtualizarClienteInteracaoDto } from './dto/atualizar-cliente-interacao.dto';
import { CriarClienteInteracaoDto } from './dto/criar-cliente-interacao.dto';
import { FiltroClienteInteracoesDto } from './dto/filtro-cliente-interacoes.dto';

@Injectable()
export class CrmInteracoesService {
  constructor(private readonly prisma: PrismaService) {}
  private readonly include = {
    cliente: true,
    oportunidade: true,
    responsavel: { select: { id: true, nome: true, email: true, tipo: true } },
    agendaEvento: true,
  } satisfies Prisma.ClienteInteracaoInclude;
  private dataHora(valor: string | Date) {
    const data = new Date(valor);
    if (Number.isNaN(data.getTime()))
      throw new BadRequestException('dataHora deve ser uma data válida');
    return data;
  }
  private estado(interacao: {
    id: string;
    empresaId: string;
    clienteId: string;
    oportunidadeId: string | null;
    agendaEventoId: string | null;
    responsavelId: string;
    tipo: TipoInteracaoCRM;
    assunto: string | null;
    descricao: string;
    dataHora: Date;
    versaoRegistro: number;
  }) {
    return {
      id: interacao.id,
      empresaId: interacao.empresaId,
      clienteId: interacao.clienteId,
      oportunidadeId: interacao.oportunidadeId,
      agendaEventoId: interacao.agendaEventoId,
      responsavelId: interacao.responsavelId,
      tipo: interacao.tipo,
      assunto: interacao.assunto,
      descricao: interacao.descricao,
      dataHora: interacao.dataHora,
      versaoRegistro: interacao.versaoRegistro,
    };
  }
  private async validar(
    tx: Prisma.TransactionClient,
    empresaId: string,
    dados: {
      clienteId: string;
      oportunidadeId: string | null;
      agendaEventoId: string | null;
      responsavelId: string;
    },
  ) {
    const cliente = await tx.cliente.findFirst({
      where: { id: dados.clienteId, empresaId },
      select: { id: true, ativo: true },
    });
    if (!cliente) throw new NotFoundException('Cliente não encontrado');
    if (!cliente.ativo)
      throw new BadRequestException(
        'Não é possível utilizar um cliente inativo',
      );
    const responsavel = await tx.usuario.findFirst({
      where: {
        id: dados.responsavelId,
        empresaId,
        ativo: true,
        tipo: { in: ['ADMIN_EMPRESA', 'USUARIO_EMPRESA'] },
      },
      select: { id: true },
    });
    if (!responsavel)
      throw new BadRequestException('Responsável CRM inválido ou inativo');
    if (dados.oportunidadeId) {
      const oportunidade = await tx.crmOportunidade.findFirst({
        where: {
          id: dados.oportunidadeId,
          empresaId,
          clienteId: dados.clienteId,
        },
        select: { id: true },
      });
      if (!oportunidade)
        throw new NotFoundException(
          'Oportunidade não encontrada para este cliente',
        );
    }
    if (dados.agendaEventoId) {
      const evento = await tx.agendaEvento.findFirst({
        where: { id: dados.agendaEventoId, empresaId },
        select: { id: true, clienteId: true },
      });
      if (!evento)
        throw new NotFoundException('Evento da agenda não encontrado');
      if (!evento.clienteId || evento.clienteId !== dados.clienteId)
        throw new ConflictException(
          'O cliente do evento deve ser o mesmo da interação',
        );
    }
  }
  private async auditar(
    tx: Prisma.TransactionClient,
    empresaId: string,
    usuarioId: string,
    acao: AuditoriaAcao,
    interacao: ReturnType<CrmInteracoesService['estado']>,
    antes?: ReturnType<CrmInteracoesService['estado']>,
  ) {
    await tx.auditoriaLog.create({
      data: {
        empresaId,
        usuarioId,
        entidade: AuditoriaEntidade.CLIENTE_INTERACAO_CRM,
        entidadeId: interacao.id,
        acao,
        dadosAntigos: prepararJsonAuditoria(antes),
        dadosNovos: prepararJsonAuditoria(interacao),
      },
    });
  }
  async criar(
    empresaId: string,
    usuarioId: string,
    dados: CriarClienteInteracaoDto,
  ) {
    if (!usuarioId)
      throw new ForbiddenException('Usuário autenticado sem identificador');
    return this.prisma.$transaction(async (tx) => {
      await this.validar(tx, empresaId, {
        clienteId: dados.clienteId,
        oportunidadeId: dados.oportunidadeId ?? null,
        agendaEventoId: dados.agendaEventoId ?? null,
        responsavelId: dados.responsavelId,
      });
      const criada = await tx.clienteInteracao.create({
        data: {
          empresaId,
          clienteId: dados.clienteId,
          oportunidadeId: dados.oportunidadeId,
          agendaEventoId: dados.agendaEventoId,
          responsavelId: dados.responsavelId,
          tipo: dados.tipo,
          assunto: dados.assunto,
          descricao: dados.descricao,
          dataHora: this.dataHora(dados.dataHora),
        },
      });
      await this.auditar(
        tx,
        empresaId,
        usuarioId,
        AuditoriaAcao.CRIAR_INTERACAO_CRM,
        this.estado(criada),
      );
      return tx.clienteInteracao.findFirstOrThrow({
        where: { id: criada.id, empresaId },
        include: this.include,
      });
    });
  }
  async listar(empresaId: string, filtro: FiltroClienteInteracoesDto) {
    const page = filtro.page ?? 1,
      limit = filtro.limit ?? 10,
      { skip, take } = calcularPaginacao(page, limit);
    const where: Prisma.ClienteInteracaoWhereInput = {
      empresaId,
      clienteId: filtro.clienteId,
      oportunidadeId: filtro.oportunidadeId,
      agendaEventoId: filtro.agendaEventoId,
      responsavelId: filtro.responsavelId,
      tipo: filtro.tipo,
    };
    if (filtro.dataInicial || filtro.dataFinal)
      where.dataHora = {
        ...(filtro.dataInicial
          ? { gte: this.dataHora(filtro.dataInicial) }
          : {}),
        ...(filtro.dataFinal ? { lte: this.dataHora(filtro.dataFinal) } : {}),
      };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.clienteInteracao.findMany({
        where,
        include: this.include,
        orderBy: [{ dataHora: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
      this.prisma.clienteInteracao.count({ where }),
    ]);
    return respostaPaginada(data, total, page, limit);
  }
  async buscarPorId(empresaId: string, id: string) {
    const item = await this.prisma.clienteInteracao.findFirst({
      where: { id, empresaId },
      include: this.include,
    });
    if (!item) throw new NotFoundException('Interação não encontrada');
    return item;
  }
  async atualizar(
    empresaId: string,
    id: string,
    usuarioId: string,
    dados: AtualizarClienteInteracaoDto,
  ) {
    if (!usuarioId)
      throw new ForbiddenException('Usuário autenticado sem identificador');
    return this.prisma.$transaction(async (tx) => {
      const antes = await tx.clienteInteracao.findFirst({
        where: { id, empresaId },
      });
      if (!antes) throw new NotFoundException('Interação não encontrada');
      if (antes.versaoRegistro !== dados.versaoRegistro)
        throw new ConflictException(
          'A interação foi alterada por outra operação. Recarregue e tente novamente.',
        );
      const efetivo = {
        clienteId:
          dados.clienteId === undefined ? antes.clienteId : dados.clienteId,
        oportunidadeId:
          dados.oportunidadeId === undefined
            ? antes.oportunidadeId
            : dados.oportunidadeId,
        agendaEventoId:
          dados.agendaEventoId === undefined
            ? antes.agendaEventoId
            : dados.agendaEventoId,
        responsavelId: dados.responsavelId ?? antes.responsavelId,
      };
      const clienteId = efetivo.clienteId;
      if (!clienteId) throw new BadRequestException('Cliente é obrigatório');
      await this.validar(tx, empresaId, { ...efetivo, clienteId });
      const alterada = await tx.clienteInteracao.updateMany({
        where: { id, empresaId, versaoRegistro: dados.versaoRegistro },
        data: {
          clienteId: dados.clienteId === undefined ? undefined : clienteId,
          oportunidadeId: dados.oportunidadeId,
          agendaEventoId: dados.agendaEventoId,
          responsavelId: dados.responsavelId,
          tipo: dados.tipo,
          assunto: dados.assunto,
          descricao: dados.descricao,
          dataHora: dados.dataHora ? this.dataHora(dados.dataHora) : undefined,
          versaoRegistro: { increment: 1 },
        },
      });
      if (alterada.count !== 1)
        throw new ConflictException(
          'A interação foi alterada por outra operação. Recarregue e tente novamente.',
        );
      const depois = await tx.clienteInteracao.findFirstOrThrow({
        where: { id, empresaId },
      });
      await this.auditar(
        tx,
        empresaId,
        usuarioId,
        AuditoriaAcao.ATUALIZAR_INTERACAO_CRM,
        this.estado(depois),
        this.estado(antes),
      );
      return tx.clienteInteracao.findFirstOrThrow({
        where: { id, empresaId },
        include: this.include,
      });
    });
  }
}
