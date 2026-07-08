import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriarAgendaEventoDto } from './dto/criar-agenda-evento.dto';
import { CriarAgendaHistoricoDto } from './dto/criar-agenda-historico.dto';

@Injectable()
export class AgendaService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(dados: CriarAgendaEventoDto, usuarioLogado: any) {
    return this.prisma.agendaEvento.create({
      data: {
        titulo: dados.titulo,
        descricao: dados.descricao,
        dataInicio: new Date(dados.dataInicio),
        dataFim: new Date(dados.dataFim),
        local: dados.local,
        clienteNome: dados.clienteNome,
        clienteContato: dados.clienteContato,
        status: dados.status || 'AGENDADO',
        empresaId: usuarioLogado.empresaId,
        usuarioId: usuarioLogado.id ?? usuarioLogado.sub,
        clienteId: dados.clienteId,
      },
    });
  }

  async listar(usuarioLogado: any) {
    const where: any =
      usuarioLogado.tipo === 'SUPER_ADMIN'
        ? {}
        : { empresaId: usuarioLogado.empresaId };

    return this.prisma.agendaEvento.findMany({
      where,
      orderBy: {
        dataInicio: 'asc',
      },
      include: {
        cliente: true,
      },
    });
  }

  async buscarPorId(id: string, usuarioLogado: any) {
    const evento = await this.prisma.agendaEvento.findUnique({
      where: { id },
      include: {
        cliente: true,
      },
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

  async atualizar(id: string, dados: Partial<CriarAgendaEventoDto>, usuarioLogado: any) {
    await this.buscarPorId(id, usuarioLogado);

    return this.prisma.agendaEvento.update({
      where: { id },
      data: {
        titulo: dados.titulo,
        descricao: dados.descricao,
        dataInicio: dados.dataInicio ? new Date(dados.dataInicio) : undefined,
        dataFim: dados.dataFim ? new Date(dados.dataFim) : undefined,
        local: dados.local,
        clienteNome: dados.clienteNome,
        clienteContato: dados.clienteContato,
        status: dados.status,
        clienteId: dados.clienteId,
      },
    });
  }

  async adicionarHistorico(
    agendaEventoId: string,
    dados: CriarAgendaHistoricoDto,
    usuarioLogado: any,
  ) {
    await this.buscarPorId(agendaEventoId, usuarioLogado);

    return this.prisma.agendaEventoHistorico.create({
      data: {
        agendaEventoId,
        descricao: dados.descricao,
        usuarioId: usuarioLogado.id ?? usuarioLogado.sub,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            tipo: true,
          },
        },
      },
    });
  }

  async listarHistorico(agendaEventoId: string, usuarioLogado: any) {
    await this.buscarPorId(agendaEventoId, usuarioLogado);

    return this.prisma.agendaEventoHistorico.findMany({
      where: {
        agendaEventoId,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            tipo: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
