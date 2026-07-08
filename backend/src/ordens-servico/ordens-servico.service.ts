import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriarOrdemServicoDto } from './dto/criar-ordem-servico.dto';
import { CriarOrdemServicoHistoricoDto } from './dto/criar-ordem-servico-historico.dto';
import { AlterarStatusOrdemServicoDto } from './dto/alterar-status-ordem-servico.dto';
import { FiltroOrdensServicoDto } from './dto/filtro-ordens-servico.dto';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';

@Injectable()
export class OrdensServicoService {
  constructor(private readonly prisma: PrismaService) {}

  async gerarNumero(empresaId: string) {
    const ultima = await this.prisma.ordemServico.findFirst({
      where: { empresaId },
      orderBy: { numero: 'desc' },
    });

    return ultima ? ultima.numero + 1 : 1;
  }

  async criar(dados: CriarOrdemServicoDto, usuarioLogado: any) {
    const empresaId = usuarioLogado.empresaId;
    const numero = await this.gerarNumero(empresaId);

    return this.prisma.ordemServico.create({
      data: {
        numero,
        titulo: dados.titulo,
        descricao: dados.descricao,
        clienteId: dados.clienteId,
        agendaEventoId: dados.agendaEventoId,
        responsavelId: dados.responsavelId,
        prioridade: dados.prioridade ?? 'NORMAL',
        dataPrevista: dados.dataPrevista
          ? new Date(dados.dataPrevista)
          : undefined,
        observacao: dados.observacao,
        empresaId,
      },
      include: {
        cliente: true,
        responsavel: {
          select: {
            id: true,
            nome: true,
            email: true,
            tipo: true,
          },
        },
        agendaEvento: true,
      },
    });
  }

  async listar(usuarioLogado: any, paginacao: FiltroOrdensServicoDto) {
    const page = paginacao.page ?? 1;
    const limit = paginacao.limit ?? 10;
    const { skip, take } = calcularPaginacao(page, limit);

    const where: any =
      usuarioLogado.tipo === 'SUPER_ADMIN'
        ? {}
        : { empresaId: usuarioLogado.empresaId };

    if (paginacao.search) {
      where.OR = [
        { titulo: { contains: paginacao.search, mode: 'insensitive' } },
        { descricao: { contains: paginacao.search, mode: 'insensitive' } },
        { observacao: { contains: paginacao.search, mode: 'insensitive' } },
        {
          cliente: {
            nome: { contains: paginacao.search, mode: 'insensitive' },
          },
        },
      ];
    }

    if (paginacao.status) {
      where.status = paginacao.status;
    }

    if (paginacao.prioridade) {
      where.prioridade = paginacao.prioridade;
    }

    if (paginacao.clienteId) {
      where.clienteId = paginacao.clienteId;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.ordemServico.findMany({
        where,
        include: {
          cliente: true,
          responsavel: {
            select: {
              id: true,
              nome: true,
              email: true,
              tipo: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.ordemServico.count({ where }),
    ]);

    return respostaPaginada(data, total, page, limit);
  }

  async buscarPorId(id: string, usuarioLogado: any) {
    const ordem = await this.prisma.ordemServico.findUnique({
      where: { id },
      include: {
        cliente: true,
        agendaEvento: true,
        responsavel: {
          select: {
            id: true,
            nome: true,
            email: true,
            tipo: true,
          },
        },
      },
    });

    if (!ordem) {
      throw new NotFoundException('Ordem de serviço não encontrada');
    }

    if (
      usuarioLogado.tipo !== 'SUPER_ADMIN' &&
      ordem.empresaId !== usuarioLogado.empresaId
    ) {
      throw new ForbiddenException('Acesso negado a ordem de outra empresa');
    }

    return ordem;
  }

  async adicionarHistorico(
    ordemServicoId: string,
    dados: CriarOrdemServicoHistoricoDto,
    usuarioLogado: any,
  ) {
    await this.buscarPorId(ordemServicoId, usuarioLogado);

    return this.prisma.ordemServicoHistorico.create({
      data: {
        ordemServicoId,
        descricao: dados.descricao,
        statusAnterior: dados.statusAnterior,
        statusNovo: dados.statusNovo,
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

  async listarHistorico(ordemServicoId: string, usuarioLogado: any) {
    await this.buscarPorId(ordemServicoId, usuarioLogado);

    return this.prisma.ordemServicoHistorico.findMany({
      where: {
        ordemServicoId,
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

  async alterarStatus(
    id: string,
    dados: AlterarStatusOrdemServicoDto,
    usuarioLogado: any,
  ) {
    const ordem = await this.buscarPorId(id, usuarioLogado);

    const statusAnterior = ordem.status;
    const statusNovo = dados.status;

    const ordemAtualizada = await this.prisma.ordemServico.update({
      where: { id },
      data: {
        status: statusNovo,
        dataConclusao: statusNovo === 'CONCLUIDA' ? new Date() : undefined,
      },
      include: {
        cliente: true,
        responsavel: {
          select: {
            id: true,
            nome: true,
            email: true,
            tipo: true,
          },
        },
        agendaEvento: true,
      },
    });

    await this.prisma.ordemServicoHistorico.create({
      data: {
        ordemServicoId: id,
        descricao:
          dados.descricao ||
          `Status alterado de ${statusAnterior} para ${statusNovo}.`,
        statusAnterior,
        statusNovo,
        usuarioId: usuarioLogado.id ?? usuarioLogado.sub,
      },
    });

    return ordemAtualizada;
  }
}
