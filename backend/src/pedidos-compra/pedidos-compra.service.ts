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
import { paraDecimalMonetario } from '../contas-pagar/valor-monetario';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

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

  private obterUsuarioId(usuarioLogado: AuthenticatedUser): string {
    return usuarioLogado.id;
  }

  private tratarErroPrisma(error: unknown): never {
    if (
      this.alvoP2002(
        error,
        ['empresaId', 'numero'],
        'PedidoCompra_empresaId_numero_key',
      )
    ) {
      throw new ConflictException(
        'Conflito ao gerar a numeração do pedido de compra',
      );
    }
    throw error;
  }

  private alvoP2002(error: unknown, campos: string[], indice: string): boolean {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== 'P2002'
    ) {
      return false;
    }
    const target = error.meta?.target;
    return Array.isArray(target)
      ? campos.every((campo) => target.includes(campo))
      : typeof target === 'string' && target.includes(indice);
  }
  private async bloquearPedido(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "PedidoCompra" WHERE "id" = ${id} FOR UPDATE`,
    );
  }

  private async buscarPedidoBloqueado(
    tx: Prisma.TransactionClient,
    empresaId: string,
    id: string,
  ) {
    await this.bloquearPedido(tx, id);
    const pedido = await tx.pedidoCompra.findFirst({
      where: { id, empresaId },
      include: this.includePedido,
    });
    if (!pedido) {
      throw new NotFoundException('Pedido de compra não encontrado');
    }
    return pedido;
  }
  private async bloquearEstoque(
    tx: Prisma.TransactionClient,
    empresaId: string,
    produtoId: string,
    depositoId: string,
  ) {
    const chave = `${empresaId}:${produtoId}:${depositoId}`;
    await tx.$queryRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${chave}, 0))`,
    );
  }

  private async validarFornecedor(
    tx: Prisma.TransactionClient,
    fornecedorId: string,
    empresaId: string,
  ) {
    const fornecedor = await tx.fornecedor.findUnique({
      where: {
        id: fornecedorId,
      },
    });

    if (!fornecedor) {
      throw new NotFoundException('Fornecedor não encontrado');
    }

    if (fornecedor.empresaId !== empresaId) {
      throw new ForbiddenException('Fornecedor pertence a outra empresa');
    }

    if (!fornecedor.ativo) {
      throw new BadRequestException(
        'Não é possível utilizar um fornecedor inativo',
      );
    }

    return fornecedor;
  }

  private async validarDeposito(
    tx: Prisma.TransactionClient,
    depositoId: string,
    empresaId: string,
  ) {
    const deposito = await tx.deposito.findUnique({
      where: {
        id: depositoId,
      },
    });

    if (!deposito) {
      throw new NotFoundException('Depósito não encontrado');
    }

    if (deposito.empresaId !== empresaId) {
      throw new ForbiddenException('Depósito pertence a outra empresa');
    }

    if (!deposito.ativo) {
      throw new BadRequestException(
        'Não é possível utilizar um depósito inativo',
      );
    }

    return deposito;
  }

  private async validarProdutos(
    tx: Prisma.TransactionClient,
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

    const produtos = await tx.produto.findMany({
      where: {
        id: {
          in: produtoIds,
        },
      },
    });

    if (produtos.length !== produtoIds.length) {
      throw new NotFoundException('Um ou mais produtos não foram encontrados');
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

  private calcularValoresItens(itens: CriarItemPedidoCompraDto[]) {
    return itens.map((item) => {
      const quantidade = new Prisma.Decimal(item.quantidadeSolicitada);
      const valorUnitario = paraDecimalMonetario(
        item.valorUnitario,
        'O valor unitário',
      );
      const valorDesconto = paraDecimalMonetario(
        item.valorDesconto ?? 0,
        'O desconto do item',
      );

      const valorBruto = quantidade.mul(valorUnitario);
      const valorTotal = valorBruto.minus(valorDesconto);

      if (valorTotal.lt(0)) {
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
    valorDescontoPedido: Prisma.Decimal.Value = 0,
    valorFrete: Prisma.Decimal.Value = 0,
    valorOutros: Prisma.Decimal.Value = 0,
  ) {
    const itensCalculados = this.calcularValoresItens(itens);

    const valorProdutos = itensCalculados.reduce(
      (total, item) => total.plus(item.valorTotal),
      new Prisma.Decimal(0),
    );

    const descontoPedido = paraDecimalMonetario(
      valorDescontoPedido ?? 0,
      'O desconto geral',
    );
    const frete = paraDecimalMonetario(valorFrete ?? 0, 'O frete');
    const outros = paraDecimalMonetario(valorOutros ?? 0, 'Os outros valores');

    const valorTotal = valorProdutos
      .minus(descontoPedido)
      .plus(frete)
      .plus(outros);

    if (valorTotal.lt(0)) {
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
    tx: Prisma.TransactionClient,
    pedidoCompraId: string,
    descricao: string,
    usuarioLogado: AuthenticatedUser,
  ) {
    return tx.pedidoCompraHistorico.create({
      data: {
        pedidoCompraId,
        descricao,
        usuarioId: this.obterUsuarioId(usuarioLogado),
      },
    });
  }

  async criar(
    empresaId: string,
    dados: CriarPedidoCompraDto,
    usuarioLogado: AuthenticatedUser,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await Promise.all([
          this.validarFornecedor(tx, dados.fornecedorId, empresaId),
          this.validarDeposito(tx, dados.depositoId, empresaId),
          this.validarProdutos(tx, dados.itens, empresaId),
        ]);

        const totais = this.calcularTotais(
          dados.itens,
          dados.valorDesconto,
          dados.valorFrete,
          dados.valorOutros,
        );
        const ultimoPedido = await tx.pedidoCompra.findFirst({
          where: { empresaId },
          orderBy: { numero: 'desc' },
          select: { numero: true },
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
            observacaoInterna: dados.observacaoInterna?.trim(),
            valorProdutos: totais.valorProdutos,
            valorDesconto: totais.valorDesconto,
            valorFrete: totais.valorFrete,
            valorOutros: totais.valorOutros,
            valorTotal: totais.valorTotal,
            empresaId,
            fornecedorId: dados.fornecedorId,
            depositoId: dados.depositoId,
            usuarioCriacaoId: this.obterUsuarioId(usuarioLogado),
            itens: { create: totais.itensCalculados },
          },
          include: this.includePedido,
        });
        await this.registrarHistorico(
          tx,
          pedido.id,
          `Pedido de compra nº ${numero} criado como rascunho.`,
          usuarioLogado,
        );
        return pedido;
      });
    } catch (error) {
      this.tratarErroPrisma(error);
    }
  }
  async listar(empresaId: string, filtros: FiltroPedidosCompraDto) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 10;
    const { skip, take } = calcularPaginacao(page, limit);

    const where: Prisma.PedidoCompraWhereInput = { empresaId };

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

      if (filtros.search.trim() && !Number.isNaN(numeroPesquisado)) {
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

    const sortBy = camposOrdenacaoPermitidos.includes(filtros.sortBy ?? '')
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

  async buscarPorId(empresaId: string, id: string) {
    const pedido = await this.prisma.pedidoCompra.findFirst({
      where: {
        id,
        empresaId,
      },
      include: this.includePedido,
    });

    if (!pedido) {
      throw new NotFoundException('Pedido de compra não encontrado');
    }

    return pedido;
  }

  async atualizar(
    empresaId: string,
    id: string,
    dados: AtualizarPedidoCompraDto,
    usuarioLogado: AuthenticatedUser,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const pedidoAtual = await this.buscarPedidoBloqueado(tx, empresaId, id);
      if (pedidoAtual.status !== StatusPedidoCompra.RASCUNHO) {
        throw new BadRequestException(
          'Somente pedidos em rascunho podem ser alterados',
        );
      }

      const fornecedorId = dados.fornecedorId ?? pedidoAtual.fornecedorId;
      const depositoId = dados.depositoId ?? pedidoAtual.depositoId;
      const itens: CriarItemPedidoCompraDto[] =
        dados.itens ??
        pedidoAtual.itens.map((item) => ({
          produtoId: item.produtoId,
          quantidadeSolicitada: item.quantidadeSolicitada as unknown as number,
          valorUnitario: item.valorUnitario as unknown as number,
          valorDesconto: item.valorDesconto as unknown as number,
        }));

      await Promise.all([
        this.validarFornecedor(tx, fornecedorId, empresaId),
        this.validarDeposito(tx, depositoId, empresaId),
        this.validarProdutos(tx, itens, empresaId),
      ]);
      const totais = this.calcularTotais(
        itens,
        dados.valorDesconto ?? pedidoAtual.valorDesconto,
        dados.valorFrete ?? pedidoAtual.valorFrete,
        dados.valorOutros ?? pedidoAtual.valorOutros,
      );

      if (dados.itens) {
        await tx.pedidoCompraItem.deleteMany({ where: { pedidoCompraId: id } });
      }
      const transicao = await tx.pedidoCompra.updateMany({
        where: { id, empresaId, status: StatusPedidoCompra.RASCUNHO },
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
        },
      });
      if (transicao.count !== 1) {
        throw new ConflictException(
          'O pedido foi alterado e não pode mais ser atualizado',
        );
      }
      if (dados.itens) {
        await tx.pedidoCompraItem.createMany({
          data: totais.itensCalculados.map((item) => ({
            ...item,
            pedidoCompraId: id,
          })),
        });
      }
      await this.registrarHistorico(
        tx,
        id,
        'Pedido de compra atualizado.',
        usuarioLogado,
      );
      return tx.pedidoCompra.findUniqueOrThrow({
        where: { id },
        include: this.includePedido,
      });
    });
  }

  async enviarParaAprovacao(
    empresaId: string,
    id: string,
    usuarioLogado: AuthenticatedUser,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const pedido = await this.buscarPedidoBloqueado(tx, empresaId, id);
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
      const transicao = await tx.pedidoCompra.updateMany({
        where: {
          id,
          empresaId: pedido.empresaId,
          status: StatusPedidoCompra.RASCUNHO,
        },
        data: { status: StatusPedidoCompra.PENDENTE_APROVACAO },
      });
      if (transicao.count !== 1) {
        throw new ConflictException(
          'O pedido foi alterado e não pode ser enviado para aprovação',
        );
      }
      await this.registrarHistorico(
        tx,
        id,
        'Pedido enviado para aprovação.',
        usuarioLogado,
      );
      return tx.pedidoCompra.findUniqueOrThrow({
        where: { id },
        include: this.includePedido,
      });
    });
  }

  async aprovar(
    empresaId: string,
    id: string,
    usuarioLogado: AuthenticatedUser,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const pedido = await this.buscarPedidoBloqueado(tx, empresaId, id);
      if (pedido.status !== StatusPedidoCompra.PENDENTE_APROVACAO) {
        throw new BadRequestException(
          'Somente pedidos pendentes podem ser aprovados',
        );
      }
      const transicao = await tx.pedidoCompra.updateMany({
        where: {
          id,
          empresaId: pedido.empresaId,
          status: StatusPedidoCompra.PENDENTE_APROVACAO,
        },
        data: {
          status: StatusPedidoCompra.APROVADO,
          dataAprovacao: new Date(),
          usuarioAprovacaoId: this.obterUsuarioId(usuarioLogado),
        },
      });
      if (transicao.count !== 1) {
        throw new ConflictException(
          'O pedido foi alterado e não pode mais ser aprovado',
        );
      }
      await this.registrarHistorico(
        tx,
        id,
        'Pedido de compra aprovado.',
        usuarioLogado,
      );
      return tx.pedidoCompra.findUniqueOrThrow({
        where: { id },
        include: this.includePedido,
      });
    });
  }

  async cancelar(
    empresaId: string,
    id: string,
    usuarioLogado: AuthenticatedUser,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const pedido = await this.buscarPedidoBloqueado(tx, empresaId, id);
      if (
        pedido.status === StatusPedidoCompra.RECEBIDO ||
        pedido.status === StatusPedidoCompra.PARCIALMENTE_RECEBIDO
      ) {
        throw new BadRequestException(
          'Pedido com recebimento não pode ser cancelado',
        );
      }
      if (pedido.status === StatusPedidoCompra.CANCELADO) {
        return pedido;
      }
      const transicao = await tx.pedidoCompra.updateMany({
        where: {
          id,
          empresaId: pedido.empresaId,
          status: pedido.status,
        },
        data: { status: StatusPedidoCompra.CANCELADO },
      });
      if (transicao.count !== 1) {
        throw new ConflictException(
          'O pedido foi alterado e não pode mais ser cancelado',
        );
      }
      await tx.pedidoCompraItem.updateMany({
        where: { pedidoCompraId: id },
        data: { status: StatusItemPedidoCompra.CANCELADO },
      });
      await this.registrarHistorico(
        tx,
        id,
        'Pedido de compra cancelado.',
        usuarioLogado,
      );
      return tx.pedidoCompra.findUniqueOrThrow({
        where: { id },
        include: this.includePedido,
      });
    });
  }
  async receber(
    empresaId: string,
    id: string,
    dados: ReceberPedidoCompraDto,
    usuarioLogado: AuthenticatedUser,
  ) {
    const idsInformados = dados.itens.map((item) => item.itemId);
    if (new Set(idsInformados).size !== idsInformados.length) {
      throw new BadRequestException(
        'O mesmo item não pode ser informado mais de uma vez no recebimento',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const pedido = await this.buscarPedidoBloqueado(tx, empresaId, id);
      if (
        pedido.status !== StatusPedidoCompra.APROVADO &&
        pedido.status !== StatusPedidoCompra.PARCIALMENTE_RECEBIDO
      ) {
        throw new BadRequestException(
          'Somente pedidos aprovados ou parcialmente recebidos podem ser recebidos',
        );
      }

      const itensOrdenados = dados.itens
        .map((itemRecebimento) => {
          const itemPedido = pedido.itens.find(
            (item) => item.id === itemRecebimento.itemId,
          );
          if (!itemPedido) {
            throw new NotFoundException(
              'Item não encontrado neste pedido de compra',
            );
          }
          return { itemRecebimento, itemPedido };
        })
        .sort((a, b) => {
          const chaveA = `${pedido.empresaId}:${a.itemPedido.produtoId}:${pedido.depositoId}`;
          const chaveB = `${pedido.empresaId}:${b.itemPedido.produtoId}:${pedido.depositoId}`;
          return chaveA.localeCompare(chaveB);
        });

      const produtos = itensOrdenados.map(
        ({ itemPedido }) => itemPedido.produtoId,
      );
      if (new Set(produtos).size !== produtos.length) {
        throw new BadRequestException(
          'O mesmo produto não pode ser informado mais de uma vez no recebimento',
        );
      }

      for (const { itemPedido } of itensOrdenados) {
        await this.bloquearEstoque(
          tx,
          pedido.empresaId,
          itemPedido.produtoId,
          pedido.depositoId,
        );
      }

      const movimentacoesCriadas: Array<
        Prisma.MovimentacaoEstoqueGetPayload<{
          include: {
            produto: true;
            deposito: true;
            usuario: {
              select: {
                id: true;
                nome: true;
                email: true;
                tipo: true;
              };
            };
          };
        }>
      > = [];
      for (const { itemRecebimento, itemPedido } of itensOrdenados) {
        if (itemPedido.status === StatusItemPedidoCompra.CANCELADO) {
          throw new BadRequestException(
            `O item "${itemPedido.produto.nome}" está cancelado`,
          );
        }
        if (itemPedido.status === StatusItemPedidoCompra.RECEBIDO) {
          throw new BadRequestException(
            `O item "${itemPedido.produto.nome}" já foi totalmente recebido`,
          );
        }

        const quantidadeSolicitada = new Prisma.Decimal(
          itemPedido.quantidadeSolicitada,
        );
        const quantidadeJaRecebida = new Prisma.Decimal(
          itemPedido.quantidadeRecebida,
        );
        const quantidadeRecebidaAgora = new Prisma.Decimal(
          itemRecebimento.quantidadeRecebida,
        );
        if (
          !quantidadeRecebidaAgora.isFinite() ||
          quantidadeRecebidaAgora.lte(0)
        ) {
          throw new BadRequestException(
            'A quantidade recebida precisa ser maior que zero',
          );
        }
        const quantidadeDisponivel =
          quantidadeSolicitada.minus(quantidadeJaRecebida);
        if (quantidadeRecebidaAgora.gt(quantidadeDisponivel)) {
          throw new BadRequestException(
            `Quantidade recebida do produto "${itemPedido.produto.nome}" excede o saldo pendente de ${quantidadeDisponivel.toString()}`,
          );
        }

        const custoUnitario = paraDecimalMonetario(
          itemRecebimento.custoUnitario ?? itemPedido.valorUnitario,
          'O custo unitário',
        );
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
              quantidadeAtual: new Prisma.Decimal(0),
              estoqueMinimo: itemPedido.produto.estoqueMinimo,
              estoqueMaximo: itemPedido.produto.estoqueMaximo,
              custoMedio: new Prisma.Decimal(0),
              ultimoCusto: new Prisma.Decimal(0),
            },
          });
        }

        const saldoAnterior = new Prisma.Decimal(estoque.quantidadeAtual);
        const saldoPosterior = saldoAnterior.plus(quantidadeRecebidaAgora);
        const valorEstoqueAnterior = saldoAnterior.mul(estoque.custoMedio);
        const valorEntrada = quantidadeRecebidaAgora.mul(custoUnitario);
        const custoMedio = saldoPosterior.gt(0)
          ? valorEstoqueAnterior.plus(valorEntrada).div(saldoPosterior)
          : custoUnitario;

        await tx.estoqueProduto.update({
          where: { id: estoque.id },
          data: {
            quantidadeAtual: { increment: quantidadeRecebidaAgora },
            custoMedio,
            ultimoCusto: custoUnitario,
          },
        });

        const novaQuantidadeRecebida = quantidadeJaRecebida.plus(
          quantidadeRecebidaAgora,
        );
        const novoStatusItem = novaQuantidadeRecebida.eq(quantidadeSolicitada)
          ? StatusItemPedidoCompra.RECEBIDO
          : StatusItemPedidoCompra.PARCIALMENTE_RECEBIDO;
        await tx.pedidoCompraItem.update({
          where: { id: itemPedido.id },
          data: {
            quantidadeRecebida: { increment: quantidadeRecebidaAgora },
            status: novoStatusItem,
          },
        });

        const movimentacao = await tx.movimentacaoEstoque.create({
          data: {
            tipo: 'ENTRADA',
            quantidade: quantidadeRecebidaAgora,
            saldoAnterior,
            saldoPosterior,
            custoUnitario,
            documentoReferencia:
              dados.documentoReferencia || `PEDIDO-COMPRA-${pedido.numero}`,
            observacao:
              dados.observacao ||
              `Recebimento do pedido de compra nº ${pedido.numero}`,
            empresaId: pedido.empresaId,
            produtoId: itemPedido.produtoId,
            depositoId: pedido.depositoId,
            usuarioId: this.obterUsuarioId(usuarioLogado),
          },
          include: {
            produto: true,
            deposito: true,
            usuario: { select: this.usuarioSelect },
          },
        });
        movimentacoesCriadas.push(movimentacao);
      }

      const itensAtualizados = await tx.pedidoCompraItem.findMany({
        where: { pedidoCompraId: id },
      });
      const todosRecebidos = itensAtualizados.every(
        (item) => item.status === StatusItemPedidoCompra.RECEBIDO,
      );
      const algumRecebido = itensAtualizados.some((item) =>
        new Prisma.Decimal(item.quantidadeRecebida).gt(0),
      );
      const novoStatusPedido = todosRecebidos
        ? StatusPedidoCompra.RECEBIDO
        : algumRecebido
          ? StatusPedidoCompra.PARCIALMENTE_RECEBIDO
          : StatusPedidoCompra.APROVADO;
      const transicao = await tx.pedidoCompra.updateMany({
        where: {
          id,
          empresaId: pedido.empresaId,
          status: {
            in: [
              StatusPedidoCompra.APROVADO,
              StatusPedidoCompra.PARCIALMENTE_RECEBIDO,
            ],
          },
        },
        data: {
          status: novoStatusPedido,
          usuarioRecebimentoId: this.obterUsuarioId(usuarioLogado),
          dataRecebimento: todosRecebidos ? new Date() : null,
        },
      });
      if (transicao.count !== 1) {
        throw new ConflictException(
          'O pedido foi alterado e não pode receber os itens',
        );
      }
      await this.registrarHistorico(
        tx,
        id,
        todosRecebidos
          ? 'Pedido de compra totalmente recebido.'
          : 'Recebimento parcial registrado no pedido de compra.',
        usuarioLogado,
      );
      const pedidoAtualizado = await tx.pedidoCompra.findUniqueOrThrow({
        where: { id },
        include: this.includePedido,
      });
      return { pedido: pedidoAtualizado, movimentacoes: movimentacoesCriadas };
    });
  }
  async adicionarHistorico(
    empresaId: string,
    pedidoCompraId: string,
    dados: CriarPedidoCompraHistoricoDto,
    usuarioLogado: AuthenticatedUser,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.buscarPedidoBloqueado(tx, empresaId, pedidoCompraId);
      return tx.pedidoCompraHistorico.create({
        data: {
          pedidoCompraId,
          descricao: dados.descricao.trim(),
          usuarioId: this.obterUsuarioId(usuarioLogado),
        },
        include: { usuario: { select: this.usuarioSelect } },
      });
    });
  }

  async listarHistorico(empresaId: string, pedidoCompraId: string) {
    await this.buscarPorId(empresaId, pedidoCompraId);

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
