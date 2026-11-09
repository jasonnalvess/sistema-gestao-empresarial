import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  OrigemContaPagar,
  OrigemMovimentacaoCaixa,
  Prisma,
  StatusContaPagar,
  TipoMovimentacaoCaixa,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CaixasService } from '../caixas/caixas.service';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

import { CriarContaPagarDto } from './dto/criar-conta-pagar.dto';
import { AtualizarContaPagarDto } from './dto/atualizar-conta-pagar.dto';
import { FiltroContasPagarDto } from './dto/filtro-contas-pagar.dto';
import { FiltroResumoContasPagarDto } from './dto/filtro-resumo-contas-pagar.dto';
import { RegistrarPagamentoContaPagarDto } from './dto/registrar-pagamento-conta-pagar.dto';
import { CriarContaPagarHistoricoDto } from './dto/criar-conta-pagar-historico.dto';
import { GerarContaPedidoCompraDto } from './dto/gerar-conta-pedido-compra.dto';
import { paraDecimalMonetario } from './valor-monetario';

const CAMPOS_ORDENACAO_CONTA_PAGAR = [
  'numero',
  'descricao',
  'status',
  'origem',
  'dataEmissao',
  'dataVencimento',
  'valorOriginal',
  'valorAberto',
  'createdAt',
  'updatedAt',
] as const satisfies readonly (keyof Prisma.ContaPagarOrderByWithRelationInput)[];
type CampoOrdenacaoContaPagar = (typeof CAMPOS_ORDENACAO_CONTA_PAGAR)[number];

