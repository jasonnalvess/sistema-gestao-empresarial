import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CriarOrdemServicoDto } from './dto/criar-ordem-servico.dto';
import { CriarOrdemServicoHistoricoDto } from './dto/criar-ordem-servico-historico.dto';
import { AlterarStatusOrdemServicoDto } from './dto/alterar-status-ordem-servico.dto';
import { FiltroOrdensServicoDto } from './dto/filtro-ordens-servico.dto';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';

const STATUS_PERMITIDOS: Record<string, readonly string[]> = {
  ABERTA: ['EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'],
  EM_ANDAMENTO: ['CONCLUIDA', 'CANCELADA'],
  CONCLUIDA: [],
  CANCELADA: [],
};

@Injectable()
export class OrdensServicoService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeOrdem = {
    cliente: true,
    responsavel: {
      select: { id: true, nome: true, email: true, tipo: true },
    },
    agendaEvento: true,
  } satisfies Prisma.OrdemServicoInclude;

  private readonly includeOrdemLista = {
    cliente: true,
    responsavel: {
      select: { id: true, nome: true, email: true, tipo: true },
    },
  } satisfies Prisma.OrdemServicoInclude;

  private readonly includeHistorico = {
    usuario: {
      select: { id: true, nome: true, email: true, tipo: true },
    },
  } satisfies Prisma.OrdemServicoHistoricoInclude;

  private async bloquearOrdem(
    tx: Prisma.TransactionClient,
    empresaId: string,
    ordemServicoId: string,
  ) {
    await tx.$queryRaw`
      SELECT "id"
      FROM "OrdemServico"
      WHERE "id" = ${ordemServicoId}
        AND "empresaId" = ${empresaId}
      FOR UPDATE
    `;
  }

  private async buscarOrdemBloqueada(
    tx: Prisma.TransactionClient,
    ordemServicoId: string,
    empresaId: string,
  ) {
    await this.bloquearOrdem(tx, empresaId, ordemServicoId);
    const ordem = await tx.ordemServico.findFirst({
      where: { id: ordemServicoId, empresaId },
      include: this.includeOrdem,
    });

    if (!ordem) throw new NotFoundException('Ordem de serviço não encontrada');
    return ordem;
  }

  private async validarCliente(
    tx: Prisma.TransactionClient,
    clienteId: string,
    empresaId: string,
  ) {
    const cliente = await tx.cliente.findFirst({
      where: { id: clienteId, empresaId },
    });
    if (!cliente) throw new NotFoundException('Cliente não encontrado');
    if (!cliente.ativo) {
      throw new BadRequestException(
        'Não é possível utilizar um cliente inativo',
      );
    }
    return cliente;
  }

  private async validarResponsavel(
    tx: Prisma.TransactionClient,
    responsavelId: string | undefined,
    empresaId: string,
  ) {
    if (!responsavelId) return;
    const responsavel = await tx.usuario.findFirst({
      where: { id: responsavelId, empresaId },
    });
    if (!responsavel) throw new NotFoundException('Responsável não encontrado');
    if (!responsavel.ativo) {
      throw new BadRequestException(
        'Não é possível atribuir um responsável inativo',
      );
    }
  }

  private async validarAgendaEvento(
    tx: Prisma.TransactionClient,
    agendaEventoId: string | undefined,
    clienteId: string,
    empresaId: string,
  ) {
    if (!agendaEventoId) return;
    const evento = await tx.agendaEvento.findFirst({
      where: { id: agendaEventoId, empresaId },
    });
    if (!evento) throw new NotFoundException('Evento da agenda não encontrado');
    if (!evento.ativo) {
      throw new BadRequestException(
        'Não é possível utilizar um evento inativo',
      );
    }
    if (evento.clienteId && evento.clienteId !== clienteId) {
      throw new BadRequestException(
        'O evento da agenda está vinculado a outro cliente',
      );
    }
  }

  private async registrarHistorico(
    tx: Prisma.TransactionClient,
    ordemServicoId: string,
    descricao: string,
    usuarioId?: string,
    statusAnterior?: string,
    statusNovo?: string,
  ) {
    return tx.ordemServicoHistorico.create({
      data: {
        ordemServicoId,
        descricao,
        statusAnterior,
        statusNovo,
        usuarioId,
      },
      include: this.includeHistorico,
    });
  }

  async gerarNumero(tx: Prisma.TransactionClient, empresaId: string) {
    const chave = `ordem-servico-numero:${empresaId}`;
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtextextended(${chave}, 0))
    `;
    const ultima = await tx.ordemServico.findFirst({
      where: { empresaId },
      orderBy: { numero: 'desc' },
      select: { numero: true },
    });
    return (ultima?.numero ?? 0) + 1;
  }

  private ehConflitoNumero(error: unknown) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
    if (error.code !== 'P2002') return false;
    const target = error.meta?.target;
    if (Array.isArray(target)) {
      return (
        target.length === 2 &&
        target.includes('empresaId') &&
        target.includes('numero')
      );
    }
    return target === 'OrdemServico_empresaId_numero_key';
  }

  async criar(
    empresaId: string,
    usuarioId: string,
    dados: CriarOrdemServicoDto,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.validarCliente(tx, dados.clienteId, empresaId);
        await this.validarResponsavel(tx, dados.responsavelId, empresaId);
        await this.validarAgendaEvento(
          tx,
          dados.agendaEventoId,
          dados.clienteId,
          empresaId,
        );
        const numero = await this.gerarNumero(tx, empresaId);
        const ordem = await tx.ordemServico.create({
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
          include: this.includeOrdem,
        });
        await this.registrarHistorico(
          tx,
          ordem.id,
          `Ordem de serviço nº ${numero} criada.`,
          usuarioId,
          undefined,
          'ABERTA',
        );
        return ordem;
      });
    } catch (error) {
      if (this.ehConflitoNumero(error)) {
        throw new ConflictException(
          'Já existe uma ordem de serviço com este número para a empresa. Tente novamente.',
        );
      }
      throw error;
    }
  }

  async listar(empresaId: string, paginacao: FiltroOrdensServicoDto) {
    const page = paginacao.page ?? 1;
    const limit = paginacao.limit ?? 10;
    const { skip, take } = calcularPaginacao(page, limit);
    const where: Prisma.OrdemServicoWhereInput = { empresaId };

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
    if (paginacao.status) where.status = paginacao.status;
    if (paginacao.prioridade) where.prioridade = paginacao.prioridade;
    if (paginacao.clienteId) where.clienteId = paginacao.clienteId;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.ordemServico.findMany({
        where,
        include: this.includeOrdemLista,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.ordemServico.count({ where }),
    ]);
    return respostaPaginada(data, total, page, limit);
  }

  async buscarPorId(empresaId: string, id: string) {
    const ordem = await this.prisma.ordemServico.findFirst({
      where: { id, empresaId },
      include: this.includeOrdem,
    });
    if (!ordem) throw new NotFoundException('Ordem de serviço não encontrada');
    return ordem;
  }

  async adicionarHistorico(
    empresaId: string,
    ordemServicoId: string,
    usuarioId: string,
    dados: CriarOrdemServicoHistoricoDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.buscarOrdemBloqueada(tx, ordemServicoId, empresaId);
      return this.registrarHistorico(
        tx,
        ordemServicoId,
        dados.descricao,
        usuarioId,
        dados.statusAnterior,
        dados.statusNovo,
      );
    });
  }

  async listarHistorico(empresaId: string, ordemServicoId: string) {
    await this.buscarPorId(empresaId, ordemServicoId);
    return this.prisma.ordemServicoHistorico.findMany({
      where: { ordemServicoId },
      include: this.includeHistorico,
      orderBy: { createdAt: 'desc' },
    });
  }

  private validarTransicao(statusAnterior: string, statusNovo: string) {
    const permitidos = STATUS_PERMITIDOS[statusAnterior] ?? [];
    if (!permitidos.includes(statusNovo)) {
      throw new BadRequestException(
        `Não é permitido alterar o status de ${statusAnterior} para ${statusNovo}.`,
      );
    }
  }

  async alterarStatus(
    empresaId: string,
    id: string,
    usuarioId: string,
    dados: AlterarStatusOrdemServicoDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const ordem = await this.buscarOrdemBloqueada(tx, id, empresaId);
      const statusAnterior = ordem.status;
      const statusNovo = dados.status;
      this.validarTransicao(statusAnterior, statusNovo);

      const atualizacao = await tx.ordemServico.updateMany({
        where: { id, empresaId, status: statusAnterior },
        data: {
          status: statusNovo,
          dataConclusao: statusNovo === 'CONCLUIDA' ? new Date() : undefined,
        },
      });
      if (atualizacao.count !== 1) {
        await tx.ordemServico.findFirst({ where: { id, empresaId } });
        throw new ConflictException(
          'A ordem de serviço foi alterada por outra operação. Recarregue e tente novamente.',
        );
      }

      await this.registrarHistorico(
        tx,
        id,
        dados.descricao ||
          `Status alterado de ${statusAnterior} para ${statusNovo}.`,
        usuarioId,
        statusAnterior,
        statusNovo,
      );
      return tx.ordemServico.findFirstOrThrow({
        where: { id, empresaId },
        include: this.includeOrdem,
      });
    });
  }
}
