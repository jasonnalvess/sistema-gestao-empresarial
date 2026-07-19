import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  OrigemContaPagar,
  OrigemMovimentacaoCaixa,
  Prisma,
  StatusCaixa,
  StatusContaPagar,
  TipoMovimentacaoCaixa,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';

import { CriarContaPagarDto } from './dto/criar-conta-pagar.dto';
import { AtualizarContaPagarDto } from './dto/atualizar-conta-pagar.dto';
import { FiltroContasPagarDto } from './dto/filtro-contas-pagar.dto';
import { RegistrarPagamentoContaPagarDto } from './dto/registrar-pagamento-conta-pagar.dto';
import { CriarContaPagarHistoricoDto } from './dto/criar-conta-pagar-historico.dto';
import { GerarContaPedidoCompraDto } from './dto/gerar-conta-pedido-compra.dto';

@Injectable()
export class ContasPagarService {
  constructor(private readonly prisma: PrismaService) {}

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

  private obterEmpresaId(usuario: any): string {
    if (!usuario.empresaId) {
      throw new BadRequestException(
        'O usuário não possui empresa vinculada',
      );
    }

    return usuario.empresaId;
  }

  private obterUsuarioId(usuario: any): string | undefined {
    return usuario.id ?? usuario.sub;
  }

