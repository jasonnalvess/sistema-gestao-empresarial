import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TipoEtapaCRM, UserType } from '@prisma/client';
import { prepararJsonAuditoria } from '../auditoria/auditoria-sanitizer';
import { paraDecimalMonetario } from '../contas-pagar/valor-monetario';
import {
  AuditoriaAcao,
  AuditoriaEntidade,
} from '../common/enums/auditoria.enum';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';
import { PrismaService } from '../prisma/prisma.service';
import { AtualizarCrmOportunidadeDto } from './dto/atualizar-crm-oportunidade.dto';
import { CriarCrmOportunidadeDto } from './dto/criar-crm-oportunidade.dto';
import { FiltroCrmOportunidadesDto } from './dto/filtro-crm-oportunidades.dto';
import { MovimentarCrmOportunidadeDto } from './dto/movimentar-crm-oportunidade.dto';
import { ReabrirCrmOportunidadeDto } from './dto/reabrir-crm-oportunidade.dto';
import { DesvincularVendaCrmOportunidadeDto } from './dto/desvincular-venda-crm-oportunidade.dto';
import { VincularVendaCrmOportunidadeDto } from './dto/vincular-venda-crm-oportunidade.dto';

type EstadoOportunidade = {
  id: string;
  empresaId: string;
  clienteId: string;
  etapaId: string;
  responsavelId: string;
  titulo: string;
  descricao: string | null;
  valorEstimado: Prisma.Decimal | null;
  previsaoFechamento: Date | null;
  dataFechamento: Date | null;
  motivoPerda: string | null;
  vendaId: string | null;
  versaoRegistro: number;
};

