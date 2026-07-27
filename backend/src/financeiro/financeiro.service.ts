import { Injectable } from '@nestjs/common';

import { Prisma, StatusContaPagar, StatusContaReceber } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { FiltroResumoFinanceiroDto } from './dto/filtro-resumo-financeiro.dto';

@Injectable()
export class FinanceiroService {
  constructor(private readonly prisma: PrismaService) {}

  private inicioHoje(): Date {
    const hoje = new Date();

    hoje.setHours(0, 0, 0, 0);

    return hoje;
  }

  private criarFiltroPeriodo(
    inicio?: string,
    fim?: string,
  ): Prisma.DateTimeFilter | undefined {
    if (!inicio && !fim) {
      return undefined;
    }

    const filtro: Prisma.DateTimeFilter = {};

    if (inicio) {
      filtro.gte = new Date(inicio);
    }

    if (fim) {
      const dataFim = new Date(fim);

      dataFim.setUTCHours(23, 59, 59, 999);

      filtro.lte = dataFim;
    }

    return filtro;
  }

  private async atualizarVencimentos(empresaId?: string) {
    const filtroEmpresa = empresaId
      ? {
          empresaId,
        }
      : {};

    await this.prisma.$transaction([
      this.prisma.contaPagar.updateMany({
        where: {
          ...filtroEmpresa,

          dataVencimento: {
            lt: this.inicioHoje(),
          },

          status: {
            in: [StatusContaPagar.PENDENTE, StatusContaPagar.PARCIALMENTE_PAGA],
          },

          valorAberto: {
            gt: 0,
          },
        },

        data: {
          status: StatusContaPagar.VENCIDA,
        },
      }),

      this.prisma.contaReceber.updateMany({
        where: {
          ...filtroEmpresa,

          dataVencimento: {
            lt: this.inicioHoje(),
          },

          status: {
            in: [
              StatusContaReceber.PENDENTE,
              StatusContaReceber.PARCIALMENTE_RECEBIDA,
            ],
          },

          valorAberto: {
            gt: 0,
          },
        },

        data: {
          status: StatusContaReceber.VENCIDA,
        },
      }),
    ]);
  }

