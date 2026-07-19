import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';

import {
  OrigemContaReceber,
  OrigemMovimentacaoCaixa,
  Prisma,
  StatusCaixa,
  StatusContaReceber,
  TipoMovimentacaoCaixa,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { VendasService } from '../vendas/vendas.service';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';

import { CriarContaReceberDto } from './dto/criar-conta-receber.dto';
import { AtualizarContaReceberDto } from './dto/atualizar-conta-receber.dto';
import { FiltroContasReceberDto } from './dto/filtro-contas-receber.dto';
import { RegistrarRecebimentoContaReceberDto } from './dto/registrar-recebimento-conta-receber.dto';
import { CriarContaReceberHistoricoDto } from './dto/criar-conta-receber-historico.dto';
import { GerarContaOrdemServicoDto } from './dto/gerar-conta-ordem-servico.dto';

@Injectable()
export class ContasReceberService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => VendasService))
    private readonly vendasService: VendasService,
  ) {}

  private readonly usuarioSelect = {
    id: true,
    nome: true,
    email: true,
    tipo: true,
  };

  private readonly includeConta = {
    cliente: true,

    ordemServico: {
      select: {
        id: true,
        numero: true,
        titulo: true,
        status: true,
      },
    },

    venda: {
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

    recebimentos: {
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
        dataRecebimento: 'desc' as const,
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

  private obterUsuarioId(
    usuario: any,
  ): string | undefined {
    return usuario.id ?? usuario.sub;
  }

  private inicioHoje(): Date {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return hoje;
  }

  private calcularValorAberto(
    valorOriginal: number,
    valorDesconto: number,
    valorJuros: number,
    valorMulta: number,
    valorRecebido: number,
  ): number {
    const valorAberto =
      valorOriginal +
      valorJuros +
      valorMulta -
      valorDesconto -
      valorRecebido;

    return Math.max(valorAberto, 0);
  }

  private determinarStatusInicial(
    dataVencimento: Date,
  ): StatusContaReceber {
    if (dataVencimento < this.inicioHoje()) {
      return StatusContaReceber.VENCIDA;
    }

    return StatusContaReceber.PENDENTE;
  }

  private tratarErroPrisma(error: unknown): never {
    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Conflito ao gerar a numeração da conta a receber',
      );
    }

    throw error;
  }

  private async atualizarContasVencidas(
    empresaId?: string,
  ) {
    const where: Prisma.ContaReceberWhereInput = {
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
    };

    if (empresaId) {
      where.empresaId = empresaId;
    }

    await this.prisma.contaReceber.updateMany({
      where,

      data: {
        status: StatusContaReceber.VENCIDA,
      },
    });
  }

  private async validarCliente(
    clienteId: string,
    empresaId: string,
  ) {
    const cliente =
      await this.prisma.cliente.findUnique({
        where: {
          id: clienteId,
        },
      });

    if (!cliente) {
      throw new NotFoundException(
        'Cliente não encontrado',
      );
    }

    if (cliente.empresaId !== empresaId) {
      throw new ForbiddenException(
        'Cliente pertence a outra empresa',
      );
    }

    if (!cliente.ativo) {
      throw new BadRequestException(
        'Não é possível utilizar um cliente inativo',
      );
    }

    return cliente;
  }

  private async validarOrdemServico(
    ordemServicoId: string,
    empresaId: string,
  ) {
    const ordem =
      await this.prisma.ordemServico.findUnique({
        where: {
          id: ordemServicoId,
        },

        include: {
          cliente: true,
        },
      });

    if (!ordem) {
      throw new NotFoundException(
        'Ordem de serviço não encontrada',
      );
    }

    if (ordem.empresaId !== empresaId) {
      throw new ForbiddenException(
        'Ordem de serviço pertence a outra empresa',
      );
    }

    return ordem;
  }

  private async registrarHistorico(
    contaReceberId: string,
    descricao: string,
    usuario: any,
    tx?: Prisma.TransactionClient,
  ) {
    const cliente = tx ?? this.prisma;

    return cliente.contaReceberHistorico.create({
      data: {
        contaReceberId,
        descricao,

        usuarioId:
          this.obterUsuarioId(usuario),
      },
    });
  }

  async criar(
    dados: CriarContaReceberDto,
    usuario: any,
  ) {
    const empresaId =
      this.obterEmpresaId(usuario);

    let clienteId = dados.clienteId;

    if (dados.ordemServicoId) {
      const ordem =
        await this.validarOrdemServico(
          dados.ordemServicoId,
          empresaId,
        );

      if (
        clienteId &&
        ordem.clienteId !== clienteId
      ) {
        throw new BadRequestException(
          'O cliente informado é diferente do cliente da ordem de serviço',
        );
      }

      clienteId =
        clienteId ?? ordem.clienteId;
    }

    if (clienteId) {
      await this.validarCliente(
        clienteId,
        empresaId,
      );
    }

    const parcelaAtual =
      dados.parcelaAtual ?? 1;

    const totalParcelas =
      dados.totalParcelas ?? 1;

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

    const valorJuros = Number(
      dados.valorJuros ?? 0,
    );

    const valorMulta = Number(
      dados.valorMulta ?? 0,
    );

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
            await tx.contaReceber.findFirst({
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

          const conta =
            await tx.contaReceber.create({
              data: {
                numero,

                descricao:
                  dados.descricao.trim(),

                documento:
                  dados.documento?.trim(),

                observacao:
                  dados.observacao?.trim(),

                origem:
                  dados.origem ??
                  (dados.ordemServicoId
                    ? OrigemContaReceber.ORDEM_SERVICO
                    : OrigemContaReceber.MANUAL),

                status:
                  this.determinarStatusInicial(
                    dataVencimento,
                  ),

                dataEmissao:
                  dados.dataEmissao
                    ? new Date(
                        dados.dataEmissao,
                      )
                    : new Date(),

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
                valorRecebido: 0,
                valorAberto,

                empresaId,
                clienteId,

                ordemServicoId:
                  dados.ordemServicoId,

                usuarioCriacaoId:
                  this.obterUsuarioId(
                    usuario,
                  ),
              },

              include: this.includeConta,
            });

          await this.registrarHistorico(
            conta.id,

            `Conta a receber nº ${numero} criada no valor de R$ ${valorOriginal.toFixed(
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
    filtros: FiltroContasReceberDto,
  ) {
    const empresaId =
      usuario.tipo === 'SUPER_ADMIN'
        ? undefined
        : usuario.empresaId;

    await this.atualizarContasVencidas(
      empresaId,
    );

    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 10;

    const { skip, take } =
      calcularPaginacao(page, limit);

    const where: Prisma.ContaReceberWhereInput =
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

    if (filtros.clienteId) {
      where.clienteId =
        filtros.clienteId;
    }

    if (filtros.ordemServicoId) {
      where.ordemServicoId =
        filtros.ordemServicoId;
    }

    if (filtros.vendaId) {
      where.vendaId = filtros.vendaId;
    }

    if (
      filtros.vencimentoInicio ||
      filtros.vencimentoFim
    ) {
      where.dataVencimento = {};

      if (filtros.vencimentoInicio) {
        where.dataVencimento.gte =
          new Date(
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

        where.dataVencimento.lte =
          dataFim;
      }
    }

    if (filtros.search) {
      const numero = Number(
        filtros.search,
      );

      where.OR = [
        {
          descricao: {
            contains: filtros.search,
            mode: 'insensitive',
          },
        },
        {
          documento: {
            contains: filtros.search,
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
          cliente: {
            nome: {
              contains: filtros.search,
              mode: 'insensitive',
            },
          },
        },
        {
          cliente: {
            documento: {
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

    const sortBy =
      camposOrdenacao.includes(
        filtros.sortBy ?? '',
      )
        ? filtros.sortBy
        : 'dataVencimento';

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.contaReceber.findMany({
          where,

          include: {
            cliente: true,

            ordemServico: {
              select: {
                id: true,
                numero: true,
                titulo: true,
                status: true,
              },
            },

            venda: {
              select: {
                id: true,
                numero: true,
                status: true,
                valorTotal: true,
              },
            },

            usuarioCriacao: {
              select: this.usuarioSelect,
            },

            _count: {
              select: {
                recebimentos: true,
              },
            },
          },

          orderBy: {
            [sortBy!]:
              filtros.order ?? 'asc',
          },

          skip,
          take,
        }),

        this.prisma.contaReceber.count({
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

  async buscarPorId(
    id: string,
    usuario: any,
  ) {
    await this.atualizarContasVencidas(
      usuario.tipo === 'SUPER_ADMIN'
        ? undefined
        : usuario.empresaId,
    );

    const conta =
      await this.prisma.contaReceber.findUnique({
        where: {
          id,
        },

        include: this.includeConta,
      });

    if (!conta) {
      throw new NotFoundException(
        'Conta a receber não encontrada',
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
    dados: AtualizarContaReceberDto,
    usuario: any,
  ) {
    const conta = await this.buscarPorId(
      id,
      usuario,
    );

    if (
      conta.status ===
        StatusContaReceber.RECEBIDA ||
      conta.status ===
        StatusContaReceber.CANCELADA
    ) {
      throw new BadRequestException(
        'Conta recebida ou cancelada não pode ser alterada',
      );
    }

    if (conta.recebimentos.length > 0) {
      throw new BadRequestException(
        'Conta com recebimentos registrados não pode ser alterada',
      );
    }

    const clienteId =
      dados.clienteId !== undefined
        ? dados.clienteId
        : conta.clienteId;

    const ordemServicoId =
      dados.ordemServicoId !== undefined
        ? dados.ordemServicoId
        : conta.ordemServicoId;

    if (clienteId) {
      await this.validarCliente(
        clienteId,
        conta.empresaId,
      );
    }

    if (ordemServicoId) {
      const ordem =
        await this.validarOrdemServico(
          ordemServicoId,
          conta.empresaId,
        );

      if (
        clienteId &&
        ordem.clienteId !== clienteId
      ) {
        throw new BadRequestException(
          'O cliente é diferente do cliente da ordem de serviço',
        );
      }
    }

    const parcelaAtual =
      dados.parcelaAtual ??
      conta.parcelaAtual;

    const totalParcelas =
      dados.totalParcelas ??
      conta.totalParcelas;

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
        ? new Date(
            dados.dataVencimento,
          )
        : conta.dataVencimento;

    const status =
      this.determinarStatusInicial(
        dataVencimento,
      );

    return this.prisma.$transaction(
      async (tx) => {
        const atualizada =
          await tx.contaReceber.update({
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

              dataEmissao:
                dados.dataEmissao
                  ? new Date(
                      dados.dataEmissao,
                    )
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

              clienteId,
              ordemServicoId,
            },

            include: this.includeConta,
          });

        await this.registrarHistorico(
          id,
          'Conta a receber atualizada.',
          usuario,
          tx,
        );

        return atualizada;
      },
    );
  }

  async registrarRecebimento(
    id: string,
    dados: RegistrarRecebimentoContaReceberDto,
    usuario: any,
  ) {
    const conta = await this.buscarPorId(
      id,
      usuario,
    );

    if (
      conta.status ===
      StatusContaReceber.RECEBIDA
    ) {
      throw new BadRequestException(
        'Esta conta já foi recebida',
      );
    }

    if (
      conta.status ===
      StatusContaReceber.CANCELADA
    ) {
      throw new BadRequestException(
        'Conta cancelada não pode receber valores',
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
        `O recebimento não pode ser maior que o saldo de R$ ${saldoAjustado.toFixed(
          2,
        )}`,
      );
    }

    const novoValorRecebido =
      Number(conta.valorRecebido) +
      valor;

    const novoValorDesconto =
      Number(conta.valorDesconto) +
      desconto;

    const novoValorJuros =
      Number(conta.valorJuros) + juros;

    const novoValorMulta =
      Number(conta.valorMulta) + multa;

    const novoValorAberto =
      Math.max(saldoAjustado - valor, 0);

    const contaQuitada =
      novoValorAberto < 0.005;

    const dataRecebimento =
      dados.dataRecebimento
        ? new Date(dados.dataRecebimento)
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
        }

        const recebimento =
          await tx.recebimentoContaReceber.create({
            data: {
              valor,
              desconto,
              juros,
              multa,

              formaRecebimento:
                dados.formaRecebimento,

              dataRecebimento,

              documento:
                dados.documento?.trim(),

              observacao:
                dados.observacao?.trim(),

              empresaId:
                conta.empresaId,

              contaReceberId:
                conta.id,

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
            saldoAnterior + valor;

          movimentacaoCaixa =
            await tx.movimentacaoCaixa.create({
              data: {
                tipo:
                  TipoMovimentacaoCaixa.ENTRADA,

                origem:
                  OrigemMovimentacaoCaixa
                    .CONTA_RECEBER,

                descricao:
                  `Recebimento da conta nº ${conta.numero} - ${conta.descricao}`,

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
                  dataRecebimento,

                empresaId:
                  conta.empresaId,

                caixaId:
                  caixa.id,

                aberturaCaixaId,

                usuarioId:
                  this.obterUsuarioId(
                    usuario,
                  ),

                recebimentoContaReceberId:
                  recebimento.id,
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
          await tx.contaReceber.update({
            where: {
              id,
            },

            data: {
              valorRecebido:
                novoValorRecebido,

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
                ? StatusContaReceber.RECEBIDA
                : StatusContaReceber
                    .PARCIALMENTE_RECEBIDA,

              dataRecebimento: contaQuitada
                ? dataRecebimento
                : null,
            },

            include: this.includeConta,
          });

        await this.registrarHistorico(
          id,

          contaQuitada
            ? `Conta quitada com recebimento de R$ ${valor.toFixed(
                2,
              )}${
                caixa
                  ? ` pelo caixa ${caixa.nome}.`
                  : '.'
              }`
            : `Recebimento parcial de R$ ${valor.toFixed(
                2,
              )} registrado${
                caixa
                  ? ` pelo caixa ${caixa.nome}.`
                  : '.'
              }`,

          usuario,
          tx,
        );

        // Chamar a conclusão da venda se houver venda vinculada
        if (contaAtualizada.vendaId) {
          await this.vendasService.concluirSeQuitada(
            contaAtualizada.vendaId,
            this.obterUsuarioId(usuario),
            tx,
          );
        }

        return {
          recebimento,
          movimentacaoCaixa,
          conta: contaAtualizada,
        };
      },
    );
  }

  async cancelar(
    id: string,
    usuario: any,
  ) {
    const conta = await this.buscarPorId(
      id,
      usuario,
    );

    if (
      conta.status ===
      StatusContaReceber.CANCELADA
    ) {
      return conta;
    }

    if (
      conta.status ===
      StatusContaReceber.RECEBIDA
    ) {
      throw new BadRequestException(
        'Conta recebida não pode ser cancelada',
      );
    }

    if (
      conta.recebimentos.length > 0 ||
      Number(conta.valorRecebido) > 0
    ) {
      throw new BadRequestException(
        'Conta com recebimentos não pode ser cancelada',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const cancelada =
          await tx.contaReceber.update({
            where: {
              id,
            },

            data: {
              status:
                StatusContaReceber.CANCELADA,

              dataCancelamento:
                new Date(),

              usuarioCancelamentoId:
                this.obterUsuarioId(
                  usuario,
                ),
            },

            include: this.includeConta,
          });

        await this.registrarHistorico(
          id,
          'Conta a receber cancelada.',
          usuario,
          tx,
        );

        return cancelada;
      },
    );
  }

  async gerarAPartirOrdemServico(
    ordemServicoId: string,
    dados: GerarContaOrdemServicoDto,
    usuario: any,
  ) {
    const empresaId =
      this.obterEmpresaId(usuario);

    const ordem =
      await this.validarOrdemServico(
        ordemServicoId,
        empresaId,
      );

    const statusPermitido = [
      'CONCLUIDA',
      'CONCLUÍDA',
      'FINALIZADA',
      'FINALIZADO',
    ].includes(
      ordem.status.toUpperCase(),
    );

    if (!statusPermitido) {
      throw new BadRequestException(
        'Somente ordens de serviço concluídas podem gerar conta a receber',
      );
    }

    const contaExistente =
      await this.prisma.contaReceber.findFirst({
        where: {
          empresaId,
          ordemServicoId,

          status: {
            not: StatusContaReceber.CANCELADA,
          },
        },
      });

    if (contaExistente) {
      throw new ConflictException(
        `A ordem de serviço já possui a conta a receber nº ${contaExistente.numero}`,
      );
    }

    await this.validarCliente(
      ordem.clienteId,
      empresaId,
    );

    const valorOriginal = Number(
      dados.valorOriginal,
    );

    const dataVencimento =
      new Date(dados.dataVencimento);

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const ultimaConta =
            await tx.contaReceber.findFirst({
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

          const conta =
            await tx.contaReceber.create({
              data: {
                numero,

                descricao:
                  `Ordem de serviço nº ${ordem.numero} - ${ordem.titulo}`,

                documento:
                  dados.documento?.trim() ||
                  `ORDEM-SERVICO-${ordem.numero}`,

                observacao:
                  dados.observacao?.trim() ||
                  `Conta gerada a partir da ordem de serviço nº ${ordem.numero}.`,

                origem:
                  OrigemContaReceber.ORDEM_SERVICO,

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
                valorRecebido: 0,
                valorAberto:
                  valorOriginal,

                empresaId,

                clienteId:
                  ordem.clienteId,

                ordemServicoId:
                  ordem.id,

                usuarioCriacaoId:
                  this.obterUsuarioId(
                    usuario,
                  ),
              },

              include: this.includeConta,
            });

          await this.registrarHistorico(
            conta.id,

            `Conta a receber nº ${numero} gerada a partir da ordem de serviço nº ${ordem.numero}.`,

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
    contaReceberId: string,
    dados: CriarContaReceberHistoricoDto,
    usuario: any,
  ) {
    await this.buscarPorId(
      contaReceberId,
      usuario,
    );

    return this.prisma.contaReceberHistorico.create({
      data: {
        contaReceberId,

        descricao:
          dados.descricao.trim(),

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
    contaReceberId: string,
    usuario: any,
  ) {
    await this.buscarPorId(
      contaReceberId,
      usuario,
    );

    return this.prisma.contaReceberHistorico.findMany({
      where: {
        contaReceberId,
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