import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  CondicaoPagamentoVenda,
  OrigemContaReceber,
  Prisma,
  StatusContaReceber,
  StatusItemVenda,
  StatusVenda,
  TipoMovimentacaoEstoque,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';

import { CriarVendaDto } from './dto/criar-venda.dto';
import { AtualizarVendaDto } from './dto/atualizar-venda.dto';
import { FiltroVendasDto } from './dto/filtro-vendas.dto';
import { FiltroDashboardVendasDto } from './dto/filtro-dashboard-vendas.dto';
import { CriarVendaHistoricoDto } from './dto/criar-venda-historico.dto';
import { CriarVendaItemDto } from './dto/criar-venda-item.dto';
import { FaturarVendaDto } from './dto/faturar-venda.dto';
import { CancelarVendaDto } from './dto/cancelar-venda.dto';
import {
  bloquearEstoques,
  chaveLockEstoque,
} from '../estoque/estoque-transacional';

@Injectable()
export class VendasService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private readonly usuarioSelect = {
    id: true,
    nome: true,
    email: true,
    tipo: true,
  };

  private readonly includeVenda = {
    cliente: true,
    deposito: true,

    itens: {
      include: {
        produto: {
          include: {
            categoria: true,
            marca: true,
            unidadeMedida: true,
          },
        },
      },

      orderBy: {
        createdAt: 'asc' as const,
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

    usuarioAprovacao: {
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

    usuarioConclusao: {
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
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

      take: 100,
    },

    contasReceber: {
      orderBy: {
        parcelaAtual: 'asc' as const,
      },
    },
  };

  private obterEmpresaId(
    usuario: any,
  ): string {
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

  private tratarErroPrisma(
    error: unknown,
  ): never {
    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Conflito ao gerar a numeração ou salvar os itens da venda',
      );
    }

    throw error;
  }

  private isContaVendaParcelaDuplicada(
    error: unknown,
  ): boolean {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== 'P2002'
    ) {
      return false;
    }

    const target = error.meta?.target;

    if (Array.isArray(target)) {
      return (
        target.includes('vendaId') &&
        target.includes('parcelaAtual')
      );
    }

    return (
      typeof target === 'string' &&
      target.includes(
        'ContaReceber_vendaId_parcelaAtual_key',
      )
    );
  }

  private validarCondicaoPagamento(
    dados: {
      condicaoPagamento:
        CondicaoPagamentoVenda;

      formaPagamento?: any;

      quantidadeParcelas?: number;

      primeiroVencimento?: string;
    },
  ) {
    if (
      dados.condicaoPagamento ===
        CondicaoPagamentoVenda.AVISTA &&
      !dados.formaPagamento
    ) {
      throw new BadRequestException(
        'Venda à vista exige uma forma de pagamento',
      );
    }

    if (
      dados.condicaoPagamento ===
      CondicaoPagamentoVenda.APRAZO
    ) {
      if (
        !dados.quantidadeParcelas ||
        dados.quantidadeParcelas < 1
      ) {
        throw new BadRequestException(
          'Venda a prazo exige quantidade de parcelas',
        );
      }

      if (!dados.primeiroVencimento) {
        throw new BadRequestException(
          'Venda a prazo exige o primeiro vencimento',
        );
      }
    }
  }

  private validarItensDuplicados(
    itens: CriarVendaItemDto[],
  ) {
    const produtos = itens.map(
      (item) => item.produtoId,
    );

    const produtosUnicos =
      new Set(produtos);

    if (
      produtosUnicos.size !==
      produtos.length
    ) {
      throw new BadRequestException(
        'O mesmo produto não pode aparecer mais de uma vez na venda',
      );
    }
  }

  private calcularValores(
    itens: CriarVendaItemDto[],
    valoresGerais: {
      valorDesconto?: number;
      valorFrete?: number;
      valorOutros?: number;
    },
  ) {
    let valorProdutos = 0;

    const itensCalculados = itens.map(
      (item) => {
        const quantidade = Number(
          item.quantidade,
        );

        const valorUnitario = Number(
          item.valorUnitario,
        );

        const valorDesconto = Number(
          item.valorDesconto ?? 0,
        );

        const valorBruto =
          quantidade * valorUnitario;

        if (
          valorDesconto > valorBruto
        ) {
          throw new BadRequestException(
            'O desconto de um item não pode ser maior que seu valor bruto',
          );
        }

        const valorTotal =
          valorBruto - valorDesconto;

        valorProdutos += valorTotal;

        return {
          produtoId: item.produtoId,
          quantidade,
          valorUnitario,
          valorDesconto,
          valorTotal,

          observacao:
            item.observacao?.trim(),
        };
      },
    );

    const valorDesconto = Number(
      valoresGerais.valorDesconto ?? 0,
    );

    const valorFrete = Number(
      valoresGerais.valorFrete ?? 0,
    );

    const valorOutros = Number(
      valoresGerais.valorOutros ?? 0,
    );

    if (
      valorDesconto >
      valorProdutos +
        valorFrete +
        valorOutros
    ) {
      throw new BadRequestException(
        'O desconto geral não pode ser maior que o valor da venda',
      );
    }

    const valorTotal =
      valorProdutos -
      valorDesconto +
      valorFrete +
      valorOutros;

    if (valorTotal <= 0) {
      throw new BadRequestException(
        'O valor total da venda precisa ser maior que zero',
      );
    }

    return {
      itensCalculados,
      valorProdutos,
      valorDesconto,
      valorFrete,
      valorOutros,
      valorTotal,
    };
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

    if (
      cliente.empresaId !== empresaId
    ) {
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

  private async validarDeposito(
    depositoId: string,
    empresaId: string,
  ) {
    const deposito =
      await this.prisma.deposito.findUnique({
        where: {
          id: depositoId,
        },
      });

    if (!deposito) {
      throw new NotFoundException(
        'Depósito não encontrado',
      );
    }

    if (
      deposito.empresaId !== empresaId
    ) {
      throw new ForbiddenException(
        'Depósito pertence a outra empresa',
      );
    }

    if (!deposito.ativo) {
      throw new BadRequestException(
        'Não é possível utilizar um depósito inativo',
      );
    }

    return deposito;
  }

  private async validarProdutos(
    itens: CriarVendaItemDto[],
    empresaId: string,
  ) {
    this.validarItensDuplicados(itens);

    const ids = itens.map(
      (item) => item.produtoId,
    );

    const produtos =
      await this.prisma.produto.findMany({
        where: {
          id: {
            in: ids,
          },

          empresaId,
        },
      });

    if (
      produtos.length !== ids.length
    ) {
      throw new BadRequestException(
        'Um ou mais produtos não foram encontrados ou pertencem a outra empresa',
      );
    }

    const produtoInativo =
      produtos.find(
        (produto) => !produto.ativo,
      );

    if (produtoInativo) {
      throw new BadRequestException(
        `O produto "${produtoInativo.nome}" está inativo`,
      );
    }

    return produtos;
  }

  private async registrarHistorico(
    vendaId: string,
    descricao: string,
    usuario: any,
    tx?: Prisma.TransactionClient,
  ) {
    const cliente = tx ?? this.prisma;

    return cliente.vendaHistorico.create({
      data: {
        vendaId,
        descricao,

        usuarioId:
          this.obterUsuarioId(usuario),
      },
    });
  }

  async criar(
    dados: CriarVendaDto,
    usuario: any,
  ) {
    const empresaId =
      this.obterEmpresaId(usuario);

    this.validarCondicaoPagamento(
      dados,
    );

    await Promise.all([
      this.validarCliente(
        dados.clienteId,
        empresaId,
      ),

      this.validarDeposito(
        dados.depositoId,
        empresaId,
      ),

      this.validarProdutos(
        dados.itens,
        empresaId,
      ),
    ]);

    const valores =
      this.calcularValores(
        dados.itens,
        dados,
      );

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const ultimaVenda =
            await tx.venda.findFirst({
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
            (ultimaVenda?.numero ?? 0) +
            1;

          const venda =
            await tx.venda.create({
              data: {
                numero,

                status:
                  StatusVenda.RASCUNHO,

                dataVenda:
                  dados.dataVenda
                    ? new Date(
                        dados.dataVenda,
                      )
                    : new Date(),

                observacao:
                  dados.observacao?.trim(),

                observacaoInterna:
                  dados.observacaoInterna?.trim(),

                condicaoPagamento:
                  dados.condicaoPagamento,

                formaPagamento:
                  dados.formaPagamento,

                quantidadeParcelas:
                  dados.condicaoPagamento ===
                  CondicaoPagamentoVenda.AVISTA
                    ? 1
                    : dados.quantidadeParcelas ??
                      1,

                intervaloParcelas:
                  dados.intervaloParcelas ??
                  30,

                primeiroVencimento:
                  dados.primeiroVencimento
                    ? new Date(
                        dados.primeiroVencimento,
                      )
                    : undefined,

                valorProdutos:
                  valores.valorProdutos,

                valorDesconto:
                  valores.valorDesconto,

                valorFrete:
                  valores.valorFrete,

                valorOutros:
                  valores.valorOutros,

                valorTotal:
                  valores.valorTotal,

                empresaId,
                clienteId:
                  dados.clienteId,

                depositoId:
                  dados.depositoId,

                usuarioCriacaoId:
                  this.obterUsuarioId(
                    usuario,
                  ),

                itens: {
                  create:
                    valores.itensCalculados,
                },
              },

              include:
                this.includeVenda,
            });

          await this.registrarHistorico(
            venda.id,

            `Venda nº ${numero} criada em rascunho no valor de R$ ${valores.valorTotal.toFixed(
              2,
            )}.`,

            usuario,
            tx,
          );

          return venda;
        },
      );
    } catch (error) {
      this.tratarErroPrisma(error);
    }
  }

  async listar(
    usuario: any,
    filtros: FiltroVendasDto,
  ) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 10;

    const { skip, take } =
      calcularPaginacao(page, limit);

    const where: Prisma.VendaWhereInput =
      usuario.tipo === 'SUPER_ADMIN'
        ? {}
        : {
            empresaId: usuario.empresaId,
          };

    if (filtros.status) {
      where.status = filtros.status;
    }

    if (
      filtros.condicaoPagamento
    ) {
      where.condicaoPagamento =
        filtros.condicaoPagamento;
    }

    if (filtros.formaPagamento) {
      where.formaPagamento =
        filtros.formaPagamento;
    }

    if (filtros.clienteId) {
      where.clienteId =
        filtros.clienteId;
    }

    if (filtros.depositoId) {
      where.depositoId =
        filtros.depositoId;
    }

    if (
      filtros.dataInicio ||
      filtros.dataFim
    ) {
      where.dataVenda = {};

      if (filtros.dataInicio) {
        where.dataVenda.gte =
          new Date(
            filtros.dataInicio,
          );
      }

      if (filtros.dataFim) {
        const dataFim = new Date(
          filtros.dataFim,
        );

        dataFim.setUTCHours(
          23,
          59,
          59,
          999,
        );

        where.dataVenda.lte =
          dataFim;
      }
    }

    if (filtros.search) {
      const numero = Number(
        filtros.search,
      );

      where.OR = [
        {
          observacao: {
            contains: filtros.search,
            mode: 'insensitive',
          },
        },

        {
          observacaoInterna: {
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
      'status',
      'dataVenda',
      'valorProdutos',
      'valorTotal',
      'createdAt',
      'updatedAt',
    ];

    const sortBy =
      camposOrdenacao.includes(
        filtros.sortBy ?? '',
      )
        ? filtros.sortBy
        : 'dataVenda';

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.venda.findMany({
          where,

          include: {
            cliente: true,
            deposito: true,

            usuarioCriacao: {
              select: this.usuarioSelect,
            },

            _count: {
              select: {
                itens: true,
                contasReceber: true,
              },
            },
          },

          orderBy: {
            [sortBy!]:
              filtros.order ?? 'desc',
          },

          skip,
          take,
        }),

        this.prisma.venda.count({
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
    const venda =
      await this.prisma.venda.findUnique({
        where: {
          id,
        },

        include:
          this.includeVenda,
      });

    if (!venda) {
      throw new NotFoundException(
        'Venda não encontrada',
      );
    }

    if (
      usuario.tipo !== 'SUPER_ADMIN' &&
      venda.empresaId !==
        usuario.empresaId
    ) {
      throw new ForbiddenException(
        'Acesso negado a venda de outra empresa',
      );
    }

    return venda;
  }

  async atualizar(
    id: string,
    dados: AtualizarVendaDto,
    usuario: any,
  ) {
    const venda =
      await this.buscarPorId(
        id,
        usuario,
      );

    if (
      venda.status !==
      StatusVenda.RASCUNHO
    ) {
      throw new BadRequestException(
        'Somente vendas em rascunho podem ser alteradas',
      );
    }

    const clienteId =
      dados.clienteId ??
      venda.clienteId;

    const depositoId =
      dados.depositoId ??
      venda.depositoId;

    const condicaoPagamento =
      dados.condicaoPagamento ??
      venda.condicaoPagamento;

    const formaPagamento =
      dados.formaPagamento ??
      venda.formaPagamento ??
      undefined;

    const quantidadeParcelas =
      dados.quantidadeParcelas ??
      venda.quantidadeParcelas;

    const primeiroVencimento =
      dados.primeiroVencimento ??
      venda.primeiroVencimento
        ?.toISOString();

    this.validarCondicaoPagamento({
      condicaoPagamento,
      formaPagamento,
      quantidadeParcelas,
      primeiroVencimento,
    });

    await Promise.all([
      this.validarCliente(
        clienteId,
        venda.empresaId,
      ),

      this.validarDeposito(
        depositoId,
        venda.empresaId,
      ),
    ]);

    const itens =
      dados.itens ??
      venda.itens.map((item) => ({
        produtoId: item.produtoId,

        quantidade: Number(
          item.quantidade,
        ),

        valorUnitario: Number(
          item.valorUnitario,
        ),

        valorDesconto: Number(
          item.valorDesconto,
        ),

        observacao:
          item.observacao ?? undefined,
      }));

    await this.validarProdutos(
      itens,
      venda.empresaId,
    );

    const valores =
      this.calcularValores(itens, {
        valorDesconto:
          dados.valorDesconto ??
          Number(venda.valorDesconto),

        valorFrete:
          dados.valorFrete ??
          Number(venda.valorFrete),

        valorOutros:
          dados.valorOutros ??
          Number(venda.valorOutros),
      });

    return this.prisma.$transaction(
      async (tx) => {
        if (dados.itens) {
          await tx.vendaItem.deleteMany({
            where: {
              vendaId: id,
            },
          });
        }

        const atualizada =
          await tx.venda.update({
            where: {
              id,
            },

            data: {
              clienteId,
              depositoId,

              dataVenda:
                dados.dataVenda
                  ? new Date(
                      dados.dataVenda,
                    )
                  : undefined,

              observacao:
                dados.observacao !==
                undefined
                  ? dados.observacao.trim()
                  : undefined,

              observacaoInterna:
                dados.observacaoInterna !==
                undefined
                  ? dados.observacaoInterna.trim()
                  : undefined,

              condicaoPagamento,
              formaPagamento,

              quantidadeParcelas:
                condicaoPagamento ===
                CondicaoPagamentoVenda.AVISTA
                  ? 1
                  : quantidadeParcelas,

              intervaloParcelas:
                dados.intervaloParcelas ??
                venda.intervaloParcelas,

              primeiroVencimento:
                primeiroVencimento
                  ? new Date(
                      primeiroVencimento,
                    )
                  : null,

              valorProdutos:
                valores.valorProdutos,

              valorDesconto:
                valores.valorDesconto,

              valorFrete:
                valores.valorFrete,

              valorOutros:
                valores.valorOutros,

              valorTotal:
                valores.valorTotal,

              ...(dados.itens
                ? {
                    itens: {
                      create:
                        valores.itensCalculados,
                    },
                  }
                : {}),
            },

            include:
              this.includeVenda,
          });

        await this.registrarHistorico(
          id,
          'Venda atualizada.',
          usuario,
          tx,
        );

        return atualizada;
      },
    );
  }

  async enviarParaAprovacao(
    id: string,
    usuario: any,
  ) {
    const venda =
      await this.buscarPorId(
        id,
        usuario,
      );

    if (
      venda.status !==
      StatusVenda.RASCUNHO
    ) {
      throw new BadRequestException(
        'Somente vendas em rascunho podem ser enviadas para aprovação',
      );
    }

    if (venda.itens.length === 0) {
      throw new BadRequestException(
        'A venda precisa possuir pelo menos um item',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const atualizada =
          await tx.venda.update({
            where: {
              id,
            },

            data: {
              status:
                StatusVenda.PENDENTE,
            },

            include:
              this.includeVenda,
          });

        await this.registrarHistorico(
          id,
          'Venda enviada para aprovação.',
          usuario,
          tx,
        );

        return atualizada;
      },
    );
  }

  async aprovar(
    id: string,
    usuario: any,
  ) {
    const venda = await this.buscarPorId(
      id,
      usuario,
    );

    if (
      venda.status !==
      StatusVenda.PENDENTE
    ) {
      throw new BadRequestException(
        'Somente vendas pendentes podem ser aprovadas',
      );
    }

    if (!venda.cliente.ativo) {
      throw new BadRequestException(
        'O cliente da venda está inativo',
      );
    }

    if (!venda.deposito.ativo) {
      throw new BadRequestException(
        'O depósito da venda está inativo',
      );
    }

    const itensSemEstoque: string[] = [];

    for (const item of venda.itens) {
      if (!item.produto.ativo) {
        throw new BadRequestException(
          `O produto "${item.produto.nome}" está inativo`,
        );
      }

      const estoque =
        await this.prisma.estoqueProduto.findUnique({
          where: {
            empresaId_produtoId_depositoId: {
              empresaId: venda.empresaId,
              produtoId: item.produtoId,
              depositoId: venda.depositoId,
            },
          },
        });

      const quantidadeDisponivel = new Prisma.Decimal(
        estoque?.quantidadeAtual ?? 0,
      );

      const quantidadeSolicitada = new Prisma.Decimal(
        item.quantidade,
      );

      if (
        quantidadeDisponivel.lt(
          quantidadeSolicitada,
        )
      ) {
        itensSemEstoque.push(
          `${item.produto.nome}: solicitado ${quantidadeSolicitada.toString()}, disponível ${quantidadeDisponivel.toString()}`,
        );
      }
    }

    if (itensSemEstoque.length > 0) {
      throw new BadRequestException({
        message:
          'Estoque insuficiente para aprovar a venda',

        itens: itensSemEstoque,
      });
    }

    return this.prisma.$transaction(
      async (tx) => {
        const atualizada =
          await tx.venda.update({
            where: {
              id,
            },

            data: {
              status:
                StatusVenda.APROVADA,

              dataAprovacao:
                new Date(),

              usuarioAprovacaoId:
                this.obterUsuarioId(
                  usuario,
                ),
            },

            include:
              this.includeVenda,
          });

        await this.registrarHistorico(
          id,
          'Venda aprovada após validação do estoque.',
          usuario,
          tx,
        );

        return atualizada;
      },
    );
  }

  async faturar(
    id: string,
    dados: FaturarVendaDto,
    usuario: any,
  ) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const vendaMinima =
            await tx.venda.findUnique({
              where: {
                id,
              },

              select: {
                id: true,
                empresaId: true,
                status: true,
              },
            });

          if (!vendaMinima) {
            throw new NotFoundException(
              'Venda não encontrada',
            );
          }

          if (
            usuario.tipo !== 'SUPER_ADMIN' &&
            vendaMinima.empresaId !==
              usuario.empresaId
          ) {
            throw new ForbiddenException(
              'Acesso negado a venda de outra empresa',
            );
          }

          if (
            vendaMinima.status !==
            StatusVenda.APROVADA
          ) {
            throw new BadRequestException(
              'Somente vendas aprovadas podem ser faturadas',
            );
          }

          const dataFaturamento = new Date();
          const transicao =
            await tx.venda.updateMany({
              where: {
                id,
                empresaId:
                  vendaMinima.empresaId,
                status:
                  StatusVenda.APROVADA,
              },

              data: {
                status:
                  StatusVenda.FATURADA,
                dataFaturamento,
              },
            });

          if (transicao.count !== 1) {
            throw new BadRequestException(
              'A venda já foi faturada ou não está mais aprovada',
            );
          }

          const venda =
            await tx.venda.findUniqueOrThrow({
              where: {
                id,
                empresaId:
                  vendaMinima.empresaId,
              },

              include:
                this.includeVenda,
            });

          if (venda.itens.length === 0) {
            throw new BadRequestException(
              'A venda não possui itens para faturamento',
            );
          }

          /*
           * Venda à vista gera uma parcela.
           * Venda a prazo usa a quantidade configurada.
           */
          const totalParcelas =
            venda.condicaoPagamento ===
            CondicaoPagamentoVenda.AVISTA
              ? 1
              : venda.quantidadeParcelas;

          if (totalParcelas < 1) {
            throw new BadRequestException(
              'A quantidade de parcelas da venda é inválida',
            );
          }

          /*
           * Para venda a prazo, o vencimento já deve ter sido
           * informado na criação/edição.
           *
           * Para venda à vista, usamos:
           * 1. vencimento enviado no faturamento;
           * 2. vencimento salvo na venda;
           * 3. data atual.
           */
          const primeiroVencimentoTexto =
            dados.primeiroVencimento ??
            venda.primeiroVencimento?.toISOString();

          if (
            venda.condicaoPagamento ===
              CondicaoPagamentoVenda.APRAZO &&
            !primeiroVencimentoTexto
          ) {
            throw new BadRequestException(
              'Venda a prazo exige o primeiro vencimento',
            );
          }

          const primeiroVencimento =
            primeiroVencimentoTexto
              ? new Date(primeiroVencimentoTexto)
              : new Date();

          if (
            Number.isNaN(
              primeiroVencimento.getTime(),
            )
          ) {
            throw new BadRequestException(
              'A data do primeiro vencimento é inválida',
            );
          }

          const valorTotalCentavos = Math.round(
            Number(venda.valorTotal) * 100,
          );

          if (valorTotalCentavos <= 0) {
            throw new BadRequestException(
              'O valor total da venda precisa ser maior que zero',
            );
          }

          /*
           * Divisão em centavos evita diferenças de arredondamento.
           * Exemplo: R$ 100,00 / 3:
           * 33,34 + 33,33 + 33,33.
           */
          const valorBaseCentavos = Math.floor(
            valorTotalCentavos / totalParcelas,
          );

          const restoCentavos =
            valorTotalCentavos %
            totalParcelas;

          const contaExistente =
            await tx.contaReceber.findFirst({
              where: {
                vendaId: id,
                empresaId:
                  venda.empresaId,
              },

              select: {
                id: true,
              },
            });

          if (contaExistente) {
            throw new BadRequestException(
              'A venda já possui contas a receber geradas',
            );
          }

          await bloquearEstoques(
            tx,
            venda.itens.map((item) =>
              chaveLockEstoque(
                venda.empresaId,
                item.produtoId,
                venda.depositoId,
              ),
            ),
          );

          /*
           * A condição e o decremento são executados na mesma
           * instrução para impedir saldo negativo sob concorrência.
           */
          for (const item of venda.itens) {
            const quantidade = new Prisma.Decimal(
              item.quantidade,
            );

            const baixa =
              await tx.estoqueProduto.updateMany({
                where: {
                  empresaId:
                    venda.empresaId,

                  produtoId:
                    item.produtoId,

                  depositoId:
                    venda.depositoId,

                  quantidadeAtual: {
                    gte: quantidade,
                  },
                },

                data: {
                  quantidadeAtual: {
                    decrement: quantidade,
                  },
                },
              });

            if (baixa.count !== 1) {
              throw new BadRequestException(
                `Estoque insuficiente ou inválido para o produto "${item.produto.nome}"`,
              );
            }

            const estoque =
              await tx.estoqueProduto.findUniqueOrThrow({
                where: {
                  empresaId_produtoId_depositoId: {
                    empresaId:
                      venda.empresaId,

                    produtoId:
                      item.produtoId,

                    depositoId:
                      venda.depositoId,
                  },
                },
              });

            const saldoPosterior = new Prisma.Decimal(
              estoque.quantidadeAtual,
            );

            const saldoAnterior =
              saldoPosterior.plus(quantidade);

            await tx.movimentacaoEstoque.create({
              data: {
                tipo:
                  TipoMovimentacaoEstoque.SAIDA,

                quantidade,

                observacao:
                  `Saída automática referente à venda nº ${venda.numero}`,

                documentoReferencia:
                  dados.documento?.trim() ||
                  `VENDA-${venda.numero}`,

                saldoAnterior,
                saldoPosterior,

                custoUnitario:
                  estoque.custoMedio,

                empresaId:
                  venda.empresaId,

                produtoId:
                  item.produtoId,

                depositoId:
                  venda.depositoId,

                usuarioId:
                  this.obterUsuarioId(
                    usuario,
                  ),
              },
            });

            await tx.vendaItem.update({
              where: {
                id: item.id,
              },

              data: {
                status:
                  StatusItemVenda.ENTREGUE,
              },
            });
          }

          /*
           * Obtém uma única vez o último número.
           * As parcelas recebem números sequenciais.
           */
          const ultimaConta =
            await tx.contaReceber.findFirst({
              where: {
                empresaId:
                  venda.empresaId,
              },

              orderBy: {
                numero: 'desc',
              },

              select: {
                numero: true,
              },
            });

          const primeiroNumero =
            (ultimaConta?.numero ?? 0) + 1;

          const contasCriadas: Prisma.ContaReceberGetPayload<{}>[] = [];

          for (
            let indice = 0;
            indice < totalParcelas;
            indice++
          ) {
            const parcelaAtual = indice + 1;

            const centavosParcela =
              valorBaseCentavos +
              (indice < restoCentavos
                ? 1
                : 0);

            const valorParcela =
              centavosParcela / 100;

            const dataVencimento =
              new Date(primeiroVencimento);

            dataVencimento.setUTCDate(
              dataVencimento.getUTCDate() +
                indice *
                  venda.intervaloParcelas,
            );

            const hoje = new Date();

            hoje.setUTCHours(
              0,
              0,
              0,
              0,
            );

            const vencimentoComparacao =
              new Date(dataVencimento);

            vencimentoComparacao.setUTCHours(
              0,
              0,
              0,
              0,
            );

            const statusInicial =
              vencimentoComparacao < hoje
                ? StatusContaReceber.VENCIDA
                : StatusContaReceber.PENDENTE;

            const numero =
              primeiroNumero + indice;

            const descricao =
              totalParcelas === 1
                ? `Venda nº ${venda.numero}`
                : `Venda nº ${venda.numero} - parcela ${parcelaAtual}/${totalParcelas}`;

            const conta =
              await tx.contaReceber.create({
                data: {
                  numero,
                  descricao,

                  documento:
                    dados.documento?.trim() ||
                    `VENDA-${venda.numero}`,

                  observacao:
                    dados.observacao?.trim() ||
                    `Conta gerada automaticamente pelo faturamento da venda nº ${venda.numero}.`,

                  origem:
                    OrigemContaReceber.VENDA,

                  status:
                    statusInicial,

                  dataEmissao:
                    dataFaturamento,

                  dataCompetencia:
                    venda.dataVenda,

                  dataVencimento,

                  parcelaAtual,
                  totalParcelas,

                  valorOriginal:
                    valorParcela,

                  valorDesconto: 0,
                  valorJuros: 0,
                  valorMulta: 0,
                  valorRecebido: 0,

                  valorAberto:
                    valorParcela,

                  empresaId:
                    venda.empresaId,

                  clienteId:
                    venda.clienteId,

                  vendaId:
                    venda.id,

                  usuarioCriacaoId:
                    this.obterUsuarioId(
                      usuario,
                    ),
                },
              });

            await tx.contaReceberHistorico.create({
              data: {
                contaReceberId:
                  conta.id,

                descricao:
                  `Conta a receber nº ${numero} gerada automaticamente pela venda nº ${venda.numero}, parcela ${parcelaAtual}/${totalParcelas}.`,

                usuarioId:
                  this.obterUsuarioId(
                    usuario,
                  ),
              },
            });

            contasCriadas.push(conta);
          }

          /*
           * A venda somente passa para FATURADA depois
           * de todas as baixas e contas serem criadas.
           */
          const vendaAtualizada =
            await tx.venda.findUniqueOrThrow({
              where: {
                id,
                empresaId:
                  venda.empresaId,
              },

              include:
                this.includeVenda,
            });

          await this.registrarHistorico(
            id,

            `Venda faturada, estoque baixado no depósito ${venda.deposito.nome} e ${totalParcelas} conta(s) a receber gerada(s).`,

            usuario,
            tx,
          );

          return {
            venda: vendaAtualizada,
            contasReceber:
              contasCriadas,
          };
        },
      );
    } catch (error) {
      if (
        this.isContaVendaParcelaDuplicada(
          error,
        )
      ) {
        throw new ConflictException(
          'As contas a receber desta venda já foram geradas',
        );
      }

      throw error;
    }
  }

  async concluirSeQuitada(
    vendaId: string,
    usuarioId: string | undefined,
    tx?: Prisma.TransactionClient,
  ) {
    const prisma = tx ?? this.prisma;

    const venda = await prisma.venda.findUnique({
      where: {
        id: vendaId,
      },
      include: {
        contasReceber: {
          select: {
            id: true,
            numero: true,
            status: true,
            valorAberto: true,
          },
        },
      },
    });

    if (!venda) {
      throw new NotFoundException(
        'Venda não encontrada',
      );
    }

    if (
      venda.status === StatusVenda.CANCELADA ||
      venda.status === StatusVenda.CONCLUIDA
    ) {
      return venda;
    }

    if (
      venda.status !== StatusVenda.FATURADA
    ) {
      return venda;
    }

    if (venda.contasReceber.length === 0) {
      return venda;
    }

    const possuiContaEmAberto =
      venda.contasReceber.some((conta) => {
        const valorAberto = Number(
          conta.valorAberto,
        );

        return (
          conta.status !==
            StatusContaReceber.RECEBIDA ||
          valorAberto > 0
        );
      });

    if (possuiContaEmAberto) {
      return venda;
    }

    const dataConclusao = new Date();

    await prisma.venda.update({
      where: {
        id: vendaId,
      },
      data: {
        status: StatusVenda.CONCLUIDA,
        dataConclusao,
        ...(usuarioId ? { usuarioConclusaoId: usuarioId } : {}),
      },
    });

    await prisma.vendaHistorico.create({
      data: {
        vendaId,
        ...(usuarioId ? { usuarioId } : {}),
        descricao:
          'Venda concluída automaticamente após a quitação integral das contas a receber.',
      },
    });

    return prisma.venda.findUnique({
      where: {
        id: vendaId,
      },
      include: this.includeVenda,
    });
  }

  async dashboard(
    usuario: any,
    filtros: FiltroDashboardVendasDto,
  ) {
    const where: Prisma.VendaWhereInput =
      usuario.tipo === 'SUPER_ADMIN'
        ? {}
        : {
            empresaId: usuario.empresaId,
          };

    if (filtros.clienteId) {
      where.clienteId = filtros.clienteId;
    }

    if (filtros.depositoId) {
      where.depositoId = filtros.depositoId;
    }

    if (
      filtros.dataInicio ||
      filtros.dataFim
    ) {
      where.dataVenda = {};

      if (filtros.dataInicio) {
        const dataInicio = new Date(
          filtros.dataInicio,
        );

        dataInicio.setUTCHours(
          0,
          0,
          0,
          0,
        );

        where.dataVenda.gte =
          dataInicio;
      }

      if (filtros.dataFim) {
        const dataFim = new Date(
          filtros.dataFim,
        );

        dataFim.setUTCHours(
          23,
          59,
          59,
          999,
        );

        where.dataVenda.lte =
          dataFim;
      }
    }

    /*
     * Vendas canceladas não entram no faturamento.
     */
    const whereFinanceiro: Prisma.VendaWhereInput =
      {
        ...where,

        status: {
          in: [
            StatusVenda.FATURADA,
            StatusVenda.CONCLUIDA,
          ],
        },
      };

    const [
      totalVendas,
      totalRascunho,
      totalPendente,
      totalAprovada,
      totalFaturada,
      totalConcluida,
      totalCancelada,
      valores,
      vendasRecentes,
      itensVendidos,
      contasReceber,
    ] = await this.prisma.$transaction([
      this.prisma.venda.count({
        where,
      }),

      this.prisma.venda.count({
        where: {
          ...where,
          status: StatusVenda.RASCUNHO,
        },
      }),

      this.prisma.venda.count({
        where: {
          ...where,
          status: StatusVenda.PENDENTE,
        },
      }),

      this.prisma.venda.count({
        where: {
          ...where,
          status: StatusVenda.APROVADA,
        },
      }),

      this.prisma.venda.count({
        where: {
          ...where,
          status: StatusVenda.FATURADA,
        },
      }),

      this.prisma.venda.count({
        where: {
          ...where,
          status: StatusVenda.CONCLUIDA,
        },
      }),

      this.prisma.venda.count({
        where: {
          ...where,
          status: StatusVenda.CANCELADA,
        },
      }),

      this.prisma.venda.aggregate({
        where: whereFinanceiro,

        _sum: {
          valorTotal: true,
          valorProdutos: true,
          valorDesconto: true,
          valorFrete: true,
          valorOutros: true,
        },

        _avg: {
          valorTotal: true,
        },
      }),

      this.prisma.venda.findMany({
        where,

        select: {
          id: true,
          numero: true,
          status: true,
          dataVenda: true,
          valorTotal: true,

          cliente: {
            select: {
              id: true,
              nome: true,
            },
          },

          deposito: {
            select: {
              id: true,
              nome: true,
            },
          },
        },

        orderBy: {
          dataVenda: 'desc',
        },

        take: 10,
      }),

      this.prisma.vendaItem.findMany({
        where: {
          venda: whereFinanceiro,
        },

        select: {
          quantidade: true,
          valorTotal: true,

          produto: {
            select: {
              id: true,
              nome: true,
              codigo: true,
            },
          },
        },
      }),

      this.prisma.contaReceber.aggregate({
        where: {
          venda: whereFinanceiro,

          status: {
            not: StatusContaReceber.CANCELADA,
          },
        },

        _sum: {
          valorOriginal: true,
          valorRecebido: true,
          valorAberto: true,
        },

        _count: {
          id: true,
        },
      }),
    ]);

    /*
     * Agrupamento dos produtos em memória.
     * Isso evita depender de groupBy com relações.
     */
    const produtosAgrupados = new Map<
      string,
      {
        produtoId: string;
        nome: string;
        codigo: string | null;
        quantidadeVendida: number;
        valorVendido: number;
      }
    >();

    for (const item of itensVendidos) {
      const produtoId =
        item.produto.id;

      const atual =
        produtosAgrupados.get(
          produtoId,
        );

      const quantidade =
        Number(item.quantidade);

      const valor =
        Number(item.valorTotal);

      if (atual) {
        atual.quantidadeVendida +=
          quantidade;

        atual.valorVendido += valor;

        continue;
      }

      produtosAgrupados.set(
        produtoId,
        {
          produtoId,
          nome: item.produto.nome,
          codigo: item.produto.codigo,
          quantidadeVendida:
            quantidade,
          valorVendido: valor,
        },
      );
    }

    const produtosMaisVendidos = Array.from(
      produtosAgrupados.values(),
    )
      .sort(
        (a, b) =>
          b.quantidadeVendida -
          a.quantidadeVendida,
      )
      .slice(0, 10)
      .map((produto) => ({
        ...produto,

        quantidadeVendida:
          Number(
            produto.quantidadeVendida.toFixed(
              3,
            ),
          ),

        valorVendido:
          Number(
            produto.valorVendido.toFixed(
              2,
            ),
          ),
      }));

    const valorTotalVendido =
      Number(
        valores._sum.valorTotal ?? 0,
      );

    const ticketMedio =
      Number(
        valores._avg.valorTotal ?? 0,
      );

    const valorContasReceber =
      Number(
        contasReceber._sum
          .valorOriginal ?? 0,
      );

    const valorRecebido =
      Number(
        contasReceber._sum
          .valorRecebido ?? 0,
      );

    const valorEmAberto =
      Number(
        contasReceber._sum
          .valorAberto ?? 0,
      );

    return {
      periodo: {
        dataInicio:
          filtros.dataInicio ?? null,

        dataFim:
          filtros.dataFim ?? null,
      },

      indicadores: {
        totalVendas,

        valorTotalVendido:
          Number(
            valorTotalVendido.toFixed(2),
          ),

        ticketMedio:
          Number(
            ticketMedio.toFixed(2),
          ),

        valorProdutos:
          Number(
            Number(
              valores._sum
                .valorProdutos ?? 0,
            ).toFixed(2),
          ),

        valorDescontos:
          Number(
            Number(
              valores._sum
                .valorDesconto ?? 0,
            ).toFixed(2),
          ),

        valorFretes:
          Number(
            Number(
              valores._sum
                .valorFrete ?? 0,
            ).toFixed(2),
          ),

        valorOutros:
          Number(
            Number(
              valores._sum
                .valorOutros ?? 0,
            ).toFixed(2),
          ),
      },

      vendasPorStatus: {
        rascunho: totalRascunho,
        pendente: totalPendente,
        aprovada: totalAprovada,
        faturada: totalFaturada,
        concluida: totalConcluida,
        cancelada: totalCancelada,
      },

      financeiro: {
        quantidadeContas:
          contasReceber._count.id,

        valorContasReceber:
          Number(
            valorContasReceber.toFixed(
              2,
            ),
          ),

        valorRecebido:
          Number(
            valorRecebido.toFixed(2),
          ),

        valorEmAberto:
          Number(
            valorEmAberto.toFixed(2),
          ),

        percentualRecebido:
          valorContasReceber > 0
            ? Number(
                (
                  (valorRecebido /
                    valorContasReceber) *
                  100
                ).toFixed(2),
              )
            : 0,
      },

      produtosMaisVendidos,

      vendasRecentes,
    };
  }

  async cancelar(
    id: string,
    dados: CancelarVendaDto,
    usuario: any,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const vendaMinima =
          await tx.venda.findUnique({
            where: {
              id,
            },

            select: {
              id: true,
              empresaId: true,
              status: true,
            },
          });

        if (!vendaMinima) {
          throw new NotFoundException(
            'Venda não encontrada',
          );
        }

        if (
          usuario.tipo !== 'SUPER_ADMIN' &&
          vendaMinima.empresaId !==
            usuario.empresaId
        ) {
          throw new ForbiddenException(
            'Acesso negado a venda de outra empresa',
          );
        }

        if (
          vendaMinima.status === StatusVenda.CANCELADA
        ) {
          throw new BadRequestException(
            'A venda já está cancelada',
          );
        }

        if (
          vendaMinima.status === StatusVenda.CONCLUIDA
        ) {
          throw new BadRequestException(
            'Não é possível cancelar uma venda concluída',
          );
        }

        const statusAnterior =
          vendaMinima.status;
        const cancelavelSemEstorno =
          statusAnterior === StatusVenda.RASCUNHO ||
          statusAnterior === StatusVenda.PENDENTE ||
          statusAnterior === StatusVenda.APROVADA;

        if (
          !cancelavelSemEstorno &&
          statusAnterior !== StatusVenda.FATURADA
        ) {
          throw new BadRequestException(
            'O status atual da venda não permite cancelamento',
          );
        }

        const motivo =
          dados.motivo?.trim() ||
          'Cancelamento da venda';

        const dataCancelamento =
          new Date();

        const transicao =
          await tx.venda.updateMany({
            where: {
              id,
              empresaId:
                vendaMinima.empresaId,
              status:
                statusAnterior,
            },

            data: {
              status:
                StatusVenda.CANCELADA,

              dataCancelamento,

              usuarioCancelamentoId:
                this.obterUsuarioId(
                  usuario,
                ),
            },
          });

        if (transicao.count !== 1) {
          throw new BadRequestException(
            'A venda já foi cancelada ou não pode mais ser cancelada',
          );
        }

        const venda =
          await tx.venda.findUniqueOrThrow({
            where: {
              id,
              empresaId:
                vendaMinima.empresaId,
            },

            include:
              this.includeVenda,
          });

        if (cancelavelSemEstorno) {
          await tx.vendaItem.updateMany({
            where: {
              vendaId: id,
            },

            data: {
              status:
                StatusItemVenda.CANCELADO,
            },
          });

          await this.registrarHistorico(
            id,
            `Venda cancelada antes do faturamento. Motivo: ${motivo}`,
            usuario,
            tx,
          );

          return tx.venda.findUniqueOrThrow({
            where: {
              id,
              empresaId:
                venda.empresaId,
            },

            include:
              this.includeVenda,
          });
        }

        /*
         * As contas e os recebimentos são consultados no
         * mesmo contexto transacional da mudança de status.
         */
        const contasReceber =
          await tx.contaReceber.findMany({
            where: {
              vendaId: id,
              empresaId:
                venda.empresaId,
            },

            include: {
              recebimentos: {
                select: {
                  id: true,
                  valor: true,
                },
              },
            },

            orderBy: {
              parcelaAtual: 'asc',
            },
          });

        const contaComRecebimento =
          contasReceber.find((conta) => {
            const valorRecebido = Number(
              conta.valorRecebido,
            );

            return (
              valorRecebido > 0 ||
              conta.recebimentos.length > 0 ||
              conta.status ===
                StatusContaReceber.PARCIALMENTE_RECEBIDA ||
              conta.status ===
                StatusContaReceber.RECEBIDA
            );
          });

        if (contaComRecebimento) {
          throw new BadRequestException(
            `Não é possível cancelar a venda porque a conta a receber nº ${contaComRecebimento.numero} possui recebimento registrado`,
          );
        }

        await bloquearEstoques(
          tx,
          venda.itens.map((item) =>
            chaveLockEstoque(
              venda.empresaId,
              item.produtoId,
              venda.depositoId,
            ),
          ),
        );

        /*
         * O incremento atômico ocorre somente depois que esta
         * transação conquistou a mudança para CANCELADA.
         */
        for (const item of venda.itens) {
          const quantidade = new Prisma.Decimal(
            item.quantidade,
          );

          const devolucao =
            await tx.estoqueProduto.updateMany({
              where: {
                empresaId:
                  venda.empresaId,

                produtoId:
                  item.produtoId,

                depositoId:
                  venda.depositoId,
              },

              data: {
                quantidadeAtual: {
                  increment: quantidade,
                },
              },
            });

          if (devolucao.count !== 1) {
            throw new BadRequestException(
              `O estoque do produto "${item.produto.nome}" não foi encontrado para realizar o estorno`,
            );
          }

          const estoque =
            await tx.estoqueProduto.findUniqueOrThrow({
              where: {
                empresaId_produtoId_depositoId: {
                  empresaId:
                    venda.empresaId,

                  produtoId:
                    item.produtoId,

                  depositoId:
                    venda.depositoId,
                },
              },
            });

          const saldoPosterior = new Prisma.Decimal(
            estoque.quantidadeAtual,
          );

          const saldoAnterior =
            saldoPosterior.minus(quantidade);

          await tx.movimentacaoEstoque.create({
            data: {
              tipo:
                TipoMovimentacaoEstoque.ENTRADA,

              quantidade,

              observacao:
                `Estorno automático do cancelamento da venda nº ${venda.numero}`,

              documentoReferencia:
                `CANCELAMENTO-VENDA-${venda.numero}`,

              saldoAnterior,
              saldoPosterior,

              custoUnitario:
                estoque.custoMedio,

              empresaId:
                venda.empresaId,

              produtoId:
                item.produtoId,

              depositoId:
                venda.depositoId,

              usuarioId:
                this.obterUsuarioId(
                  usuario,
                ),
            },
          });

          await tx.vendaItem.update({
            where: {
              id: item.id,
            },

            data: {
              status:
                StatusItemVenda.CANCELADO,
            },
          });
        }

        for (const conta of contasReceber) {
          if (
            conta.status ===
            StatusContaReceber.CANCELADA
          ) {
            continue;
          }

          await tx.contaReceber.update({
            where: {
              id: conta.id,
            },

            data: {
              status:
                StatusContaReceber.CANCELADA,

              dataCancelamento,

              usuarioCancelamentoId:
                this.obterUsuarioId(
                  usuario,
                ),

              valorAberto: 0,
            },
          });

          await tx.contaReceberHistorico.create({
            data: {
              contaReceberId:
                conta.id,

              descricao:
                `Conta a receber nº ${conta.numero} cancelada automaticamente devido ao cancelamento da venda nº ${venda.numero}. Motivo: ${motivo}`,

              usuarioId:
                this.obterUsuarioId(
                  usuario,
                ),
            },
          });
        }

        await this.registrarHistorico(
          id,

          `Venda faturada cancelada, estoque estornado e ${contasReceber.length} conta(s) a receber cancelada(s). Motivo: ${motivo}`,

          usuario,
          tx,
        );

        return tx.venda.findUniqueOrThrow({
          where: {
            id,
            empresaId:
              venda.empresaId,
          },

          include:
            this.includeVenda,
        });
      },
    );
  }

  async adicionarHistorico(
    vendaId: string,
    dados: CriarVendaHistoricoDto,
    usuario: any,
  ) {
    await this.buscarPorId(
      vendaId,
      usuario,
    );

    return this.prisma.vendaHistorico.create({
      data: {
        vendaId,

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
    vendaId: string,
    usuario: any,
  ) {
    await this.buscarPorId(
      vendaId,
      usuario,
    );

    return this.prisma.vendaHistorico.findMany({
      where: {
        vendaId,
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