  async resumo(usuario: AuthenticatedUser, filtros: FiltroResumoFinanceiroDto) {
    const empresaId =
      usuario.tipo === 'SUPER_ADMIN'
        ? undefined
        : (usuario.empresaId ?? undefined);

    await this.atualizarVencimentos(empresaId);

    const filtroPeriodo = this.criarFiltroPeriodo(
      filtros.vencimentoInicio,
      filtros.vencimentoFim,
    );

    const wherePagar: Prisma.ContaPagarWhereInput = {
      ...(empresaId
        ? {
            empresaId,
          }
        : {}),

      ...(filtroPeriodo
        ? {
            dataVencimento: filtroPeriodo,
          }
        : {}),

      status: {
        not: StatusContaPagar.CANCELADA,
      },
    };

    const whereReceber: Prisma.ContaReceberWhereInput = {
      ...(empresaId
        ? {
            empresaId,
          }
        : {}),

      ...(filtroPeriodo
        ? {
            dataVencimento: filtroPeriodo,
          }
        : {}),

      status: {
        not: StatusContaReceber.CANCELADA,
      },
    };

    const [
      pagarTotais,
      receberTotais,
      pagarVencidas,
      receberVencidas,
      contasPagarQuantidade,
      contasReceberQuantidade,
      contasPagarEmAbertoQuantidade,
      contasReceberEmAbertoQuantidade,
      contasPagarVencidasQuantidade,
      contasReceberVencidasQuantidade,
    ] = await this.prisma.$transaction([
      this.prisma.contaPagar.aggregate({
        where: wherePagar,

        _sum: {
          valorOriginal: true,
          valorPago: true,
          valorAberto: true,
          valorDesconto: true,
          valorJuros: true,
          valorMulta: true,
        },
      }),

      this.prisma.contaReceber.aggregate({
        where: whereReceber,

        _sum: {
          valorOriginal: true,
          valorRecebido: true,
          valorAberto: true,
          valorDesconto: true,
          valorJuros: true,
          valorMulta: true,
        },
      }),

      this.prisma.contaPagar.aggregate({
        where: {
          ...wherePagar,
          status: StatusContaPagar.VENCIDA,
        },

        _sum: {
          valorAberto: true,
        },
      }),

      this.prisma.contaReceber.aggregate({
        where: {
          ...whereReceber,
          status: StatusContaReceber.VENCIDA,
        },

        _sum: {
          valorAberto: true,
        },
      }),

      this.prisma.contaPagar.count({
        where: wherePagar,
      }),

      this.prisma.contaReceber.count({
        where: whereReceber,
      }),

      this.prisma.contaPagar.count({
        where: {
          ...wherePagar,

          status: {
            in: [
              StatusContaPagar.PENDENTE,
              StatusContaPagar.PARCIALMENTE_PAGA,
              StatusContaPagar.VENCIDA,
            ],
          },

          valorAberto: {
            gt: 0,
          },
        },
      }),

      this.prisma.contaReceber.count({
        where: {
          ...whereReceber,

          status: {
            in: [
              StatusContaReceber.PENDENTE,
              StatusContaReceber.PARCIALMENTE_RECEBIDA,
              StatusContaReceber.VENCIDA,
            ],
          },

          valorAberto: {
            gt: 0,
          },
        },
      }),

      this.prisma.contaPagar.count({
        where: {
          ...wherePagar,
          status: StatusContaPagar.VENCIDA,
        },
      }),

      this.prisma.contaReceber.count({
        where: {
          ...whereReceber,
          status: StatusContaReceber.VENCIDA,
        },
      }),
    ]);

    const pagar = {
      valorOriginal: Number(pagarTotais._sum.valorOriginal ?? 0),

      valorPago: Number(pagarTotais._sum.valorPago ?? 0),

      valorAberto: Number(pagarTotais._sum.valorAberto ?? 0),

      valorVencido: Number(pagarVencidas._sum.valorAberto ?? 0),

      descontos: Number(pagarTotais._sum.valorDesconto ?? 0),

      juros: Number(pagarTotais._sum.valorJuros ?? 0),

      multas: Number(pagarTotais._sum.valorMulta ?? 0),

      quantidade: contasPagarQuantidade,

      quantidadeEmAberto: contasPagarEmAbertoQuantidade,

      quantidadeVencidas: contasPagarVencidasQuantidade,
    };

    const receber = {
      valorOriginal: Number(receberTotais._sum.valorOriginal ?? 0),

      valorRecebido: Number(receberTotais._sum.valorRecebido ?? 0),

      valorAberto: Number(receberTotais._sum.valorAberto ?? 0),

      valorVencido: Number(receberVencidas._sum.valorAberto ?? 0),

      descontos: Number(receberTotais._sum.valorDesconto ?? 0),

      juros: Number(receberTotais._sum.valorJuros ?? 0),

      multas: Number(receberTotais._sum.valorMulta ?? 0),

      quantidade: contasReceberQuantidade,

      quantidadeEmAberto: contasReceberEmAbertoQuantidade,

      quantidadeVencidas: contasReceberVencidasQuantidade,
    };

    return {
      periodo: {
        vencimentoInicio: filtros.vencimentoInicio ?? null,

        vencimentoFim: filtros.vencimentoFim ?? null,
      },

      pagar,
      receber,

      consolidado: {
        saldoProjetado: receber.valorAberto - pagar.valorAberto,

        resultadoRealizado: receber.valorRecebido - pagar.valorPago,

        saldoVencido: receber.valorVencido - pagar.valorVencido,

        totalVencido: receber.valorVencido + pagar.valorVencido,

        contasEmAberto:
          contasPagarEmAbertoQuantidade + contasReceberEmAbertoQuantidade,

        contasVencidas:
          contasPagarVencidasQuantidade + contasReceberVencidasQuantidade,
      },
    };
  }
}
