import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CriarAgendaEventoDto } from './dto/criar-agenda-evento.dto';
import { CriarAgendaHistoricoDto } from './dto/criar-agenda-historico.dto';
import { AtualizarAgendaEventoDto } from './dto/atualizar-agenda-evento.dto';

type IntervaloAgenda = {
  dataInicio: Date;
  dataFim: Date;
};

type DadosConflito = IntervaloAgenda & {
  empresaId: string;
  usuarioId?: string | null;
  eventoId?: string;
};

export type UsuarioAgendaAutenticado = {
  id: string;
  empresaId?: string;
  tipo?: string;
};

@Injectable()
export class AgendaService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeEvento = {
    cliente: true,
  } satisfies Prisma.AgendaEventoInclude;

  private readonly includeHistorico = {
    usuario: {
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
      },
    },
  } satisfies Prisma.AgendaEventoHistoricoInclude;

  private obterEmpresaId(usuario: UsuarioAgendaAutenticado) {
    if (!usuario?.empresaId) {
      throw new ForbiddenException('Usuário sem empresa vinculada');
    }
    return usuario.empresaId;
  }

  private obterUsuarioId(usuario: UsuarioAgendaAutenticado) {
    return usuario.id;
  }

  private obterUsuarioIdObrigatorio(usuario: UsuarioAgendaAutenticado) {
    const usuarioId = this.obterUsuarioId(usuario);
    if (!usuarioId) {
      throw new ForbiddenException('Usuário autenticado sem identificador');
    }
    return usuarioId;
  }

  private converterData(valor: string | Date, campo: string) {
    const data =
      valor instanceof Date ? new Date(valor.getTime()) : new Date(valor);
    if (isNaN(data.getTime())) {
      throw new BadRequestException(`${campo} deve ser uma data válida`);
    }
    return data;
  }

  private validarIntervalo(
    dataInicio: string | Date,
    dataFim: string | Date,
  ): IntervaloAgenda {
    const inicio = this.converterData(dataInicio, 'dataInicio');
    const fim = this.converterData(dataFim, 'dataFim');
    if (fim.getTime() <= inicio.getTime()) {
      throw new BadRequestException(
        'dataFim deve ser estritamente posterior a dataInicio',
      );
    }
    return { dataInicio: inicio, dataFim: fim };
  }

  private async validarCliente(
    tx: Prisma.TransactionClient,
    empresaId: string,
    clienteId?: string | null,
  ) {
    if (!clienteId) return;
    const cliente = await tx.cliente.findFirst({
      where: { id: clienteId, empresaId },
    });
    if (!cliente) {
      throw new NotFoundException('Cliente não encontrado');
    }
    if (!cliente.ativo) {
      throw new BadRequestException(
        'Não é possível utilizar um cliente inativo',
      );
    }
  }

  private async validarResponsavel(
    tx: Prisma.TransactionClient,
    empresaId: string,
    usuarioId?: string | null,
  ) {
    if (!usuarioId) return;
    const responsavel = await tx.usuario.findFirst({
      where: { id: usuarioId, empresaId },
    });
    if (!responsavel) {
      throw new NotFoundException('Responsável não encontrado');
    }
    if (!responsavel.ativo) {
      throw new BadRequestException(
        'Não é possível atribuir um responsável inativo',
      );
    }
  }

  private async validarVinculoOrdensServico(
    tx: Prisma.TransactionClient,
    empresaId: string,
    eventoId: string,
    clienteId: string | null,
  ) {
    const ordemIncompativel = await tx.ordemServico.findFirst({
      where: {
        agendaEventoId: eventoId,
        empresaId,
        ...(clienteId === null ? {} : { clienteId: { not: clienteId } }),
      },
      select: { id: true },
    });
    if (ordemIncompativel) {
      throw new ConflictException(
        'O cliente do evento não pode divergir das ordens de serviço vinculadas',
      );
    }
  }

  private async adquirirLockDisponibilidade(
    tx: Prisma.TransactionClient,
    empresaId: string,
    usuarioId: string,
  ) {
    const chave = `agenda:${empresaId}:${usuarioId}`;
    await tx.$queryRaw`
      SELECT pg_advisory_xact_lock(hashtextextended(${chave}, 0))
    `;
  }

  private async adquirirLocksDisponibilidade(
    tx: Prisma.TransactionClient,
    empresaId: string,
    usuarioIds: Array<string | null | undefined>,
  ) {
    // Sem responsável não há recurso individual sobre o qual aplicar colisão.
    const ids = [
      ...new Set(usuarioIds.filter((id): id is string => Boolean(id))),
    ].sort();
    for (const usuarioId of ids) {
      await this.adquirirLockDisponibilidade(tx, empresaId, usuarioId);
    }
  }

  private async validarConflito(
    tx: Prisma.TransactionClient,
    dados: DadosConflito,
  ) {
    if (!dados.usuarioId) return;
    const conflito = await tx.agendaEvento.findFirst({
      where: {
        empresaId: dados.empresaId,
        usuarioId: dados.usuarioId,
        status: { not: 'CANCELADO' },
        dataInicio: { lt: dados.dataFim },
        dataFim: { gt: dados.dataInicio },
        ...(dados.eventoId ? { id: { not: dados.eventoId } } : {}),
      },
      select: { id: true },
    });
    if (conflito) {
      throw new ConflictException(
        'O responsável já possui um evento neste intervalo',
      );
    }
  }

  private async buscarEventoBloqueado(
    tx: Prisma.TransactionClient,
    empresaId: string,
    eventoId: string,
  ) {
    await tx.$queryRaw`
      SELECT "id"
      FROM "AgendaEvento"
      WHERE "id" = ${eventoId}
        AND "empresaId" = ${empresaId}
      FOR UPDATE
    `;
    const evento = await tx.agendaEvento.findFirst({
      where: { id: eventoId, empresaId },
      include: this.includeEvento,
    });
    if (!evento) {
      throw new NotFoundException('Evento não encontrado');
    }
    return evento;
  }

  async criar(
    dados: CriarAgendaEventoDto,
    usuarioLogado: UsuarioAgendaAutenticado,
  ) {
    const empresaId = this.obterEmpresaId(usuarioLogado);
    const usuarioId =
      dados.usuarioId ?? this.obterUsuarioIdObrigatorio(usuarioLogado);

    return this.prisma.$transaction(async (tx) => {
      const intervalo = this.validarIntervalo(dados.dataInicio, dados.dataFim);
      await this.validarCliente(tx, empresaId, dados.clienteId);
      await this.validarResponsavel(tx, empresaId, usuarioId);
      await this.adquirirLocksDisponibilidade(tx, empresaId, [usuarioId]);
      await this.validarConflito(tx, {
        empresaId,
        usuarioId,
        ...intervalo,
      });
      return tx.agendaEvento.create({
        data: {
          titulo: dados.titulo,
          descricao: dados.descricao,
          ...intervalo,
          local: dados.local,
          clienteNome: dados.clienteNome,
          clienteContato: dados.clienteContato,
          status: 'AGENDADO',
          empresaId,
          usuarioId,
          clienteId: dados.clienteId,
        },
      });
    });
  }

  async listar(usuarioLogado: UsuarioAgendaAutenticado) {
    const where: Prisma.AgendaEventoWhereInput =
      usuarioLogado.tipo === 'SUPER_ADMIN'
        ? {}
        : { empresaId: usuarioLogado.empresaId };

    return this.prisma.agendaEvento.findMany({
      where,
      orderBy: { dataInicio: 'asc' },
      include: this.includeEvento,
    });
  }

  async buscarPorId(id: string, usuarioLogado: UsuarioAgendaAutenticado) {
    const evento = await this.prisma.agendaEvento.findUnique({
      where: { id },
      include: this.includeEvento,
    });
    if (!evento) {
      throw new NotFoundException('Evento não encontrado');
    }
    if (
      usuarioLogado.tipo !== 'SUPER_ADMIN' &&
      evento.empresaId !== usuarioLogado.empresaId
    ) {
      throw new ForbiddenException('Acesso negado a evento de outra empresa');
    }
    return evento;
  }

  async atualizar(
    id: string,
    dados: AtualizarAgendaEventoDto,
    usuarioLogado: UsuarioAgendaAutenticado,
  ) {
    const empresaId = this.obterEmpresaId(usuarioLogado);
    return this.prisma.$transaction(async (tx) => {
      const atual = await this.buscarEventoBloqueado(tx, empresaId, id);
      const intervalo = this.validarIntervalo(
        dados.dataInicio ?? atual.dataInicio,
        dados.dataFim ?? atual.dataFim,
      );
      const clienteId =
        dados.clienteId === undefined ? atual.clienteId : dados.clienteId;
      const usuarioId =
        dados.usuarioId === undefined ? atual.usuarioId : dados.usuarioId;

      await this.validarCliente(tx, empresaId, clienteId);
      await this.validarResponsavel(tx, empresaId, usuarioId);
      if (
        dados.clienteId !== undefined &&
        dados.clienteId !== atual.clienteId
      ) {
        await this.validarVinculoOrdensServico(
          tx,
          empresaId,
          id,
          dados.clienteId,
        );
      }

      const disponibilidadeAlterada =
        dados.dataInicio !== undefined ||
        dados.dataFim !== undefined ||
        dados.usuarioId !== undefined;
      if (disponibilidadeAlterada) {
        await this.adquirirLocksDisponibilidade(tx, empresaId, [
          atual.usuarioId ?? undefined,
          usuarioId,
        ]);
        await this.validarConflito(tx, {
          empresaId,
          usuarioId,
          eventoId: id,
          ...intervalo,
        });
      }

      return tx.agendaEvento.update({
        where: { id },
        data: {
          titulo: dados.titulo,
          descricao: dados.descricao,
          dataInicio:
            dados.dataInicio === undefined ? undefined : intervalo.dataInicio,
          dataFim: dados.dataFim === undefined ? undefined : intervalo.dataFim,
          local: dados.local,
          clienteNome: dados.clienteNome,
          clienteContato: dados.clienteContato,
          clienteId: dados.clienteId,
          usuarioId: dados.usuarioId,
        },
      });
    });
  }

  async adicionarHistorico(
    agendaEventoId: string,
    dados: CriarAgendaHistoricoDto,
    usuarioLogado: UsuarioAgendaAutenticado,
  ) {
    const empresaId = this.obterEmpresaId(usuarioLogado);
    return this.prisma.$transaction(async (tx) => {
      await this.buscarEventoBloqueado(tx, empresaId, agendaEventoId);
      return tx.agendaEventoHistorico.create({
        data: {
          agendaEventoId,
          descricao: dados.descricao,
          usuarioId: this.obterUsuarioId(usuarioLogado),
        },
        include: this.includeHistorico,
      });
    });
  }

  async listarHistorico(
    agendaEventoId: string,
    usuarioLogado: UsuarioAgendaAutenticado,
  ) {
    await this.buscarPorId(agendaEventoId, usuarioLogado);
    return this.prisma.agendaEventoHistorico.findMany({
      where: { agendaEventoId },
      include: this.includeHistorico,
      orderBy: { createdAt: 'desc' },
    });
  }
}
