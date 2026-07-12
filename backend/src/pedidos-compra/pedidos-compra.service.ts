import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Prisma,
  StatusItemPedidoCompra,
  StatusPedidoCompra,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';

import { CriarPedidoCompraDto } from './dto/criar-pedido-compra.dto';
import { AtualizarPedidoCompraDto } from './dto/atualizar-pedido-compra.dto';
import { FiltroPedidosCompraDto } from './dto/filtro-pedidos-compra.dto';
import { CriarPedidoCompraHistoricoDto } from './dto/criar-pedido-compra-historico.dto';
import { CriarItemPedidoCompraDto } from './dto/criar-item-pedido-compra.dto';
import { ReceberPedidoCompraDto } from './dto/receber-pedido-compra.dto';

@Injectable()
export class PedidosCompraService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly usuarioSelect = {
    id: true,
    nome: true,
    email: true,
    tipo: true,
  };

  private readonly includePedido = {
    fornecedor: true,
    deposito: true,

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

    usuarioRecebimento: {
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
      },
    },

    itens: {
      include: {
        produto: {
          include: {
            unidadeMedida: true,
            marca: true,
            categoria: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc' as const,
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
      take: 30,
    },
  };

  private obterEmpresaId(usuarioLogado: any): string {
    if (!usuarioLogado.empresaId) {
      throw new BadRequestException(
        'O usuário não possui empresa vinculada',
      );
    }

    return usuarioLogado.empresaId;
  }

  private obterUsuarioId(usuarioLogado: any): string | undefined {
    return usuarioLogado.id ?? usuarioLogado.sub;
  }

  private tratarErroPrisma(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Conflito ao gerar a numeração do pedido de compra',
      );
    }

    throw error;
  }

  private async validarFornecedor(
    fornecedorId: string,
    empresaId: string,
  ) {
    const fornecedor = await this.prisma.fornecedor.findUnique({
      where: {
        id: fornecedorId,
      },
    });

    if (!fornecedor) {
      throw new NotFoundException('Fornecedor não encontrado');
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

  private async validarDeposito(
    depositoId: string,
    empresaId: string,
  ) {
    const deposito = await this.prisma.deposito.findUnique({
      where: {
        id: depositoId,
      },
    });

    if (!deposito) {
      throw new NotFoundException('Depósito não encontrado');
    }

    if (deposito.empresaId !== empresaId) {
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
    itens: CriarItemPedidoCompraDto[],
    empresaId: string,
  ) {
    const produtoIds = itens.map((item) => item.produtoId);
    const produtosUnicos = new Set(produtoIds);

    if (produtosUnicos.size !== produtoIds.length) {
      throw new BadRequestException(
        'O mesmo produto não pode aparecer mais de uma vez no pedido',
      );
    }

    const produtos = await this.prisma.produto.findMany({
      where: {
        id: {
          in: produtoIds,
        },
      },
    });

    if (produtos.length !== produtoIds.length) {
      throw new NotFoundException(
        'Um ou mais produtos não foram encontrados',
      );
    }

    for (const produto of produtos) {
      if (produto.empresaId !== empresaId) {
        throw new ForbiddenException(
          `O produto "${produto.nome}" pertence a outra empresa`,
        );
      }

      if (!produto.ativo) {
        throw new BadRequestException(
          `O produto "${produto.nome}" está inativo`,
        );
      }
    }

    return produtos;
  }

  private calcularValoresItens(
    itens: CriarItemPedidoCompraDto[],
  ) {
    return itens.map((item) => {
      const quantidade = Number(item.quantidadeSolicitada);
      const valorUnitario = Number(item.valorUnitario);
      const valorDesconto = Number(item.valorDesconto ?? 0);

      const valorBruto = quantidade * valorUnitario;
      const valorTotal = valorBruto - valorDesconto;

      if (valorTotal < 0) {
        throw new BadRequestException(
          'O desconto do item não pode ser maior que seu valor bruto',
        );
      }

      return {
        produtoId: item.produtoId,
        quantidadeSolicitada: quantidade,
        quantidadeRecebida: 0,
        valorUnitario,
        valorDesconto,
        valorTotal,
        status: StatusItemPedidoCompra.PENDENTE,
      };
    });
  }

  private calcularTotais(
    itens: CriarItemPedidoCompraDto[],
    valorDescontoPedido = 0,
    valorFrete = 0,
    valorOutros = 0,
  ) {
    const itensCalculados = this.calcularValoresItens(itens);

    const valorProdutos = itensCalculados.reduce(
      (total, item) => total + item.valorTotal,
      0,
    );

    const descontoPedido = Number(valorDescontoPedido ?? 0);
    const frete = Number(valorFrete ?? 0);
    const outros = Number(valorOutros ?? 0);

    const valorTotal =
      valorProdutos - descontoPedido + frete + outros;

    if (valorTotal < 0) {
      throw new BadRequestException(
        'O desconto geral não pode tornar o valor total negativo',
      );
    }

    return {
      itensCalculados,
      valorProdutos,
      valorDesconto: descontoPedido,
      valorFrete: frete,
      valorOutros: outros,
      valorTotal,
    };
  }

  private async registrarHistorico(
    pedidoCompraId: string,
    descricao: string,
    usuarioLogado: any,
    tx?: Prisma.TransactionClient,
  ) {
    const cliente = tx ?? this.prisma;

    return cliente.pedidoCompraHistorico.create({
      data: {
        pedidoCompraId,
        descricao,
        usuarioId: this.obterUsuarioId(usuarioLogado),
      },
    });
  }

  async criar(
    dados: CriarPedidoCompraDto,
    usuarioLogado: any,
  ) {
    const empresaId = this.obterEmpresaId(usuarioLogado);

    await Promise.all([
      this.validarFornecedor(dados.fornecedorId, empresaId),
      this.validarDeposito(dados.depositoId, empresaId),
      this.validarProdutos(dados.itens, empresaId),
    ]);

    const totais = this.calcularTotais(
      dados.itens,
      dados.valorDesconto,
      dados.valorFrete,
      dados.valorOutros,
    );

    try {
      return await this.prisma.$transaction(async (tx) => {
        const ultimoPedido = await tx.pedidoCompra.findFirst({
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

        const numero = (ultimoPedido?.numero ?? 0) + 1;

        const pedido = await tx.pedidoCompra.create({
          data: {
            numero,
            status: StatusPedidoCompra.RASCUNHO,

            dataPrevistaEntrega: dados.dataPrevistaEntrega
              ? new Date(dados.dataPrevistaEntrega)
              : undefined,

            observacao: dados.observacao?.trim(),
            observacaoInterna:
              dados.observacaoInterna?.trim(),

            valorProdutos: totais.valorProdutos,
            valorDesconto: totais.valorDesconto,
            valorFrete: totais.valorFrete,
            valorOutros: totais.valorOutros,
            valorTotal: totais.valorTotal,

            empresaId,
            fornecedorId: dados.fornecedorId,
            depositoId: dados.depositoId,
            usuarioCriacaoId:
              this.obterUsuarioId(usuarioLogado),

            itens: {
              create: totais.itensCalculados,
            },
          },
          include: this.includePedido,
        });

        await this.registrarHistorico(
          pedido.id,
          `Pedido de compra nº ${numero} criado como rascunho.`,
          usuarioLogado,
          tx,
        );

        return pedido;
      });
    } catch (error) {
      this.tratarErroPrisma(error);
    }
  }

  async listar(
    usuarioLogado: any,
    filtros: FiltroPedidosCompraDto,
  ) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 10;
    const { skip, take } = calcularPaginacao(page, limit);

    const where: any =
      usuarioLogado.tipo === 'SUPER_ADMIN'
        ? {}
        : {
            empresaId: usuarioLogado.empresaId,
          };

    if (filtros.status) {
      where.status = filtros.status;
    }

    if (filtros.fornecedorId) {
      where.fornecedorId = filtros.fornecedorId;
    }

    if (filtros.depositoId) {
      where.depositoId = filtros.depositoId;
    }

    if (filtros.search) {
      const numeroPesquisado = Number(filtros.search);

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
        {
          fornecedor: {
            documento: {
              contains: filtros.search.replace(/\D/g, ''),
            },
          },
        },
      ];

      if (
        filtros.search.trim() &&
        !Number.isNaN(numeroPesquisado)
      ) {
        where.OR.push({
          numero: numeroPesquisado,
        });
      }
    }

    const camposOrdenacaoPermitidos = [
      'numero',
      'status',
      'dataPedido',
      'dataPrevistaEntrega',
      'valorTotal',
      'createdAt',
      'updatedAt',
    ];

    const sortBy = camposOrdenacaoPermitidos.includes(
      filtros.sortBy ?? '',
    )
      ? filtros.sortBy
      : 'createdAt';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.pedidoCompra.findMany({
        where,
        include: {
          fornecedor: true,
          deposito: true,

          usuarioCriacao: {
            select: this.usuarioSelect,
          },

          _count: {
            select: {
              itens: true,
            },
          },
        },
        orderBy: {
          [sortBy!]: filtros.order ?? 'desc',
        },
        skip,
        take,
      }),

      this.prisma.pedidoCompra.count({
        where,
      }),
    ]);

    return respostaPaginada(data, total, page, limit);
  }

  async buscarPorId(id: string, usuarioLogado: any) {
    const pedido = await this.prisma.pedidoCompra.findUnique({
      where: {
        id,
      },
      include: this.includePedido,
    });

    if (!pedido) {
      throw new NotFoundException(
        'Pedido de compra não encontrado',
      );
    }

    if (
      usuarioLogado.tipo !== 'SUPER_ADMIN' &&
      pedido.empresaId !== usuarioLogado.empresaId
    ) {
      throw new ForbiddenException(
        'Acesso negado a pedido de outra empresa',
      );
    }

    return pedido;
  }

  async atualizar(
    id: string,
    dados: AtualizarPedidoCompraDto,
    usuarioLogado: any,
  ) {
    const pedidoAtual = await this.buscarPorId(
      id,
      usuarioLogado,
    );

    if (pedidoAtual.status !== StatusPedidoCompra.RASCUNHO) {
      throw new BadRequestException(
        'Somente pedidos em rascunho podem ser alterados',
      );
    }

    const empresaId = pedidoAtual.empresaId;

    const fornecedorId =
      dados.fornecedorId ?? pedidoAtual.fornecedorId;

    const depositoId =
      dados.depositoId ?? pedidoAtual.depositoId;

    await Promise.all([
      this.validarFornecedor(fornecedorId, empresaId),
      this.validarDeposito(depositoId, empresaId),
    ]);

    const itens =
      dados.itens ??
      pedidoAtual.itens.map((item) => ({
        produtoId: item.produtoId,
        quantidadeSolicitada: Number(
          item.quantidadeSolicitada,
        ),
        valorUnitario: Number(item.valorUnitario),
        valorDesconto: Number(item.valorDesconto),
      }));

    await this.validarProdutos(itens, empresaId);

    const totais = this.calcularTotais(
      itens,
      dados.valorDesconto ??
        Number(pedidoAtual.valorDesconto),
      dados.valorFrete ?? Number(pedidoAtual.valorFrete),
      dados.valorOutros ?? Number(pedidoAtual.valorOutros),
    );

    return this.prisma.$transaction(async (tx) => {
      if (dados.itens) {
        await tx.pedidoCompraItem.deleteMany({
          where: {
            pedidoCompraId: id,
          },
        });
      }

      const pedidoAtualizado = await tx.pedidoCompra.update({
        where: {
          id,
        },
        data: {
          fornecedorId,
          depositoId,

          dataPrevistaEntrega:
            dados.dataPrevistaEntrega !== undefined
              ? new Date(dados.dataPrevistaEntrega)
              : undefined,

          observacao:
            dados.observacao !== undefined
              ? dados.observacao.trim()
              : undefined,

          observacaoInterna:
            dados.observacaoInterna !== undefined
              ? dados.observacaoInterna.trim()
              : undefined,

          valorProdutos: totais.valorProdutos,
          valorDesconto: totais.valorDesconto,
          valorFrete: totais.valorFrete,
          valorOutros: totais.valorOutros,
          valorTotal: totais.valorTotal,

          itens: dados.itens
            ? {
                create: totais.itensCalculados,
              }
            : undefined,
        },
        include: this.includePedido,
      });

      await this.registrarHistorico(
        id,
        'Pedido de compra atualizado.',
        usuarioLogado,
        tx,
      );

      return pedidoAtualizado;
    });
  }

  async enviarParaAprovacao(
    id: string,
    usuarioLogado: any,
  ) {
    const pedido = await this.buscarPorId(id, usuarioLogado);

    if (pedido.status !== StatusPedidoCompra.RASCUNHO) {
      throw new BadRequestException(
        'Somente pedidos em rascunho podem ser enviados para aprovação',
      );
    }

    if (pedido.itens.length === 0) {
      throw new BadRequestException(
        'O pedido precisa possuir ao menos um item',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const atualizado = await tx.pedidoCompra.update({
        where: {
          id,
        },
        data: {
          status: StatusPedidoCompra.PENDENTE_APROVACAO,
        },
        include: this.includePedido,
      });

      await this.registrarHistorico(
        id,
        'Pedido enviado para aprovação.',
        usuarioLogado,
        tx,
      );

      return atualizado;
    });
  }

  async aprovar(id: string, usuarioLogado: any) {
    const pedido = await this.buscarPorId(id, usuarioLogado);

    if (
      pedido.status !==
      StatusPedidoCompra.PENDENTE_APROVACAO
    ) {
      throw new BadRequestException(
        'Somente pedidos pendentes podem ser aprovados',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const atualizado = await tx.pedidoCompra.update({
        where: {
          id,
        },
        data: {
          status: StatusPedidoCompra.APROVADO,
          dataAprovacao: new Date(),
          usuarioAprovacaoId:
            this.obterUsuarioId(usuarioLogado),
        },
        include: this.includePedido,
      });

      await this.registrarHistorico(
        id,
        'Pedido de compra aprovado.',
        usuarioLogado,
        tx,
      );

      return atualizado;
    });
  }

  async cancelar(id: string, usuarioLogado: any) {
    const pedido = await this.buscarPorId(id, usuarioLogado);

    if (
      pedido.status === StatusPedidoCompra.RECEBIDO ||
      pedido.status ===
        StatusPedidoCompra.PARCIALMENTE_RECEBIDO
    ) {
      throw new BadRequestException(
        'Pedido com recebimento não pode ser cancelado',
      );
    }

    if (pedido.status === StatusPedidoCompra.CANCELADO) {
      return pedido;
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.pedidoCompraItem.updateMany({
        where: {
          pedidoCompraId: id,
        },
        data: {
          status: StatusItemPedidoCompra.CANCELADO,
        },
      });

      const atualizado = await tx.pedidoCompra.update({
        where: {
          id,
        },
        data: {
          status: StatusPedidoCompra.CANCELADO,
        },
        include: this.includePedido,
      });

      await this.registrarHistorico(
        id,
        'Pedido de compra cancelado.',
        usuarioLogado,
        tx,
      );

      return atualizado;
    });
  }

  async receber(
    id: string,
    dados: ReceberPedidoCompraDto,
    usuarioLogado: any,
  ) {
    const pedido = await this.buscarPorId(id, usuarioLogado);

    if (
      pedido.status !== StatusPedidoCompra.APROVADO &&
      pedido.status !==
        StatusPedidoCompra.PARCIALMENTE_RECEBIDO
    ) {
      throw new BadRequestException(
        'Somente pedidos aprovados ou parcialmente recebidos podem ser recebidos',
      );
    }

    const idsInformados = dados.itens.map(
      (item) => item.itemId,
    );

    if (new Set(idsInformados).size !== idsInformados.length) {
      throw new BadRequestException(
        'O mesmo item não pode ser informado mais de uma vez no recebimento',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const movimentacoesCriadas: any[] = [];

      for (const itemRecebimento of dados.itens) {
        const itemPedido = pedido.itens.find(
          (item) => item.id === itemRecebimento.itemId,
        );

        if (!itemPedido) {
          throw new NotFoundException(
            'Item não encontrado neste pedido de compra',
          );
        }

        if (
          itemPedido.status ===
          StatusItemPedidoCompra.CANCELADO
        ) {
          throw new BadRequestException(
            `O item "${itemPedido.produto.nome}" está cancelado`,
          );
        }

        if (
          itemPedido.status ===
          StatusItemPedidoCompra.RECEBIDO
        ) {
          throw new BadRequestException(
            `O item "${itemPedido.produto.nome}" já foi totalmente recebido`,
          );
        }

        const quantidadeSolicitada = Number(
          itemPedido.quantidadeSolicitada,
        );

        const quantidadeJaRecebida = Number(
          itemPedido.quantidadeRecebida,
        );

        const quantidadeDisponivel =
          quantidadeSolicitada - quantidadeJaRecebida;

        const quantidadeRecebidaAgora = Number(
          itemRecebimento.quantidadeRecebida,
        );

        if (quantidadeRecebidaAgora > quantidadeDisponivel) {
          throw new BadRequestException(
            `Quantidade recebida do produto "${itemPedido.produto.nome}" excede o saldo pendente de ${quantidadeDisponivel}`,
          );
        }

        const custoUnitario =
          itemRecebimento.custoUnitario !== undefined
            ? Number(itemRecebimento.custoUnitario)
            : Number(itemPedido.valorUnitario);

        let estoque = await tx.estoqueProduto.findFirst({
          where: {
            empresaId: pedido.empresaId,
            produtoId: itemPedido.produtoId,
            depositoId: pedido.depositoId,
          },
        });

        if (!estoque) {
          estoque = await tx.estoqueProduto.create({
            data: {
              empresaId: pedido.empresaId,
              produtoId: itemPedido.produtoId,
              depositoId: pedido.depositoId,
              quantidadeAtual: 0,
              estoqueMinimo:
                itemPedido.produto.estoqueMinimo,
              estoqueMaximo:
                itemPedido.produto.estoqueMaximo,
              custoMedio: 0,
              ultimoCusto: 0,
            },
          });
        }

        const saldoAnterior = Number(
          estoque.quantidadeAtual,
        );

        const saldoPosterior =
          saldoAnterior + quantidadeRecebidaAgora;

        const valorEstoqueAnterior =
          saldoAnterior * Number(estoque.custoMedio);

        const valorEntrada =
          quantidadeRecebidaAgora * custoUnitario;

        const custoMedio =
          saldoPosterior > 0
            ? (valorEstoqueAnterior + valorEntrada) /
              saldoPosterior
            : custoUnitario;

        await tx.estoqueProduto.update({
          where: {
            id: estoque.id,
          },
          data: {
            quantidadeAtual: saldoPosterior,
            custoMedio,
            ultimoCusto: custoUnitario,
          },
        });

        const novaQuantidadeRecebida =
          quantidadeJaRecebida +
          quantidadeRecebidaAgora;

        const novoStatusItem =
          novaQuantidadeRecebida >= quantidadeSolicitada
            ? StatusItemPedidoCompra.RECEBIDO
            : StatusItemPedidoCompra.PARCIALMENTE_RECEBIDO;

        await tx.pedidoCompraItem.update({
          where: {
            id: itemPedido.id,
          },
          data: {
            quantidadeRecebida: novaQuantidadeRecebida,
            status: novoStatusItem,
          },
        });

        const movimentacao =
          await tx.movimentacaoEstoque.create({
            data: {
              tipo: 'ENTRADA',
              quantidade: quantidadeRecebidaAgora,
              saldoAnterior,
              saldoPosterior,
              custoUnitario,
              documentoReferencia:
                dados.documentoReferencia ||
                `PEDIDO-COMPRA-${pedido.numero}`,
              observacao:
                dados.observacao ||
                `Recebimento do pedido de compra nº ${pedido.numero}`,
              empresaId: pedido.empresaId,
              produtoId: itemPedido.produtoId,
              depositoId: pedido.depositoId,
              usuarioId:
                this.obterUsuarioId(usuarioLogado),
            },
            include: {
              produto: true,
              deposito: true,
              usuario: {
                select: this.usuarioSelect,
              },
            },
          });

        movimentacoesCriadas.push(movimentacao);
      }

      const itensAtualizados =
        await tx.pedidoCompraItem.findMany({
          where: {
            pedidoCompraId: id,
          },
        });

      const todosRecebidos = itensAtualizados.every(
        (item) =>
          item.status === StatusItemPedidoCompra.RECEBIDO,
      );

      const algumRecebido = itensAtualizados.some(
        (item) =>
          Number(item.quantidadeRecebida) > 0,
      );

      const novoStatusPedido = todosRecebidos
        ? StatusPedidoCompra.RECEBIDO
        : algumRecebido
          ? StatusPedidoCompra.PARCIALMENTE_RECEBIDO
          : StatusPedidoCompra.APROVADO;

      const pedidoAtualizado =
        await tx.pedidoCompra.update({
          where: {
            id,
          },
          data: {
            status: novoStatusPedido,
            usuarioRecebimentoId:
              this.obterUsuarioId(usuarioLogado),
            dataRecebimento: todosRecebidos
              ? new Date()
              : null,
          },
          include: this.includePedido,
        });

      const descricaoHistorico = todosRecebidos
        ? 'Pedido de compra totalmente recebido.'
        : 'Recebimento parcial registrado no pedido de compra.';

      await this.registrarHistorico(
        id,
        descricaoHistorico,
        usuarioLogado,
        tx,
      );

      return {
        pedido: pedidoAtualizado,
        movimentacoes: movimentacoesCriadas,
      };
    });
  }

  async adicionarHistorico(
    pedidoCompraId: string,
    dados: CriarPedidoCompraHistoricoDto,
    usuarioLogado: any,
  ) {
    await this.buscarPorId(pedidoCompraId, usuarioLogado);

    return this.prisma.pedidoCompraHistorico.create({
      data: {
        pedidoCompraId,
        descricao: dados.descricao.trim(),
        usuarioId: this.obterUsuarioId(usuarioLogado),
      },
      include: {
        usuario: {
          select: this.usuarioSelect,
        },
      },
    });
  }

  async listarHistorico(
    pedidoCompraId: string,
    usuarioLogado: any,
  ) {
    await this.buscarPorId(pedidoCompraId, usuarioLogado);

    return this.prisma.pedidoCompraHistorico.findMany({
      where: {
        pedidoCompraId,
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