@Injectable()
export class ContasPagarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caixasService: CaixasService,
  ) {}

  private readonly usuarioSelect = {
    id: true,
    nome: true,
    email: true,
    tipo: true,
  };

  private readonly includeConta = {
    fornecedor: true,
    pedidoCompra: {
      select: {
        id: true,
        numero: true,
        status: true,
        valorTotal: true,
      },
    },
    usuarioCriacao: {
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
      },
    },
    usuarioCancelamento: {
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
      },
    },
    pagamentos: {
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            tipo: true,
          },
        },
        movimentacaoCaixa: {
          include: {
            caixa: {
              select: {
                id: true,
                nome: true,
                codigo: true,
              },
            },
          },
        },
      },
      orderBy: {
        dataPagamento: 'desc' as const,
      },
    },
    historicos: {
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
        createdAt: 'desc' as const,
      },
      take: 50,
    },
  };

  private obterUsuarioId(usuario: AuthenticatedUser): string {
    return usuario.id;
  }

  private inicioHoje() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return hoje;
  }

  private calcularValorAberto(
    valorOriginal: Prisma.Decimal,
    valorDesconto: Prisma.Decimal,
    valorJuros: Prisma.Decimal,
    valorMulta: Prisma.Decimal,
    valorPago: Prisma.Decimal,
  ): Prisma.Decimal {
    return valorOriginal
      .plus(valorJuros)
      .plus(valorMulta)
      .minus(valorDesconto)
      .minus(valorPago);
  }

  private determinarStatusInicial(dataVencimento: Date): StatusContaPagar {
    if (dataVencimento < this.inicioHoje()) {
      return StatusContaPagar.VENCIDA;
    }

    return StatusContaPagar.PENDENTE;
  }

  private alvoP2002(
    error: unknown,
    campos: readonly string[],
    indice?: string,
  ): boolean {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== 'P2002'
    )
      return false;
    const target = error.meta?.target;
    if (Array.isArray(target))
      return (
        target.length === campos.length &&
        campos.every((campo) => target.includes(campo))
      );
    return indice !== undefined && target === indice;
  }

  private tratarErroPrisma(error: unknown): never {
    if (this.alvoP2002(error, ['empresaId', 'numero'])) {
      throw new ConflictException(
        'Conflito ao gerar a numeração da conta a pagar',
      );
    }
    if (
      this.alvoP2002(error, ['pedidoCompraId'], 'ContaPagar_pedidoCompraId_key')
    ) {
      throw new ConflictException(
        'Este pedido de compra já possui uma conta a pagar',
      );
    }
    if (
      this.alvoP2002(
        error,
        ['pagamentoContaPagarId'],
        'MovimentacaoCaixa_pagamentoContaPagarId_key',
      )
    ) {
      throw new ConflictException(
        'Este pagamento já possui movimentação de caixa',
      );
    }
    throw error;
  }

  private tratarErroPagamento(error: unknown): never {
    if (
      this.alvoP2002(
        error,
        ['pagamentoContaPagarId'],
        'MovimentacaoCaixa_pagamentoContaPagarId_key',
      )
    ) {
      throw new ConflictException(
        'Este pagamento já possui movimentação de caixa',
      );
    }
    throw error;
  }

  private async bloquearConta(
    tx: Prisma.TransactionClient,
    empresaId: string,
    id: string,
  ) {
    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "ContaPagar" WHERE "id" = ${id} AND "empresaId" = ${empresaId} FOR UPDATE`,
    );
  }

  private async atualizarContasVencidas(empresaId: string) {
    const where: Prisma.ContaPagarWhereInput = {
      empresaId,
      dataVencimento: {
        lt: this.inicioHoje(),
      },
      status: {
        in: [StatusContaPagar.PENDENTE, StatusContaPagar.PARCIALMENTE_PAGA],
      },
      valorAberto: {
        gt: 0,
      },
    };

    await this.prisma.contaPagar.updateMany({
      where,
      data: {
        status: StatusContaPagar.VENCIDA,
      },
    });
  }

  private async validarFornecedor(
    fornecedorId: string,
    empresaId: string,
    cliente: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const fornecedor = await cliente.fornecedor.findFirst({
      where: { id: fornecedorId, empresaId },
    });

    if (!fornecedor) {
      throw new NotFoundException('Fornecedor não encontrado');
    }

    if (!fornecedor.ativo) {
      throw new BadRequestException(
        'Não é possível utilizar um fornecedor inativo',
      );
    }

    return fornecedor;
  }

  private async validarPedidoCompra(
    pedidoCompraId: string,
    empresaId: string,
    cliente: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const pedido = await cliente.pedidoCompra.findFirst({
      where: { id: pedidoCompraId, empresaId },
      include: {
        fornecedor: true,
      },
    });

    if (!pedido) {
      throw new NotFoundException('Pedido de compra não encontrado');
    }

    return pedido;
  }

  private async registrarHistorico(
    contaPagarId: string,
    descricao: string,
    usuario: AuthenticatedUser,
    tx?: Prisma.TransactionClient,
  ) {
    const cliente = tx ?? this.prisma;

    return cliente.contaPagarHistorico.create({
      data: {
        contaPagarId,
        descricao,
        usuarioId: this.obterUsuarioId(usuario),
      },
    });
  }

  async criar(
    empresaId: string,
    dados: CriarContaPagarDto,
    usuario: AuthenticatedUser,
  ) {
    let fornecedorId = dados.fornecedorId;
    let pedidoCompra:
      | Awaited<ReturnType<ContasPagarService['validarPedidoCompra']>>
      | undefined;

    if (dados.pedidoCompraId) {
      pedidoCompra = await this.validarPedidoCompra(
        dados.pedidoCompraId,
        empresaId,
      );

      if (fornecedorId && pedidoCompra.fornecedorId !== fornecedorId) {
        throw new BadRequestException(
          'O fornecedor informado é diferente do fornecedor do pedido de compra',
        );
      }

      fornecedorId = fornecedorId ?? pedidoCompra.fornecedorId;
    }

    if (fornecedorId) {
      await this.validarFornecedor(fornecedorId, empresaId);
    }

    const parcelaAtual = dados.parcelaAtual ?? 1;
    const totalParcelas = dados.totalParcelas ?? 1;

    if (parcelaAtual > totalParcelas) {
      throw new BadRequestException(
        'A parcela atual não pode ser maior que o total de parcelas',
      );
    }

    const valorOriginal = paraDecimalMonetario(
      dados.valorOriginal,
      'O valor original',
    );
    const valorDesconto = paraDecimalMonetario(
      dados.valorDesconto ?? 0,
      'O desconto',
    );
    const valorJuros = paraDecimalMonetario(dados.valorJuros ?? 0, 'Os juros');
    const valorMulta = paraDecimalMonetario(dados.valorMulta ?? 0, 'A multa');

    const valorAberto = this.calcularValorAberto(
      valorOriginal,
      valorDesconto,
      valorJuros,
      valorMulta,
      new Prisma.Decimal(0),
    );

    if (valorAberto.lte(0)) {
      throw new BadRequestException(
        'O valor aberto da conta precisa ser maior que zero',
      );
    }

    const dataVencimento = new Date(dados.dataVencimento);

    return this.prisma.$transaction(async (tx) => {
      if (dados.pedidoCompraId) {
        await this.validarPedidoCompra(dados.pedidoCompraId, empresaId, tx);
      }
      if (fornecedorId) {
        await this.validarFornecedor(fornecedorId, empresaId, tx);
      }

      const ultimaConta = await tx.contaPagar.findFirst({
        where: {
          empresaId,
        },
        orderBy: {
          numero: 'desc',
        },
        select: {
          numero: true,
        },
      });

      const numero = (ultimaConta?.numero ?? 0) + 1;

      const conta = await (async () => {
        try {
          return await tx.contaPagar.create({
            data: {
              numero,
              descricao: dados.descricao.trim(),
              documento: dados.documento?.trim(),
              observacao: dados.observacao?.trim(),

              origem:
                dados.origem ??
                (dados.pedidoCompraId
                  ? OrigemContaPagar.PEDIDO_COMPRA
                  : OrigemContaPagar.MANUAL),

              status: this.determinarStatusInicial(dataVencimento),

              dataEmissao: dados.dataEmissao
                ? new Date(dados.dataEmissao)
                : new Date(),

              dataCompetencia: dados.dataCompetencia
                ? new Date(dados.dataCompetencia)
                : undefined,

              dataVencimento,

              parcelaAtual,
              totalParcelas,

              valorOriginal,
              valorDesconto,
              valorJuros,
              valorMulta,
              valorPago: 0,
              valorAberto,

              empresaId,
              fornecedorId,
              pedidoCompraId: dados.pedidoCompraId,

              usuarioCriacaoId: this.obterUsuarioId(usuario),
            },
            include: this.includeConta,
          });
        } catch (error) {
          this.tratarErroPrisma(error);
        }
      })();

      await this.registrarHistorico(
        conta.id,
        `Conta a pagar nº ${numero} criada no valor de R$ ${valorOriginal.toFixed(
          2,
        )}.`,
        usuario,
        tx,
      );

      return conta;
    });
  }

  async listar(empresaId: string, filtros: FiltroContasPagarDto) {
    await this.atualizarContasVencidas(empresaId);

    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 10;
    const { skip, take } = calcularPaginacao(page, limit);

    const where: Prisma.ContaPagarWhereInput = { empresaId };

    if (filtros.status) {
      where.status = filtros.status;
    }

    if (filtros.origem) {
      where.origem = filtros.origem;
    }

    if (filtros.fornecedorId) {
      where.fornecedorId = filtros.fornecedorId;
    }

    if (filtros.pedidoCompraId) {
      where.pedidoCompraId = filtros.pedidoCompraId;
    }

    if (filtros.vencimentoInicio || filtros.vencimentoFim) {
      where.dataVencimento = {};

      if (filtros.vencimentoInicio) {
        where.dataVencimento.gte = new Date(filtros.vencimentoInicio);
      }

      if (filtros.vencimentoFim) {
        const dataFim = new Date(filtros.vencimentoFim);

        dataFim.setUTCHours(23, 59, 59, 999);

        where.dataVencimento.lte = dataFim;
      }
    }

    if (filtros.search) {
      const numero = Number(filtros.search);
      const documento = filtros.search.trim();

      where.OR = [
        {
          descricao: {
            contains: filtros.search,
            mode: 'insensitive',
          },
        },
        {
          documento: {
            contains: documento,
            mode: 'insensitive',
          },
        },
        {
          observacao: {
            contains: filtros.search,
            mode: 'insensitive',
          },
        },
        {
          fornecedor: {
            razaoSocial: {
              contains: filtros.search,
              mode: 'insensitive',
            },
          },
        },
        {
          fornecedor: {
            nomeFantasia: {
              contains: filtros.search,
              mode: 'insensitive',
            },
          },
        },
      ];

      if (filtros.search.trim() && !Number.isNaN(numero)) {
        where.OR.push({
          numero,
        });
      }
    }

    const sortBy: CampoOrdenacaoContaPagar =
      CAMPOS_ORDENACAO_CONTA_PAGAR.find((campo) => campo === filtros.sortBy) ??
      'dataVencimento';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.contaPagar.findMany({
        where,
        include: {
          fornecedor: true,
          pedidoCompra: {
            select: {
              id: true,
              numero: true,
              status: true,
            },
          },
          usuarioCriacao: {
            select: this.usuarioSelect,
          },
          _count: {
            select: {
              pagamentos: true,
            },
          },
        },
        orderBy: {
          [sortBy]: filtros.order ?? 'asc',
        },
        skip,
        take,
      }),

      this.prisma.contaPagar.count({
        where,
      }),
    ]);

    return respostaPaginada(data, total, page, limit);
  }

  async obterResumo(empresaId: string, filtros: FiltroResumoContasPagarDto) {
    await this.atualizarContasVencidas(empresaId);

    const where: Prisma.ContaPagarWhereInput = {
      empresaId,
      status: {
        not: StatusContaPagar.CANCELADA,
      },
    };

    if (filtros.vencimentoInicio || filtros.vencimentoFim) {
      where.dataVencimento = {};

      if (filtros.vencimentoInicio) {
        where.dataVencimento.gte = new Date(filtros.vencimentoInicio);
      }

      if (filtros.vencimentoFim) {
        const dataFim = new Date(filtros.vencimentoFim);
        dataFim.setUTCHours(23, 59, 59, 999);
        where.dataVencimento.lte = dataFim;
      }
    }

    const [totais, vencidas] = await this.prisma.$transaction([
      this.prisma.contaPagar.aggregate({
        where,
        _sum: {
          valorOriginal: true,
          valorPago: true,
          valorAberto: true,
        },
      }),
      this.prisma.contaPagar.aggregate({
        where: {
          ...where,
          status: StatusContaPagar.VENCIDA,
        },
        _sum: {
          valorAberto: true,
        },
      }),
    ]);

    return {
      pagar: {
        valorOriginal: Number(totais._sum.valorOriginal ?? 0),
        valorPago: Number(totais._sum.valorPago ?? 0),
        valorAberto: Number(totais._sum.valorAberto ?? 0),
        valorVencido: Number(vencidas._sum.valorAberto ?? 0),
      },
    };
  }

  async buscarPorId(empresaId: string, id: string) {
    await this.atualizarContasVencidas(empresaId);
    const conta = await this.prisma.contaPagar.findFirst({
      where: { id, empresaId },
      include: this.includeConta,
    });

    if (!conta) {
      throw new NotFoundException('Conta a pagar não encontrada');
    }
    return conta;
  }

  async atualizar(
    empresaId: string,
    id: string,
    dados: AtualizarContaPagarDto,
    usuario: AuthenticatedUser,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.bloquearConta(tx, empresaId, id);
      const conta = await tx.contaPagar.findFirst({
        where: { id, empresaId },
        include: this.includeConta,
      });
      if (!conta) throw new NotFoundException('Conta a pagar não encontrada');
      if (
        conta.status === StatusContaPagar.PAGA ||
        conta.status === StatusContaPagar.CANCELADA
      ) {
        throw new BadRequestException(
          'Conta paga ou cancelada não pode ser alterada',
        );
      }
      if (
        conta.pagamentos.length > 0 ||
        new Prisma.Decimal(conta.valorPago).gt(0)
      ) {
        throw new BadRequestException(
          'Conta com pagamentos registrados não pode ser alterada',
        );
      }

      const fornecedorId =
        dados.fornecedorId !== undefined
          ? dados.fornecedorId
          : conta.fornecedorId;
      const pedidoCompraId =
        dados.pedidoCompraId !== undefined
          ? dados.pedidoCompraId
          : conta.pedidoCompraId;

      if (fornecedorId) {
        await this.validarFornecedor(fornecedorId, conta.empresaId, tx);
      }
      if (pedidoCompraId) {
        const pedido = await this.validarPedidoCompra(
          pedidoCompraId,
          conta.empresaId,
          tx,
        );
        if (fornecedorId && pedido.fornecedorId !== fornecedorId) {
          throw new BadRequestException(
            'O fornecedor é diferente do fornecedor do pedido',
          );
        }
      }

      const parcelaAtual = dados.parcelaAtual ?? conta.parcelaAtual;
      const totalParcelas = dados.totalParcelas ?? conta.totalParcelas;
      if (parcelaAtual > totalParcelas) {
        throw new BadRequestException(
          'A parcela atual não pode ser maior que o total de parcelas',
        );
      }

      const valorOriginal = paraDecimalMonetario(
        dados.valorOriginal ?? conta.valorOriginal,
        'O valor original',
      );
      const valorDesconto = paraDecimalMonetario(
        dados.valorDesconto ?? conta.valorDesconto,
        'O desconto',
      );
      const valorJuros = paraDecimalMonetario(
        dados.valorJuros ?? conta.valorJuros,
        'Os juros',
      );
      const valorMulta = paraDecimalMonetario(
        dados.valorMulta ?? conta.valorMulta,
        'A multa',
      );
      const valorAberto = valorOriginal
        .plus(valorJuros)
        .plus(valorMulta)
        .minus(valorDesconto);
      if (valorAberto.lte(0)) {
        throw new BadRequestException(
          'O valor aberto precisa ser maior que zero',
        );
      }

      const dataVencimento = dados.dataVencimento
        ? new Date(dados.dataVencimento)
        : conta.dataVencimento;
      const atualizada = await (async () => {
        try {
          return await tx.contaPagar.update({
            where: { id: conta.id, empresaId: conta.empresaId },
            data: {
              descricao: dados.descricao?.trim(),
              documento: dados.documento?.trim(),
              observacao: dados.observacao?.trim(),
              dataEmissao: dados.dataEmissao
                ? new Date(dados.dataEmissao)
                : undefined,
              dataCompetencia: dados.dataCompetencia
                ? new Date(dados.dataCompetencia)
                : undefined,
              dataVencimento,
              parcelaAtual,
              totalParcelas,
              valorOriginal,
              valorDesconto,
              valorJuros,
              valorMulta,
              valorAberto,
              status: this.determinarStatusInicial(dataVencimento),
              fornecedorId,
              pedidoCompraId,
            },
            include: this.includeConta,
          });
        } catch (error) {
          this.tratarErroPrisma(error);
        }
      })();
      await this.registrarHistorico(
        conta.id,
        'Conta a pagar atualizada.',
        usuario,
        tx,
      );
      return atualizada;
    });
  }

  async registrarPagamento(
    empresaId: string,
    id: string,
    dados: RegistrarPagamentoContaPagarDto,
    usuario: AuthenticatedUser,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.bloquearConta(tx, empresaId, id);

        const conta = await tx.contaPagar.findFirst({
          where: { id, empresaId },
          include: this.includeConta,
        });

        if (!conta) {
          throw new NotFoundException('Conta a pagar não encontrada');
        }
        if (conta.status === StatusContaPagar.PAGA) {
          throw new BadRequestException('Esta conta já está paga');
        }
        if (conta.status === StatusContaPagar.CANCELADA) {
          throw new BadRequestException(
            'Conta cancelada não pode receber pagamento',
          );
        }

        const valor = paraDecimalMonetario(dados.valor, 'O valor do pagamento');
        const desconto = paraDecimalMonetario(
          dados.desconto ?? 0,
          'O desconto',
        );
        const juros = paraDecimalMonetario(dados.juros ?? 0, 'Os juros');
        const multa = paraDecimalMonetario(dados.multa ?? 0, 'A multa');

        if (valor.lte(0) || desconto.lt(0) || juros.lt(0) || multa.lt(0)) {
          throw new BadRequestException(
            'Os valores do pagamento são inválidos',
          );
        }

        const saldoAjustado = new Prisma.Decimal(conta.valorAberto)
          .plus(juros)
          .plus(multa)
          .minus(desconto);

        if (saldoAjustado.lte(0)) {
          throw new BadRequestException(
            'Os descontos informados são maiores que o saldo da conta',
          );
        }
        if (valor.gt(saldoAjustado)) {
          throw new BadRequestException(
            'O pagamento não pode ser maior que o saldo de R$ ' +
              saldoAjustado.toFixed(2),
          );
        }

        const novoValorPago = new Prisma.Decimal(conta.valorPago).plus(valor);
        const novoValorDesconto = new Prisma.Decimal(conta.valorDesconto).plus(
          desconto,
        );
        const novoValorJuros = new Prisma.Decimal(conta.valorJuros).plus(juros);
        const novoValorMulta = new Prisma.Decimal(conta.valorMulta).plus(multa);
        const saldoCalculado = saldoAjustado.minus(valor);
        if (saldoCalculado.lt(0)) {
          throw new BadRequestException(
            'O pagamento não pode resultar em saldo negativo',
          );
        }
        const contaQuitada = saldoCalculado.eq(0);
        const novoValorAberto = saldoCalculado;
        const dataPagamento = dados.dataPagamento
          ? new Date(dados.dataPagamento)
          : new Date();

        const pagamento = await tx.pagamentoContaPagar.create({
          data: {
            valor,
            desconto,
            juros,
            multa,
            formaPagamento: dados.formaPagamento,
            dataPagamento,
            documento: dados.documento?.trim(),
            observacao: dados.observacao?.trim(),
            empresaId: conta.empresaId,
            contaPagarId: conta.id,
            usuarioId: this.obterUsuarioId(usuario),
          },
          include: { usuario: { select: this.usuarioSelect } },
        });

        let movimentacaoCaixa: Prisma.MovimentacaoCaixaGetPayload<object> | null =
          null;

        if (dados.caixaId) {
          const resultadoCaixa =
            await this.caixasService.registrarMovimentacaoFinanceira(
              tx,
              conta.empresaId,
              {
                caixaId: dados.caixaId,
                tipo: TipoMovimentacaoCaixa.SAIDA,
                origem: OrigemMovimentacaoCaixa.CONTA_PAGAR,
                descricao:
                  'Pagamento da conta a pagar nº ' +
                  conta.numero +
                  ' - ' +
                  conta.descricao,
                documento:
                  dados.documento?.trim() || conta.documento || undefined,
                observacao: dados.observacao?.trim(),
                valor,
                dataMovimentacao: dataPagamento,
                usuarioId: this.obterUsuarioId(usuario),
                pagamentoContaPagarId: pagamento.id,
              },
            );
          movimentacaoCaixa = resultadoCaixa.movimentacao;
        }

        const contaAtualizada = await tx.contaPagar.update({
          where: { id: conta.id, empresaId: conta.empresaId },
          data: {
            valorPago: novoValorPago,
            valorDesconto: novoValorDesconto,
            valorJuros: novoValorJuros,
            valorMulta: novoValorMulta,
            valorAberto: novoValorAberto,
            status: contaQuitada
              ? StatusContaPagar.PAGA
              : StatusContaPagar.PARCIALMENTE_PAGA,
            dataPagamento: contaQuitada ? dataPagamento : null,
          },
          include: this.includeConta,
        });

        await this.registrarHistorico(
          conta.id,
          contaQuitada
            ? 'Conta quitada com pagamento de R$ ' + valor.toFixed(2) + '.'
            : 'Pagamento parcial de R$ ' + valor.toFixed(2) + ' registrado.',
          usuario,
          tx,
        );

        return { pagamento, movimentacaoCaixa, conta: contaAtualizada };
      });
    } catch (error) {
      this.tratarErroPagamento(error);
    }
  }

  async cancelar(empresaId: string, id: string, usuario: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      await this.bloquearConta(tx, empresaId, id);
      const conta = await tx.contaPagar.findFirst({
        where: { id, empresaId },
        include: this.includeConta,
      });

      if (!conta) {
        throw new NotFoundException('Conta a pagar não encontrada');
      }
      if (conta.status === StatusContaPagar.CANCELADA) {
        return conta;
      }
      if (conta.status === StatusContaPagar.PAGA) {
        throw new BadRequestException('Conta paga não pode ser cancelada');
      }
      if (
        conta.pagamentos.length > 0 ||
        new Prisma.Decimal(conta.valorPago).gt(0)
      ) {
        throw new BadRequestException(
          'Conta com pagamentos não pode ser cancelada',
        );
      }

      const transicao = await tx.contaPagar.updateMany({
        where: {
          id: conta.id,
          empresaId: conta.empresaId,
          status: {
            in: [
              StatusContaPagar.PENDENTE,
              StatusContaPagar.PARCIALMENTE_PAGA,
              StatusContaPagar.VENCIDA,
            ],
          },
          valorPago: 0,
          pagamentos: { none: {} },
        },
        data: {
          status: StatusContaPagar.CANCELADA,
          dataCancelamento: new Date(),
          usuarioCancelamentoId: this.obterUsuarioId(usuario),
        },
      });

      if (transicao.count !== 1) {
        throw new ConflictException(
          'A conta foi alterada e não pode mais ser cancelada',
        );
      }

      await this.registrarHistorico(
        conta.id,
        'Conta a pagar cancelada.',
        usuario,
        tx,
      );

      return tx.contaPagar.findUniqueOrThrow({
        where: { id: conta.id, empresaId: conta.empresaId },
        include: this.includeConta,
      });
    });
  }

  async gerarAPartirPedidoCompra(
    empresaId: string,
    pedidoCompraId: string,
    dados: GerarContaPedidoCompraDto,
    usuario: AuthenticatedUser,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const pedido = await this.validarPedidoCompra(
        pedidoCompraId,
        empresaId,
        tx,
      );

      if (pedido.status !== 'RECEBIDO') {
        throw new BadRequestException(
          'Somente pedidos totalmente recebidos podem gerar conta a pagar',
        );
      }

      const contaExistente = await tx.contaPagar.findUnique({
        where: { pedidoCompraId },
        select: { numero: true },
      });

      if (contaExistente) {
        throw new ConflictException(
          'O pedido de compra já possui a conta a pagar nº ' +
            contaExistente.numero,
        );
      }

      await this.validarFornecedor(pedido.fornecedorId, empresaId, tx);

      const valorOriginal = paraDecimalMonetario(
        pedido.valorTotal,
        'O valor total do pedido de compra',
      );
      if (valorOriginal.lte(0)) {
        throw new BadRequestException(
          'O pedido precisa possuir valor total maior que zero',
        );
      }

      const dataVencimento = new Date(dados.dataVencimento);
      const ultimaConta = await tx.contaPagar.findFirst({
        where: { empresaId },
        orderBy: { numero: 'desc' },
        select: { numero: true },
      });
      const numero = (ultimaConta?.numero ?? 0) + 1;

      const conta = await (async () => {
        try {
          return await tx.contaPagar.create({
            data: {
              numero,
              descricao: 'Pedido de compra nº ' + pedido.numero,
              documento:
                dados.documento?.trim() || 'PEDIDO-COMPRA-' + pedido.numero,
              observacao:
                dados.observacao?.trim() ||
                'Conta gerada a partir do pedido de compra nº ' +
                  pedido.numero +
                  '.',
              origem: OrigemContaPagar.PEDIDO_COMPRA,
              status: this.determinarStatusInicial(dataVencimento),
              dataEmissao: new Date(),
              dataCompetencia: dados.dataCompetencia
                ? new Date(dados.dataCompetencia)
                : undefined,
              dataVencimento,
              parcelaAtual: 1,
              totalParcelas: 1,
              valorOriginal,
              valorDesconto: 0,
              valorJuros: 0,
              valorMulta: 0,
              valorPago: 0,
              valorAberto: valorOriginal,
              empresaId,
              fornecedorId: pedido.fornecedorId,
              pedidoCompraId: pedido.id,
              usuarioCriacaoId: this.obterUsuarioId(usuario),
            },
            include: this.includeConta,
          });
        } catch (error) {
          this.tratarErroPrisma(error);
        }
      })();

      await this.registrarHistorico(
        conta.id,
        'Conta a pagar nº ' +
          numero +
          ' gerada a partir do pedido de compra nº ' +
          pedido.numero +
          '.',
        usuario,
        tx,
      );

      return conta;
    });
  }

  async adicionarHistorico(
    empresaId: string,
    contaPagarId: string,
    dados: CriarContaPagarHistoricoDto,
    usuario: AuthenticatedUser,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const conta = await tx.contaPagar.findFirst({
        where: { id: contaPagarId, empresaId },
        select: { id: true },
      });
      if (!conta) throw new NotFoundException('Conta a pagar não encontrada');
      return tx.contaPagarHistorico.create({
        data: {
          contaPagarId: conta.id,
          descricao: dados.descricao.trim(),
          usuarioId: this.obterUsuarioId(usuario),
        },
        include: { usuario: { select: this.usuarioSelect } },
      });
    });
  }

  async listarHistorico(empresaId: string, contaPagarId: string) {
    await this.buscarPorId(empresaId, contaPagarId);

    return this.prisma.contaPagarHistorico.findMany({
      where: {
        contaPagarId,
      },
      include: {
        usuario: {
          select: this.usuarioSelect,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