@Injectable()
export class CrmOportunidadesService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly tiposResponsavelElegivel = [
    UserType.ADMIN_EMPRESA,
    UserType.USUARIO_EMPRESA,
  ];

  private readonly detalheSelect = {
    id: true,
    empresaId: true,
    clienteId: true,
    etapaId: true,
    responsavelId: true,
    titulo: true,
    descricao: true,
    valorEstimado: true,
    previsaoFechamento: true,
    dataFechamento: true,
    motivoPerda: true,
    vendaId: true,
    versaoRegistro: true,
    createdAt: true,
    updatedAt: true,
    cliente: { select: { id: true, nome: true } },
    etapa: {
      select: { id: true, nome: true, ordem: true, tipo: true, ativo: true },
    },
    responsavel: { select: { id: true, nome: true, email: true, tipo: true } },
  } satisfies Prisma.CrmOportunidadeSelect;

  private estado(oportunidade: EstadoOportunidade): EstadoOportunidade {
    return {
      id: oportunidade.id,
      empresaId: oportunidade.empresaId,
      clienteId: oportunidade.clienteId,
      etapaId: oportunidade.etapaId,
      responsavelId: oportunidade.responsavelId,
      titulo: oportunidade.titulo,
      descricao: oportunidade.descricao,
      valorEstimado: oportunidade.valorEstimado,
      previsaoFechamento: oportunidade.previsaoFechamento,
      dataFechamento: oportunidade.dataFechamento,
      motivoPerda: oportunidade.motivoPerda,
      vendaId: oportunidade.vendaId,
      versaoRegistro: oportunidade.versaoRegistro,
    };
  }

  private data(valor: string): Date {
    const data = new Date(valor);
    if (Number.isNaN(data.getTime()))
      throw new BadRequestException('Data informada é inválida');
    return data;
  }

  private async validarResponsavel(
    tx: Prisma.TransactionClient,
    empresaId: string,
    responsavelId: string,
  ) {
    const responsavel = await tx.usuario.findFirst({
      where: {
        id: responsavelId,
        empresaId,
        ativo: true,
        tipo: { in: this.tiposResponsavelElegivel },
      },
      select: { id: true },
    });
    if (!responsavel)
      throw new BadRequestException('Responsável CRM inválido ou inativo');
  }

  async listarResponsaveis(empresaId: string) {
    return this.prisma.usuario.findMany({
      where: {
        empresaId,
        ativo: true,
        tipo: { in: this.tiposResponsavelElegivel },
      },
      select: {
        id: true,
        nome: true,
        email: true,
      },
      orderBy: [{ nome: 'asc' }, { id: 'asc' }],
    });
  }

  private async validarCriacao(
    tx: Prisma.TransactionClient,
    empresaId: string,
    dados: CriarCrmOportunidadeDto,
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

    const etapa = await tx.crmEtapa.findFirst({
      where: { id: dados.etapaId, empresaId },
      select: { id: true, ativo: true, tipo: true },
    });
    if (!etapa) throw new NotFoundException('Etapa CRM não encontrada');
    if (!etapa.ativo)
      throw new BadRequestException(
        'Não é possível utilizar uma etapa inativa',
      );
    if (etapa.tipo !== TipoEtapaCRM.ABERTA)
      throw new BadRequestException(
        'A etapa inicial da oportunidade deve ser do tipo ABERTA',
      );

    await this.validarResponsavel(tx, empresaId, dados.responsavelId);
  }

  private async auditar(
    tx: Prisma.TransactionClient,
    empresaId: string,
    usuarioId: string,
    acao: AuditoriaAcao,
    oportunidade: EstadoOportunidade,
    antes?: EstadoOportunidade,
  ) {
    await tx.auditoriaLog.create({
      data: {
        empresaId,
        usuarioId,
        entidade: AuditoriaEntidade.CRM_OPORTUNIDADE,
        entidadeId: oportunidade.id,
        acao,
        dadosAntigos: prepararJsonAuditoria(antes),
        dadosNovos: prepararJsonAuditoria(oportunidade),
      },
    });
  }

  private async registrarHistoricoCriacao(
    tx: Prisma.TransactionClient,
    empresaId: string,
    oportunidadeId: string,
    etapaId: string,
    usuarioId: string,
  ) {
    await tx.crmOportunidadeHistorico.create({
      data: {
        empresaId,
        oportunidadeId,
        etapaAnteriorId: null,
        etapaNovaId: etapaId,
        descricao: 'Oportunidade criada.',
        usuarioId,
      },
    });
  }

  private async registrarHistoricoEdicao(
    tx: Prisma.TransactionClient,
    empresaId: string,
    oportunidadeId: string,
    usuarioId: string,
    alterouResponsavel: boolean,
    alterouValorEstimado: boolean,
  ) {
    if (!alterouResponsavel && !alterouValorEstimado) return;
    const descricao =
      alterouResponsavel && alterouValorEstimado
        ? 'Responsável e valor estimado da oportunidade alterados.'
        : alterouResponsavel
          ? 'Responsável da oportunidade alterado.'
          : 'Valor estimado da oportunidade alterado.';
    await tx.crmOportunidadeHistorico.create({
      data: {
        empresaId,
        oportunidadeId,
        etapaAnteriorId: null,
        etapaNovaId: null,
        descricao,
        usuarioId,
      },
    });
  }

  private async executarComRetry<T>(
    operacao: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      try {
        return await this.prisma.$transaction(operacao, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (erro) {
        if (
          erro instanceof Prisma.PrismaClientKnownRequestError &&
          (erro.code === 'P2034' ||
            (erro.code === 'P2010' &&
              ['40001', '40P01'].includes(String(erro.meta?.code))))
        ) {
          if (tentativa < 2) continue;
          throw new ConflictException(
            'Alteração concorrente. Tente novamente.',
          );
        }
        throw erro;
      }
    }
    throw new ConflictException('Alteração concorrente. Tente novamente.');
  }

  async criar(
    empresaId: string,
    usuarioId: string,
    dados: CriarCrmOportunidadeDto,
  ) {
    if (!usuarioId)
      throw new ForbiddenException('Usuário autenticado sem identificador');
    return this.prisma.$transaction(async (tx) => {
      await this.validarCriacao(tx, empresaId, dados);
      const criada = await tx.crmOportunidade.create({
        data: {
          empresaId,
          clienteId: dados.clienteId,
          etapaId: dados.etapaId,
          responsavelId: dados.responsavelId,
          titulo: dados.titulo,
          descricao: dados.descricao,
          valorEstimado:
            dados.valorEstimado === undefined
              ? undefined
              : paraDecimalMonetario(dados.valorEstimado, 'Valor estimado'),
          previsaoFechamento: dados.previsaoFechamento
            ? this.data(dados.previsaoFechamento)
            : undefined,
          dataFechamento: null,
          motivoPerda: null,
          vendaId: null,
          versaoRegistro: 0,
        },
      });
      const estado = this.estado(criada);
      await this.registrarHistoricoCriacao(
        tx,
        empresaId,
        criada.id,
        criada.etapaId,
        usuarioId,
      );
      await this.auditar(
        tx,
        empresaId,
        usuarioId,
        AuditoriaAcao.CRIAR_OPORTUNIDADE_CRM,
        estado,
      );
      return tx.crmOportunidade.findFirstOrThrow({
        where: { id: criada.id, empresaId },
        select: this.detalheSelect,
      });
    });
  }

  async listar(empresaId: string, filtro: FiltroCrmOportunidadesDto) {
    const page = filtro.page ?? 1;
    const limit = filtro.limit ?? 10;
    const { skip, take } = calcularPaginacao(page, limit);
    const where: Prisma.CrmOportunidadeWhereInput = {
      empresaId,
      clienteId: filtro.clienteId,
      etapaId: filtro.etapaId,
      responsavelId: filtro.responsavelId,
      ...(filtro.tipoEtapa
        ? { etapa: { is: { empresaId, tipo: filtro.tipoEtapa } } }
        : {}),
    };
    if (filtro.previsaoFechamentoInicial || filtro.previsaoFechamentoFinal)
      where.previsaoFechamento = {
        ...(filtro.previsaoFechamentoInicial
          ? { gte: this.data(filtro.previsaoFechamentoInicial) }
          : {}),
        ...(filtro.previsaoFechamentoFinal
          ? { lte: this.data(filtro.previsaoFechamentoFinal) }
          : {}),
      };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.crmOportunidade.findMany({
        where,
        select: this.detalheSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
      this.prisma.crmOportunidade.count({ where }),
    ]);
    return respostaPaginada(data, total, page, limit);
  }

  async buscarPorId(empresaId: string, id: string) {
    const oportunidade = await this.prisma.crmOportunidade.findFirst({
      where: { id, empresaId },
      select: this.detalheSelect,
    });
    if (!oportunidade)
      throw new NotFoundException('Oportunidade não encontrada');
    return oportunidade;
  }

  async atualizar(
    empresaId: string,
    id: string,
    usuarioId: string,
    dados: AtualizarCrmOportunidadeDto,
  ) {
    if (!usuarioId)
      throw new ForbiddenException('Usuário autenticado sem identificador');
    return this.executarComRetry(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "CrmOportunidade" WHERE "id" = ${id} AND "empresaId" = ${empresaId} FOR UPDATE`;
      const antes = await tx.crmOportunidade.findFirst({
        where: { id, empresaId },
      });
      if (!antes) throw new NotFoundException('Oportunidade não encontrada');
      if (antes.versaoRegistro !== dados.versaoRegistro)
        throw new ConflictException(
          'A oportunidade foi alterada por outra operação. Recarregue e tente novamente.',
        );
      if (dados.responsavelId !== undefined)
        await this.validarResponsavel(tx, empresaId, dados.responsavelId);

      const novoValor =
        dados.valorEstimado === undefined
          ? undefined
          : paraDecimalMonetario(dados.valorEstimado, 'Valor estimado');
      const alterouResponsavel =
        dados.responsavelId !== undefined &&
        dados.responsavelId !== antes.responsavelId;
      const alterouValorEstimado =
        novoValor !== undefined &&
        (antes.valorEstimado === null ||
          !novoValor.equals(antes.valorEstimado));
      const atualizada = await tx.crmOportunidade.updateMany({
        where: { id, empresaId, versaoRegistro: dados.versaoRegistro },
        data: {
          titulo: dados.titulo,
          descricao: dados.descricao,
          valorEstimado: novoValor,
          previsaoFechamento: dados.previsaoFechamento
            ? this.data(dados.previsaoFechamento)
            : undefined,
          responsavelId: dados.responsavelId,
          versaoRegistro: { increment: 1 },
        },
      });
      if (atualizada.count !== 1)
        throw new ConflictException(
          'A oportunidade foi alterada por outra operação. Recarregue e tente novamente.',
        );
      const depois = await tx.crmOportunidade.findFirstOrThrow({
        where: { id, empresaId },
      });
      await this.registrarHistoricoEdicao(
        tx,
        empresaId,
        id,
        usuarioId,
        alterouResponsavel,
        alterouValorEstimado,
      );
      await this.auditar(
        tx,
        empresaId,
        usuarioId,
        AuditoriaAcao.ATUALIZAR_OPORTUNIDADE_CRM,
        this.estado(depois),
        this.estado(antes),
      );
      return tx.crmOportunidade.findFirstOrThrow({
        where: { id, empresaId },
        select: this.detalheSelect,
      });
    });
  }
  private async transicionar(
    empresaId: string,
    id: string,
    usuarioId: string,
    dados: MovimentarCrmOportunidadeDto | ReabrirCrmOportunidadeDto,
    reabrir: boolean,
  ) {
    return this.executarComRetry(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "CrmOportunidade" WHERE "id" = ${id} AND "empresaId" = ${empresaId} FOR UPDATE`;
      const antes = await tx.crmOportunidade.findFirst({
        where: { id, empresaId },
      });
      if (!antes) throw new NotFoundException('Oportunidade não encontrada');
      if (antes.versaoRegistro !== dados.versaoRegistro)
        throw new ConflictException(
          'A oportunidade foi alterada por outra operação. Recarregue e tente novamente.',
        );
      const atual = await tx.crmEtapa.findFirst({
        where: { id: antes.etapaId, empresaId },
        select: { tipo: true },
      });
      const destino = await tx.crmEtapa.findFirst({
        where: { id: dados.etapaId, empresaId },
        select: { id: true, tipo: true, ativo: true },
      });
      if (!atual || !destino)
        throw new NotFoundException('Etapa CRM não encontrada');
      if (!destino.ativo)
        throw new BadRequestException(
          'Não é possível utilizar uma etapa inativa',
        );
      const motivo = (dados as MovimentarCrmOportunidadeDto).motivoPerda;
      if (reabrir) {
        if (atual.tipo === TipoEtapaCRM.ABERTA)
          throw new ConflictException('A oportunidade já está aberta');
        if (destino.tipo !== TipoEtapaCRM.ABERTA)
          throw new BadRequestException('A reabertura exige uma etapa ABERTA');
      } else {
        if (atual.tipo !== TipoEtapaCRM.ABERTA)
          throw new ConflictException(
            'Oportunidades fechadas devem ser reabertas explicitamente',
          );
        if (antes.etapaId === destino.id)
          throw new ConflictException('A oportunidade já está nesta etapa');
        if (destino.tipo === TipoEtapaCRM.PERDIDA && !motivo)
          throw new BadRequestException('Motivo de perda é obrigatório');
        if (destino.tipo !== TipoEtapaCRM.PERDIDA && motivo !== undefined)
          throw new BadRequestException(
            'Motivo de perda só é permitido para etapa PERDIDA',
          );
      }
      const fechamento =
        !reabrir && destino.tipo !== TipoEtapaCRM.ABERTA ? new Date() : null;
      const resultado = await tx.crmOportunidade.updateMany({
        where: { id, empresaId, versaoRegistro: dados.versaoRegistro },
        data: {
          etapaId: destino.id,
          dataFechamento: fechamento,
          motivoPerda:
            !reabrir && destino.tipo === TipoEtapaCRM.PERDIDA ? motivo : null,
          versaoRegistro: { increment: 1 },
        },
      });
      if (resultado.count !== 1)
        throw new ConflictException(
          'A oportunidade foi alterada por outra operação. Recarregue e tente novamente.',
        );
      const depois = await tx.crmOportunidade.findFirstOrThrow({
        where: { id, empresaId },
      });
      await tx.crmOportunidadeHistorico.create({
        data: {
          empresaId,
          oportunidadeId: id,
          etapaAnteriorId: antes.etapaId,
          etapaNovaId: destino.id,
          descricao: reabrir
            ? 'Oportunidade reaberta.'
            : destino.tipo === TipoEtapaCRM.GANHA
              ? 'Oportunidade ganha.'
              : destino.tipo === TipoEtapaCRM.PERDIDA
                ? 'Oportunidade perdida.'
                : 'Oportunidade movimentada.',
          usuarioId,
        },
      });
      await this.auditar(
        tx,
        empresaId,
        usuarioId,
        reabrir
          ? AuditoriaAcao.REABRIR_OPORTUNIDADE_CRM
          : AuditoriaAcao.MOVIMENTAR_OPORTUNIDADE_CRM,
        this.estado(depois),
        this.estado(antes),
      );
      return tx.crmOportunidade.findFirstOrThrow({
        where: { id, empresaId },
        select: this.detalheSelect,
      });
    });
  }

  movimentar(
    empresaId: string,
    id: string,
    usuarioId: string,
    dados: MovimentarCrmOportunidadeDto,
  ) {
    return this.transicionar(empresaId, id, usuarioId, dados, false);
  }
  reabrir(
    empresaId: string,
    id: string,
    usuarioId: string,
    dados: ReabrirCrmOportunidadeDto,
  ) {
    return this.transicionar(empresaId, id, usuarioId, dados, true);
  }

  async desvincularVenda(
    empresaId: string,
    id: string,
    usuarioId: string,
    dados: DesvincularVendaCrmOportunidadeDto,
  ) {
    if (!usuarioId)
      throw new ForbiddenException('Usuário autenticado sem identificador');

    return this.executarComRetry(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "CrmOportunidade" WHERE "id" = ${id} AND "empresaId" = ${empresaId} FOR UPDATE`;
      const antes = await tx.crmOportunidade.findFirst({
        where: { id, empresaId },
      });
      if (!antes) throw new NotFoundException('Oportunidade não encontrada');
      if (antes.versaoRegistro !== dados.versaoRegistro)
        throw new ConflictException(
          'A oportunidade foi alterada por outra operação. Recarregue e tente novamente.',
        );
      if (!antes.vendaId)
        throw new ConflictException(
          'A oportunidade não possui venda vinculada',
        );

      const atualizada = await tx.crmOportunidade.updateMany({
        where: { id, empresaId, versaoRegistro: dados.versaoRegistro },
        data: {
          vendaId: null,
          versaoRegistro: { increment: 1 },
        },
      });
      if (atualizada.count !== 1)
        throw new ConflictException(
          'A oportunidade foi alterada por outra operação. Recarregue e tente novamente.',
        );

      const depois = await tx.crmOportunidade.findFirstOrThrow({
        where: { id, empresaId },
      });
      await tx.crmOportunidadeHistorico.create({
        data: {
          empresaId,
          oportunidadeId: id,
          etapaAnteriorId: antes.etapaId,
          etapaNovaId: antes.etapaId,
          descricao: 'Venda desvinculada da oportunidade.',
          usuarioId,
        },
      });
      await this.auditar(
        tx,
        empresaId,
        usuarioId,
        AuditoriaAcao.DESVINCULAR_VENDA_OPORTUNIDADE_CRM,
        this.estado(depois),
        this.estado(antes),
      );
      return tx.crmOportunidade.findFirstOrThrow({
        where: { id, empresaId },
        select: this.detalheSelect,
      });
    });
  }

  async vincularVenda(
    empresaId: string,
    id: string,
    usuarioId: string,
    dados: VincularVendaCrmOportunidadeDto,
  ) {
    if (!usuarioId)
      throw new ForbiddenException('Usuário autenticado sem identificador');

    try {
      return await this.executarComRetry(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "CrmOportunidade" WHERE "id" = ${id} AND "empresaId" = ${empresaId} FOR UPDATE`;
        const antes = await tx.crmOportunidade.findFirst({
          where: { id, empresaId },
        });
        if (!antes) throw new NotFoundException('Oportunidade não encontrada');
        if (antes.versaoRegistro !== dados.versaoRegistro)
          throw new ConflictException(
            'A oportunidade foi alterada por outra operação. Recarregue e tente novamente.',
          );

        const etapa = await tx.crmEtapa.findFirst({
          where: { id: antes.etapaId, empresaId },
          select: { id: true, tipo: true },
        });
        if (!etapa) throw new NotFoundException('Etapa CRM não encontrada');
        if (etapa.tipo !== TipoEtapaCRM.GANHA)
          throw new BadRequestException(
            'A oportunidade deve estar em uma etapa GANHA para vincular uma venda',
          );
        if (antes.vendaId)
          throw new ConflictException(
            'A oportunidade já possui uma venda vinculada',
          );

        await tx.$queryRaw`SELECT "id" FROM "Venda" WHERE "id" = ${dados.vendaId} AND "empresaId" = ${empresaId} FOR UPDATE`;
        const venda = await tx.venda.findFirst({
          where: { id: dados.vendaId, empresaId },
          select: { id: true, empresaId: true, clienteId: true },
        });
        if (!venda) throw new NotFoundException('Venda não encontrada');
        if (venda.clienteId !== antes.clienteId)
          throw new BadRequestException(
            'A venda deve pertencer ao mesmo cliente da oportunidade',
          );

        const oportunidadeVinculada = await tx.crmOportunidade.findFirst({
          where: { empresaId, vendaId: dados.vendaId },
          select: { id: true },
        });
        if (oportunidadeVinculada)
          throw new ConflictException(
            'A venda já está vinculada a outra oportunidade',
          );

        const atualizada = await tx.crmOportunidade.updateMany({
          where: { id, empresaId, versaoRegistro: dados.versaoRegistro },
          data: {
            vendaId: dados.vendaId,
            versaoRegistro: { increment: 1 },
          },
        });
        if (atualizada.count !== 1)
          throw new ConflictException(
            'A oportunidade foi alterada por outra operação. Recarregue e tente novamente.',
          );

        const depois = await tx.crmOportunidade.findFirstOrThrow({
          where: { id, empresaId },
        });
        await tx.crmOportunidadeHistorico.create({
          data: {
            empresaId,
            oportunidadeId: id,
            etapaAnteriorId: antes.etapaId,
            etapaNovaId: antes.etapaId,
            descricao: 'Venda vinculada à oportunidade.',
            usuarioId,
          },
        });
        await this.auditar(
          tx,
          empresaId,
          usuarioId,
          AuditoriaAcao.VINCULAR_VENDA_OPORTUNIDADE_CRM,
          this.estado(depois),
          this.estado(antes),
        );
        return tx.crmOportunidade.findFirstOrThrow({
          where: { id, empresaId },
          select: this.detalheSelect,
        });
      });
    } catch (erro) {
      if (
        erro instanceof Prisma.PrismaClientKnownRequestError &&
        (erro.code === 'P2002' || erro.code === 'P2003')
      )
        throw new ConflictException(
          'Não foi possível vincular a venda à oportunidade',
        );
      throw erro;
    }
  }
}