  private inicioHoje() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return hoje;
  }

  private calcularValorAberto(
    valorOriginal: number,
    valorDesconto: number,
    valorJuros: number,
    valorMulta: number,
    valorPago: number,
  ) {
    const valorAberto =
      valorOriginal +
      valorJuros +
      valorMulta -
      valorDesconto -
      valorPago;

    return Math.max(valorAberto, 0);
  }

  private determinarStatusInicial(
    dataVencimento: Date,
  ): StatusContaPagar {
    if (dataVencimento < this.inicioHoje()) {
      return StatusContaPagar.VENCIDA;
    }

    return StatusContaPagar.PENDENTE;
  }

  private tratarErroPrisma(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Conflito ao gerar a numeração da conta a pagar',
      );
    }

    throw error;
  }

  private async atualizarContasVencidas(
    empresaId?: string,
  ) {
    const where: Prisma.ContaPagarWhereInput = {
      dataVencimento: {
        lt: this.inicioHoje(),
      },
      status: {
        in: [
          StatusContaPagar.PENDENTE,
          StatusContaPagar.PARCIALMENTE_PAGA,
        ],
      },
      valorAberto: {
        gt: 0,
      },
    };

    if (empresaId) {
      where.empresaId = empresaId;
    }

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
  ) {
    const fornecedor =
      await this.prisma.fornecedor.findUnique({
        where: {
          id: fornecedorId,
        },
      });

    if (!fornecedor) {
      throw new NotFoundException(
        'Fornecedor não encontrado',
      );
    }

    if (fornecedor.empresaId !== empresaId) {
      throw new ForbiddenException(
        'Fornecedor pertence a outra empresa',
      );
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
  ) {
    const pedido =
      await this.prisma.pedidoCompra.findUnique({
        where: {
          id: pedidoCompraId,
        },
        include: {
          fornecedor: true,
        },
      });

    if (!pedido) {
      throw new NotFoundException(
        'Pedido de compra não encontrado',
      );
    }

    if (pedido.empresaId !== empresaId) {
      throw new ForbiddenException(
        'Pedido de compra pertence a outra empresa',
      );
    }

    return pedido;
  }

  private async registrarHistorico(
    contaPagarId: string,
    descricao: string,
    usuario: any,
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
    dados: CriarContaPagarDto,
    usuario: any,
  ) {
    const empresaId = this.obterEmpresaId(usuario);

    let fornecedorId = dados.fornecedorId;
    let pedidoCompra:
      | Awaited<
          ReturnType<
            ContasPagarService['validarPedidoCompra']
          >
        >
      | undefined;

    if (dados.pedidoCompraId) {
      pedidoCompra = await this.validarPedidoCompra(
        dados.pedidoCompraId,
        empresaId,
      );

      if (
        fornecedorId &&
        pedidoCompra.fornecedorId !== fornecedorId
      ) {
        throw new BadRequestException(
          'O fornecedor informado é diferente do fornecedor do pedido de compra',
        );
      }

      fornecedorId =
        fornecedorId ?? pedidoCompra.fornecedorId;
    }

    if (fornecedorId) {
      await this.validarFornecedor(
        fornecedorId,
        empresaId,
      );
    }

    const parcelaAtual = dados.parcelaAtual ?? 1;
    const totalParcelas = dados.totalParcelas ?? 1;

    if (parcelaAtual > totalParcelas) {
      throw new BadRequestException(
        'A parcela atual não pode ser maior que o total de parcelas',
      );
    }

    const valorOriginal = Number(
      dados.valorOriginal,
    );
    const valorDesconto = Number(
      dados.valorDesconto ?? 0,
    );
    const valorJuros = Number(dados.valorJuros ?? 0);
    const valorMulta = Number(dados.valorMulta ?? 0);

    const valorAberto = this.calcularValorAberto(
      valorOriginal,
      valorDesconto,
      valorJuros,
      valorMulta,
      0,
    );

    if (valorAberto <= 0) {
      throw new BadRequestException(
        'O valor aberto da conta precisa ser maior que zero',
      );
    }

    const dataVencimento = new Date(
      dados.dataVencimento,
    );

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const ultimaConta =
            await tx.contaPagar.findFirst({
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

          const numero =
            (ultimaConta?.numero ?? 0) + 1;

          const conta = await tx.contaPagar.create({
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

              status:
                this.determinarStatusInicial(
                  dataVencimento,
                ),

              dataEmissao: dados.dataEmissao
                ? new Date(dados.dataEmissao)
                : new Date(),

              dataCompetencia:
                dados.dataCompetencia
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

              usuarioCriacaoId:
                this.obterUsuarioId(usuario),
            },
            include: this.includeConta,
          });

          await this.registrarHistorico(
            conta.id,
            `Conta a pagar nº ${numero} criada no valor de R$ ${valorOriginal.toFixed(
              2,
            )}.`,
            usuario,
            tx,
          );

          return conta;
        },
      );
    } catch (error) {
      this.tratarErroPrisma(error);
    }
  }

  async listar(
    usuario: any,
    filtros: FiltroContasPagarDto,
  ) {
    const empresaId =
      usuario.tipo === 'SUPER_ADMIN'
        ? undefined
        : usuario.empresaId;

    await this.atualizarContasVencidas(empresaId);

    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 10;
    const { skip, take } = calcularPaginacao(
      page,
      limit,
    );

    const where: Prisma.ContaPagarWhereInput =
      usuario.tipo === 'SUPER_ADMIN'
        ? {}
        : {
            empresaId: usuario.empresaId,
          };

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
      where.pedidoCompraId =
        filtros.pedidoCompraId;
    }

    if (
      filtros.vencimentoInicio ||
      filtros.vencimentoFim
    ) {
      where.dataVencimento = {};

      if (filtros.vencimentoInicio) {
        where.dataVencimento.gte = new Date(
          filtros.vencimentoInicio,
        );
      }

      if (filtros.vencimentoFim) {
        const dataFim = new Date(
          filtros.vencimentoFim,
        );

        dataFim.setUTCHours(
          23,
          59,
          59,
          999,
        );

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

      if (
        filtros.search.trim() &&
        !Number.isNaN(numero)
      ) {
        where.OR.push({
          numero,
        });
      }
    }

    const camposOrdenacao = [
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
    ];

    const sortBy = camposOrdenacao.includes(
      filtros.sortBy ?? '',
    )
      ? filtros.sortBy
      : 'dataVencimento';

    const [data, total] =
      await this.prisma.$transaction([
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
            [sortBy!]: filtros.order ?? 'asc',
          },
          skip,
          take,
        }),

        this.prisma.contaPagar.count({
          where,
        }),
      ]);

    return respostaPaginada(
      data,
      total,
      page,
      limit,
    );
  }

  async buscarPorId(id: string, usuario: any) {
    await this.atualizarContasVencidas(
      usuario.tipo === 'SUPER_ADMIN'
        ? undefined
        : usuario.empresaId,
    );

    const conta =
      await this.prisma.contaPagar.findUnique({
        where: {
          id,
        },
        include: this.includeConta,
      });

    if (!conta) {
      throw new NotFoundException(
        'Conta a pagar não encontrada',
      );
    }

    if (
      usuario.tipo !== 'SUPER_ADMIN' &&
      conta.empresaId !== usuario.empresaId
    ) {
      throw new ForbiddenException(
        'Acesso negado a conta de outra empresa',
      );
    }

    return conta;
  }

  async atualizar(
    id: string,
    dados: AtualizarContaPagarDto,
    usuario: any,
  ) {
    const conta = await this.buscarPorId(
      id,
      usuario,
    );

    if (
      conta.status === StatusContaPagar.PAGA ||
      conta.status === StatusContaPagar.CANCELADA
    ) {
      throw new BadRequestException(
        'Conta paga ou cancelada não pode ser alterada',
      );
    }

    if (conta.pagamentos.length > 0) {
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
      await this.validarFornecedor(
        fornecedorId,
        conta.empresaId,
      );
    }

    if (pedidoCompraId) {
      const pedido =
        await this.validarPedidoCompra(
          pedidoCompraId,
          conta.empresaId,
        );

      if (
        fornecedorId &&
        pedido.fornecedorId !== fornecedorId
      ) {
        throw new BadRequestException(
          'O fornecedor é diferente do fornecedor do pedido',
        );
      }
    }

    const parcelaAtual =
      dados.parcelaAtual ?? conta.parcelaAtual;

    const totalParcelas =
      dados.totalParcelas ?? conta.totalParcelas;

    if (parcelaAtual > totalParcelas) {
      throw new BadRequestException(
        'A parcela atual não pode ser maior que o total de parcelas',
      );
    }

    const valorOriginal =
      dados.valorOriginal ??
      Number(conta.valorOriginal);

    const valorDesconto =
      dados.valorDesconto ??
      Number(conta.valorDesconto);

    const valorJuros =
      dados.valorJuros ??
      Number(conta.valorJuros);

    const valorMulta =
      dados.valorMulta ??
      Number(conta.valorMulta);

    const valorAberto =
      this.calcularValorAberto(
        valorOriginal,
        valorDesconto,
        valorJuros,
        valorMulta,
        0,
      );

    if (valorAberto <= 0) {
      throw new BadRequestException(
        'O valor aberto precisa ser maior que zero',
      );
    }

    const dataVencimento =
      dados.dataVencimento
        ? new Date(dados.dataVencimento)
        : conta.dataVencimento;

    const status =
      this.determinarStatusInicial(
        dataVencimento,
      );

    return this.prisma.$transaction(
      async (tx) => {
        const atualizada =
          await tx.contaPagar.update({
            where: {
              id,
            },
            data: {
              descricao:
                dados.descricao?.trim(),
              documento:
                dados.documento?.trim(),
              observacao:
                dados.observacao?.trim(),

              dataEmissao: dados.dataEmissao
                ? new Date(dados.dataEmissao)
                : undefined,

              dataCompetencia:
                dados.dataCompetencia
                  ? new Date(
                      dados.dataCompetencia,
                    )
                  : undefined,

              dataVencimento,

              parcelaAtual,
              totalParcelas,

              valorOriginal,
              valorDesconto,
              valorJuros,
              valorMulta,
              valorAberto,
              status,

              fornecedorId,
              pedidoCompraId,
            },
            include: this.includeConta,
          });

        await this.registrarHistorico(
          id,
          'Conta a pagar atualizada.',
          usuario,
          tx,
        );

        return atualizada;
      },
    );
  }

  async registrarPagamento(
    id: string,
    dados: RegistrarPagamentoContaPagarDto,
    usuario: any,
  ) {
    const conta = await this.buscarPorId(
      id,
      usuario,
    );

    if (
      conta.status === StatusContaPagar.PAGA
    ) {
      throw new BadRequestException(
        'Esta conta já está paga',
      );
    }

    if (
      conta.status ===
      StatusContaPagar.CANCELADA
    ) {
      throw new BadRequestException(
        'Conta cancelada não pode receber pagamento',
      );
    }

    const valor = Number(dados.valor);
    const desconto = Number(
      dados.desconto ?? 0,
    );
    const juros = Number(dados.juros ?? 0);
    const multa = Number(dados.multa ?? 0);

    const saldoAjustado =
      Number(conta.valorAberto) +
      juros +
      multa -
      desconto;

    if (saldoAjustado <= 0) {
      throw new BadRequestException(
        'Os descontos informados são maiores que o saldo da conta',
      );
    }

    if (valor > saldoAjustado) {
      throw new BadRequestException(
        `O pagamento não pode ser maior que o saldo de R$ ${saldoAjustado.toFixed(
          2,
        )}`,
      );
    }

    const novoValorPago =
      Number(conta.valorPago) + valor;

    const novoValorDesconto =
      Number(conta.valorDesconto) + desconto;

    const novoValorJuros =
      Number(conta.valorJuros) + juros;

    const novoValorMulta =
      Number(conta.valorMulta) + multa;

    const novoValorAberto =
      Math.max(saldoAjustado - valor, 0);

    const contaQuitada =
      novoValorAberto < 0.005;

    const dataPagamento =
      dados.dataPagamento
        ? new Date(dados.dataPagamento)
        : new Date();

    return this.prisma.$transaction(
      async (tx) => {
        let caixa:
          | Awaited<
              ReturnType<
                typeof tx.caixa.findUnique
              >
            >
          | null = null;

        let aberturaCaixaId:
          | string
          | undefined;

        let movimentacaoCaixa: Awaited<ReturnType<typeof tx.movimentacaoCaixa.create>> | null = null;

        if (dados.caixaId) {
          caixa = await tx.caixa.findUnique({
            where: {
              id: dados.caixaId,
            },
          });

          if (!caixa) {
            throw new NotFoundException(
              'Caixa não encontrado',
            );
          }

          if (
            caixa.empresaId !==
            conta.empresaId
          ) {
            throw new ForbiddenException(
              'Caixa pertence a outra empresa',
            );
          }

          if (
            !caixa.ativo ||
            caixa.status !== StatusCaixa.ABERTO
          ) {
            throw new BadRequestException(
              'O caixa selecionado precisa estar ativo e aberto',
            );
          }

          const abertura =
            await tx.aberturaCaixa.findFirst({
              where: {
                caixaId: caixa.id,
                aberto: true,
              },

              orderBy: {
                dataAbertura: 'desc',
              },
            });

          if (!abertura) {
            throw new BadRequestException(
              'O caixa não possui uma abertura ativa',
            );
          }

          aberturaCaixaId = abertura.id;

          if (
            Number(caixa.saldoAtual) < valor
          ) {
            throw new BadRequestException(
              `Saldo insuficiente no caixa. Saldo disponível: R$ ${Number(
                caixa.saldoAtual,
              ).toFixed(2)}`,
            );
          }
        }

        const pagamento =
          await tx.pagamentoContaPagar.create({
            data: {
              valor,
              desconto,
              juros,
              multa,

              formaPagamento:
                dados.formaPagamento,

              dataPagamento,

              documento:
                dados.documento?.trim(),

              observacao:
                dados.observacao?.trim(),

              empresaId: conta.empresaId,
              contaPagarId: conta.id,

              usuarioId:
                this.obterUsuarioId(usuario),
            },

            include: {
              usuario: {
                select: this.usuarioSelect,
              },
            },
          });

        if (
          caixa &&
          aberturaCaixaId
        ) {
          const saldoAnterior = Number(
            caixa.saldoAtual,
          );

          const saldoPosterior =
            saldoAnterior - valor;

          movimentacaoCaixa =
            await tx.movimentacaoCaixa.create({
              data: {
                tipo:
                  TipoMovimentacaoCaixa.SAIDA,

                origem:
                  OrigemMovimentacaoCaixa
                    .CONTA_PAGAR,

                descricao:
                  `Pagamento da conta a pagar nº ${conta.numero} - ${conta.descricao}`,

                documento:
                  dados.documento?.trim() ||
                  conta.documento ||
                  undefined,

                observacao:
                  dados.observacao?.trim(),

                valor,
                saldoAnterior,
                saldoPosterior,
                dataMovimentacao:
                  dataPagamento,

                empresaId:
                  conta.empresaId,

                caixaId:
                  caixa.id,

                aberturaCaixaId,

                usuarioId:
                  this.obterUsuarioId(
                    usuario,
                  ),

                pagamentoContaPagarId:
                  pagamento.id,
              },
            });

          await tx.caixa.update({
            where: {
              id: caixa.id,
            },

            data: {
              saldoAtual:
                saldoPosterior,
            },
          });
        }

        const contaAtualizada =
          await tx.contaPagar.update({
            where: {
              id,
            },

            data: {
              valorPago: novoValorPago,

              valorDesconto:
                novoValorDesconto,

              valorJuros:
                novoValorJuros,

              valorMulta:
                novoValorMulta,

              valorAberto: contaQuitada
                ? 0
                : novoValorAberto,

              status: contaQuitada
                ? StatusContaPagar.PAGA
                : StatusContaPagar
                    .PARCIALMENTE_PAGA,

              dataPagamento: contaQuitada
                ? dataPagamento
                : null,
            },

            include: this.includeConta,
          });

        await this.registrarHistorico(
          id,

          contaQuitada
            ? `Conta quitada com pagamento de R$ ${valor.toFixed(
                2,
              )}${
                caixa
                  ? ` pelo caixa ${caixa.nome}.`
                  : '.'
              }`
            : `Pagamento parcial de R$ ${valor.toFixed(
                2,
              )} registrado${
                caixa
                  ? ` pelo caixa ${caixa.nome}.`
                  : '.'
              }`,

          usuario,
          tx,
        );

        return {
          pagamento,
          movimentacaoCaixa,
          conta: contaAtualizada,
        };
      },
    );
  }

  async cancelar(id: string, usuario: any) {
    const conta = await this.buscarPorId(
      id,
      usuario,
    );

    if (
      conta.status ===
      StatusContaPagar.CANCELADA
    ) {
      return conta;
    }

    if (
      conta.status === StatusContaPagar.PAGA
    ) {
      throw new BadRequestException(
        'Conta paga não pode ser cancelada',
      );
    }

    if (
      conta.pagamentos.length > 0 ||
      Number(conta.valorPago) > 0
    ) {
      throw new BadRequestException(
        'Conta com pagamentos não pode ser cancelada',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const cancelada =
          await tx.contaPagar.update({
            where: {
              id,
            },
            data: {
              status:
                StatusContaPagar.CANCELADA,
              dataCancelamento: new Date(),
              usuarioCancelamentoId:
                this.obterUsuarioId(usuario),
            },
            include: this.includeConta,
          });

        await this.registrarHistorico(
          id,
          'Conta a pagar cancelada.',
          usuario,
          tx,
        );

        return cancelada;
      },
    );
  }

  async gerarAPartirPedidoCompra(
    pedidoCompraId: string,
    dados: GerarContaPedidoCompraDto,
    usuario: any,
  ) {
    const empresaId = this.obterEmpresaId(usuario);

    const pedido = await this.validarPedidoCompra(
      pedidoCompraId,
      empresaId,
    );

    if (pedido.status !== 'RECEBIDO') {
      throw new BadRequestException(
        'Somente pedidos totalmente recebidos podem gerar conta a pagar',
      );
    }

    const contaExistente =
      await this.prisma.contaPagar.findFirst({
        where: {
          empresaId,
          pedidoCompraId,
          status: {
            not: StatusContaPagar.CANCELADA,
          },
        },
      });

    if (contaExistente) {
      throw new ConflictException(
        `O pedido de compra já possui a conta a pagar nº ${contaExistente.numero}`,
      );
    }

    await this.validarFornecedor(
      pedido.fornecedorId,
      empresaId,
    );

    const valorOriginal = Number(pedido.valorTotal);

    if (valorOriginal <= 0) {
      throw new BadRequestException(
        'O pedido precisa possuir valor total maior que zero',
      );
    }

    const dataVencimento = new Date(
      dados.dataVencimento,
    );

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const ultimaConta =
            await tx.contaPagar.findFirst({
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

          const numero =
            (ultimaConta?.numero ?? 0) + 1;

          const conta = await tx.contaPagar.create({
            data: {
              numero,

              descricao: `Pedido de compra nº ${pedido.numero}`,

              documento:
                dados.documento?.trim() ||
                `PEDIDO-COMPRA-${pedido.numero}`,

              observacao:
                dados.observacao?.trim() ||
                `Conta gerada a partir do pedido de compra nº ${pedido.numero}.`,

              origem: OrigemContaPagar.PEDIDO_COMPRA,

              status:
                this.determinarStatusInicial(
                  dataVencimento,
                ),

              dataEmissao: new Date(),

              dataCompetencia:
                dados.dataCompetencia
                  ? new Date(
                      dados.dataCompetencia,
                    )
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

              usuarioCriacaoId:
                this.obterUsuarioId(usuario),
            },

            include: this.includeConta,
          });

          await this.registrarHistorico(
            conta.id,
            `Conta a pagar nº ${numero} gerada a partir do pedido de compra nº ${pedido.numero}.`,
            usuario,
            tx,
          );

          return conta;
        },
      );
    } catch (error) {
      this.tratarErroPrisma(error);
    }
  }

  async adicionarHistorico(
    contaPagarId: string,
    dados: CriarContaPagarHistoricoDto,
    usuario: any,
  ) {
    await this.buscarPorId(
      contaPagarId,
      usuario,
    );

    return this.prisma.contaPagarHistorico.create({
      data: {
        contaPagarId,
        descricao: dados.descricao.trim(),
        usuarioId:
          this.obterUsuarioId(usuario),
      },
      include: {
        usuario: {
          select: this.usuarioSelect,
        },
      },
    });
  }

  async listarHistorico(
    contaPagarId: string,
    usuario: any,
  ) {
    await this.buscarPorId(
      contaPagarId,
      usuario,
    );

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