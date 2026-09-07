import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';

import {
  OrigemContaReceber,
  OrigemMovimentacaoCaixa,
  Prisma,
  StatusContaReceber,
  TipoMovimentacaoCaixa,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { VendasService } from '../vendas/vendas.service';
import { CaixasService } from '../caixas/caixas.service';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';

import { CriarContaReceberDto } from './dto/criar-conta-receber.dto';
import { AtualizarContaReceberDto } from './dto/atualizar-conta-receber.dto';
import { FiltroContasReceberDto } from './dto/filtro-contas-receber.dto';
import { FiltroResumoContasReceberDto } from './dto/filtro-resumo-contas-receber.dto';
import { RegistrarRecebimentoContaReceberDto } from './dto/registrar-recebimento-conta-receber.dto';
import { CriarContaReceberHistoricoDto } from './dto/criar-conta-receber-historico.dto';
import { GerarContaOrdemServicoDto } from './dto/gerar-conta-ordem-servico.dto';
import { paraDecimalMonetario } from '../contas-pagar/valor-monetario';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

const CAMPOS_ORDENACAO_CONTA_RECEBER = [
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
] as const satisfies readonly (keyof Prisma.ContaReceberOrderByWithRelationInput)[];
type CampoOrdenacaoContaReceber =
  (typeof CAMPOS_ORDENACAO_CONTA_RECEBER)[number];

@Injectable()
export class ContasReceberService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => VendasService))
    private readonly vendasService: VendasService,
    private readonly caixasService: CaixasService,
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

  private obterUsuarioId(usuario: AuthenticatedUser): string {
    return usuario.id;
  }

  private inicioHoje(): Date {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return hoje;
  }

  private calcularValorAberto(
    valorOriginal: Prisma.Decimal,
    valorDesconto: Prisma.Decimal,
    valorJuros: Prisma.Decimal,
    valorMulta: Prisma.Decimal,
    valorRecebido: Prisma.Decimal,
  ): Prisma.Decimal {
    return valorOriginal
      .plus(valorJuros)
      .plus(valorMulta)
      .minus(valorDesconto)
      .minus(valorRecebido);
  }

  private determinarStatusInicial(dataVencimento: Date): StatusContaReceber {
    if (dataVencimento < this.inicioHoje()) {
      return StatusContaReceber.VENCIDA;
    }

    return StatusContaReceber.PENDENTE;
  }

  private alvoP2002(
    error: unknown,
    campos: readonly string[],
    indice?: string,
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
        target.length === campos.length &&
        campos.every((campo) => target.includes(campo))
      );
    }

    return indice !== undefined && target === indice;
  }

  private tratarErroPrisma(error: unknown): never {
    if (this.alvoP2002(error, ['empresaId', 'numero'])) {
      throw new ConflictException(
        'Conflito ao gerar a numeração da conta a receber',
      );
    }

    if (
      this.alvoP2002(
        error,
        ['vendaId', 'parcelaAtual'],
        'ContaReceber_vendaId_parcelaAtual_key',
      )
    ) {
      throw new ConflictException(
        'Esta parcela da venda já possui uma conta a receber',
      );
    }

    throw error;
  }

  private tratarErroRecebimento(error: unknown): never {
    if (
      this.alvoP2002(
        error,
        ['recebimentoContaReceberId'],
        'MovimentacaoCaixa_recebimentoContaReceberId_key',
      )
    ) {
      throw new ConflictException(
        'Este recebimento já possui movimentação de caixa',
      );
    }

    throw error;
  }

  private tratarErroGeracaoOrdemServico(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      error.meta?.target === 'ContaReceber_ordemServicoId_ativa_key'
    ) {
      throw new ConflictException(
        'Já existe uma conta a receber ativa para esta Ordem de Serviço.',
      );
    }

    throw error;
  }

  private async bloquearNumeracao(
    tx: Prisma.TransactionClient,
    empresaId: string,
  ) {
    const chave = `conta-receber-numero:${empresaId}`;
    await tx.$executeRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${chave}, 0))`,
    );
  }

  private async bloquearConta(
    tx: Prisma.TransactionClient,
    empresaId: string,
    id: string,
  ) {
    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "ContaReceber" WHERE "id" = ${id} AND "empresaId" = ${empresaId} FOR UPDATE`,
    );
  }

  private async bloquearVendaVinculada(
    tx: Prisma.TransactionClient,
    vendaId: string,
    empresaId: string,
  ) {
    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "Venda" WHERE "id" = ${vendaId} AND "empresaId" = ${empresaId} FOR UPDATE`,
    );
  }

  private async prepararContaParaAlteracao(
    tx: Prisma.TransactionClient,
    empresaId: string,
    id: string,
  ) {
    const referencia = await tx.contaReceber.findFirst({
      where: { id, empresaId },
      select: { id: true, vendaId: true },
    });

    if (!referencia) {
      throw new NotFoundException('Conta a receber não encontrada');
    }

    if (referencia.vendaId) {
      await this.bloquearVendaVinculada(tx, referencia.vendaId, empresaId);
    }

    await this.bloquearConta(tx, empresaId, id);

    const conta = await tx.contaReceber.findFirst({
      where: { id, empresaId },
      include: this.includeConta,
    });

    if (!conta) {
      throw new NotFoundException('Conta a receber não encontrada');
    }

    return conta;
  }

  private async atualizarContasVencidas(empresaId: string) {
    const where: Prisma.ContaReceberWhereInput = {
      empresaId,
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
    clientePrisma: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const cliente = await clientePrisma.cliente.findFirst({
      where: { id: clienteId, empresaId },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente não encontrado');
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
    clientePrisma: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const ordem = await clientePrisma.ordemServico.findFirst({
      where: { id: ordemServicoId, empresaId },

      include: {
        cliente: true,
      },
    });

    if (!ordem) {
      throw new NotFoundException('Ordem de serviço não encontrada');
    }

    return ordem;
  }

  private async registrarHistorico(
    contaReceberId: string,
    descricao: string,
    usuario: AuthenticatedUser,
    tx?: Prisma.TransactionClient,
  ) {
    const cliente = tx ?? this.prisma;

    return cliente.contaReceberHistorico.create({
      data: {
        contaReceberId,
        descricao,

        usuarioId: this.obterUsuarioId(usuario),
      },
    });
  }

  async criar(
    empresaId: string,
    dados: CriarContaReceberDto,
    usuario: AuthenticatedUser,
  ) {
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

    try {
      return await this.prisma.$transaction(async (tx) => {
        let clienteId = dados.clienteId;

        if (dados.ordemServicoId) {
          const ordem = await this.validarOrdemServico(
            dados.ordemServicoId,
            empresaId,
            tx,
          );

          if (clienteId && ordem.clienteId !== clienteId) {
            throw new BadRequestException(
              'O cliente informado é diferente do cliente da ordem de serviço',
            );
          }

          clienteId = clienteId ?? ordem.clienteId;
        }

        if (clienteId) {
          await this.validarCliente(clienteId, empresaId, tx);
        }

        await this.bloquearNumeracao(tx, empresaId);

        const ultimaConta = await tx.contaReceber.findFirst({
          where: { empresaId },
          orderBy: { numero: 'desc' },
          select: { numero: true },
        });
        const numero = (ultimaConta?.numero ?? 0) + 1;

        const conta = await tx.contaReceber.create({
          data: {
            numero,
            descricao: dados.descricao.trim(),
            documento: dados.documento?.trim(),
            observacao: dados.observacao?.trim(),
            origem:
              dados.origem ??
              (dados.ordemServicoId
                ? OrigemContaReceber.ORDEM_SERVICO
                : OrigemContaReceber.MANUAL),
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
            valorRecebido: 0,
            valorAberto,
            empresaId,
            clienteId,
            ordemServicoId: dados.ordemServicoId,
            usuarioCriacaoId: this.obterUsuarioId(usuario),
          },
          include: this.includeConta,
        });

        await this.registrarHistorico(
          conta.id,
          `Conta a receber nº ${numero} criada no valor de R$ ${valorOriginal.toFixed(2)}.`,
          usuario,
          tx,
        );

        return conta;
      });
    } catch (error) {
      this.tratarErroPrisma(error);
    }
  }

  async listar(empresaId: string, filtros: FiltroContasReceberDto) {
    await this.atualizarContasVencidas(empresaId);

    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 10;

    const { skip, take } = calcularPaginacao(page, limit);

    const where: Prisma.ContaReceberWhereInput = { empresaId };

    if (filtros.status) {
      where.status = filtros.status;
    }

    if (filtros.origem) {
      where.origem = filtros.origem;
    }

    if (filtros.clienteId) {
      where.clienteId = filtros.clienteId;
    }

    if (filtros.ordemServicoId) {
      where.ordemServicoId = filtros.ordemServicoId;
    }

    if (filtros.vendaId) {
      where.vendaId = filtros.vendaId;
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

      if (filtros.search.trim() && !Number.isNaN(numero)) {
        where.OR.push({
          numero,
        });
      }
    }

    const sortBy: CampoOrdenacaoContaReceber =
      CAMPOS_ORDENACAO_CONTA_RECEBER.find(
        (campo) => campo === filtros.sortBy,
      ) ?? 'dataVencimento';

    const [data, total] = await this.prisma.$transaction([
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
          [sortBy]: filtros.order ?? 'asc',
        },

        skip,
        take,
      }),

      this.prisma.contaReceber.count({
        where,
      }),
    ]);

    return respostaPaginada(data, total, page, limit);
  }

  async obterResumo(empresaId: string, filtros: FiltroResumoContasReceberDto) {
    await this.atualizarContasVencidas(empresaId);

    const where: Prisma.ContaReceberWhereInput = {
      empresaId,
      status: {
        not: StatusContaReceber.CANCELADA,
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
      this.prisma.contaReceber.aggregate({
        where,
        _sum: {
          valorOriginal: true,
          valorRecebido: true,
          valorAberto: true,
        },
      }),
      this.prisma.contaReceber.aggregate({
        where: {
          ...where,
          status: StatusContaReceber.VENCIDA,
        },
        _sum: {
          valorAberto: true,
        },
      }),
    ]);

    return {
      receber: {
        valorOriginal: Number(totais._sum.valorOriginal ?? 0),
        valorRecebido: Number(totais._sum.valorRecebido ?? 0),
        valorAberto: Number(totais._sum.valorAberto ?? 0),
        valorVencido: Number(vencidas._sum.valorAberto ?? 0),
      },
    };
  }

  async buscarPorId(empresaId: string, id: string) {
    await this.atualizarContasVencidas(empresaId);

    const conta = await this.prisma.contaReceber.findFirst({
      where: { id, empresaId },

      include: this.includeConta,
    });

    if (!conta) {
      throw new NotFoundException('Conta a receber não encontrada');
    }

    return conta;
  }

  async atualizar(
    empresaId: string,
    id: string,
    dados: AtualizarContaReceberDto,
    usuario: AuthenticatedUser,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const conta = await this.prepararContaParaAlteracao(tx, empresaId, id);

        if (
          conta.status === StatusContaReceber.RECEBIDA ||
          conta.status === StatusContaReceber.CANCELADA
        ) {
          throw new BadRequestException(
            'Conta recebida ou cancelada não pode ser alterada',
          );
        }

        if (
          conta.recebimentos.length > 0 ||
          new Prisma.Decimal(conta.valorRecebido).gt(0)
        ) {
          throw new BadRequestException(
            'Conta com recebimentos registrados não pode ser alterada',
          );
        }

        const clienteId =
          dados.clienteId !== undefined ? dados.clienteId : conta.clienteId;
        const ordemServicoId =
          dados.ordemServicoId !== undefined
            ? dados.ordemServicoId
            : conta.ordemServicoId;

        if (clienteId) {
          await this.validarCliente(clienteId, conta.empresaId, tx);
        }

        if (ordemServicoId) {
          const ordem = await this.validarOrdemServico(
            ordemServicoId,
            conta.empresaId,
            tx,
          );
          if (clienteId && ordem.clienteId !== clienteId) {
            throw new BadRequestException(
              'O cliente é diferente do cliente da ordem de serviço',
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
        const valorAberto = this.calcularValorAberto(
          valorOriginal,
          valorDesconto,
          valorJuros,
          valorMulta,
          new Prisma.Decimal(0),
        );

        if (valorAberto.lte(0)) {
          throw new BadRequestException(
            'O valor aberto precisa ser maior que zero',
          );
        }

        const dataVencimento = dados.dataVencimento
          ? new Date(dados.dataVencimento)
          : conta.dataVencimento;

        const atualizada = await tx.contaReceber.update({
          where: { id: conta.id, empresaId },
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
            clienteId,
            ordemServicoId,
          },
          include: this.includeConta,
        });

        await this.registrarHistorico(
          conta.id,
          'Conta a receber atualizada.',
          usuario,
          tx,
        );

        return atualizada;
      });
    } catch (error) {
      this.tratarErroPrisma(error);
    }
  }

  async registrarRecebimento(
    empresaId: string,
    id: string,
    dados: RegistrarRecebimentoContaReceberDto,
    usuario: AuthenticatedUser,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const conta = await this.prepararContaParaAlteracao(tx, empresaId, id);

        if (conta.status === StatusContaReceber.RECEBIDA) {
          throw new BadRequestException('Esta conta já foi recebida');
        }
        if (conta.status === StatusContaReceber.CANCELADA) {
          throw new BadRequestException(
            'Conta cancelada não pode receber valores',
          );
        }

        const valor = paraDecimalMonetario(
          dados.valor,
          'O valor do recebimento',
        );
        const desconto = paraDecimalMonetario(
          dados.desconto ?? 0,
          'O desconto',
        );
        const juros = paraDecimalMonetario(dados.juros ?? 0, 'Os juros');
        const multa = paraDecimalMonetario(dados.multa ?? 0, 'A multa');

        if (valor.lte(0) || desconto.lt(0) || juros.lt(0) || multa.lt(0)) {
          throw new BadRequestException(
            'Os valores do recebimento são inválidos',
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
            'O recebimento não pode ser maior que o saldo de R$ ' +
              saldoAjustado.toFixed(2),
          );
        }

        const novoValorRecebido = new Prisma.Decimal(conta.valorRecebido).plus(
          valor,
        );
        const novoValorDesconto = new Prisma.Decimal(conta.valorDesconto).plus(
          desconto,
        );
        const novoValorJuros = new Prisma.Decimal(conta.valorJuros).plus(juros);
        const novoValorMulta = new Prisma.Decimal(conta.valorMulta).plus(multa);
        const saldoCalculado = saldoAjustado.minus(valor);

        if (saldoCalculado.lt(0)) {
          throw new BadRequestException(
            'O recebimento não pode resultar em saldo negativo',
          );
        }

        const contaQuitada = saldoCalculado.eq(0);
        const dataRecebimento = dados.dataRecebimento
          ? new Date(dados.dataRecebimento)
          : new Date();

        const recebimento = await tx.recebimentoContaReceber.create({
          data: {
            valor,
            desconto,
            juros,
            multa,
            formaRecebimento: dados.formaRecebimento,
            dataRecebimento,
            documento: dados.documento?.trim(),
            observacao: dados.observacao?.trim(),
            empresaId,
            contaReceberId: conta.id,
            usuarioId: this.obterUsuarioId(usuario),
          },
          include: {
            usuario: { select: this.usuarioSelect },
          },
        });

        let movimentacaoCaixa: Prisma.MovimentacaoCaixaGetPayload<object> | null =
          null;

        if (dados.caixaId) {
          const resultadoCaixa =
            await this.caixasService.registrarMovimentacaoFinanceira(
              tx,
              empresaId,
              {
                caixaId: dados.caixaId,
                tipo: TipoMovimentacaoCaixa.ENTRADA,
                origem: OrigemMovimentacaoCaixa.CONTA_RECEBER,
                descricao:
                  'Recebimento da conta nº ' +
                  conta.numero +
                  ' - ' +
                  conta.descricao,
                documento:
                  dados.documento?.trim() || conta.documento || undefined,
                observacao: dados.observacao?.trim(),
                valor,
                dataMovimentacao: dataRecebimento,
                usuarioId: this.obterUsuarioId(usuario),
                recebimentoContaReceberId: recebimento.id,
              },
            );
          movimentacaoCaixa = resultadoCaixa.movimentacao;
        }

        const contaAtualizada = await tx.contaReceber.update({
          where: { id: conta.id, empresaId },
          data: {
            valorRecebido: novoValorRecebido,
            valorDesconto: novoValorDesconto,
            valorJuros: novoValorJuros,
            valorMulta: novoValorMulta,
            valorAberto: saldoCalculado,
            status: contaQuitada
              ? StatusContaReceber.RECEBIDA
              : StatusContaReceber.PARCIALMENTE_RECEBIDA,
            dataRecebimento: contaQuitada ? dataRecebimento : null,
          },
          include: this.includeConta,
        });

        await this.registrarHistorico(
          conta.id,
          contaQuitada
            ? 'Conta quitada com recebimento de R$ ' + valor.toFixed(2) + '.'
            : 'Recebimento parcial de R$ ' + valor.toFixed(2) + ' registrado.',
          usuario,
          tx,
        );

        if (contaAtualizada.vendaId) {
          await this.vendasService.concluirSeQuitada(
            empresaId,
            contaAtualizada.vendaId,
            this.obterUsuarioId(usuario),
            tx,
          );
        }

        return { recebimento, movimentacaoCaixa, conta: contaAtualizada };
      });
    } catch (error) {
      this.tratarErroRecebimento(error);
    }
  }

  async cancelar(empresaId: string, id: string, usuario: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      const conta = await this.prepararContaParaAlteracao(tx, empresaId, id);

      if (conta.status === StatusContaReceber.CANCELADA) {
        return conta;
      }
      if (conta.status === StatusContaReceber.RECEBIDA) {
        throw new BadRequestException('Conta recebida não pode ser cancelada');
      }
      if (
        conta.recebimentos.length > 0 ||
        new Prisma.Decimal(conta.valorRecebido).gt(0)
      ) {
        throw new BadRequestException(
          'Conta com recebimentos não pode ser cancelada',
        );
      }

      const transicao = await tx.contaReceber.updateMany({
        where: {
          id: conta.id,
          empresaId: conta.empresaId,
          status: {
            in: [
              StatusContaReceber.PENDENTE,
              StatusContaReceber.PARCIALMENTE_RECEBIDA,
              StatusContaReceber.VENCIDA,
            ],
          },
          valorRecebido: 0,
          recebimentos: { none: {} },
        },
        data: {
          status: StatusContaReceber.CANCELADA,
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
        'Conta a receber cancelada.',
        usuario,
        tx,
      );

      return tx.contaReceber.findUniqueOrThrow({
        where: { id: conta.id, empresaId },
        include: this.includeConta,
      });
    });
  }

  async gerarAPartirOrdemServico(
    empresaId: string,
    ordemServicoId: string,
    dados: GerarContaOrdemServicoDto,
    usuario: AuthenticatedUser,
  ) {
    const valorOriginal = paraDecimalMonetario(
      dados.valorOriginal,
      'O valor original',
    );
    const dataVencimento = new Date(dados.dataVencimento);

    return this.prisma.$transaction(async (tx) => {
      const ordem = await this.validarOrdemServico(
        ordemServicoId,
        empresaId,
        tx,
      );
      const statusPermitido = [
        'CONCLUIDA',
        'CONCLUÍDA',
        'FINALIZADA',
        'FINALIZADO',
      ].includes(ordem.status.toUpperCase());

      if (!statusPermitido) {
        throw new BadRequestException(
          'Somente ordens de serviço concluídas podem gerar conta a receber',
        );
      }

      await this.bloquearNumeracao(tx, empresaId);

      const contaExistente = await tx.contaReceber.findFirst({
        where: {
          empresaId,
          ordemServicoId,
          status: { not: StatusContaReceber.CANCELADA },
        },
        select: { numero: true },
      });

      if (contaExistente) {
        throw new ConflictException(
          'A ordem de serviço já possui a conta a receber nº ' +
            contaExistente.numero,
        );
      }

      await this.validarCliente(ordem.clienteId, empresaId, tx);

      const ultimaConta = await tx.contaReceber.findFirst({
        where: { empresaId },
        orderBy: { numero: 'desc' },
        select: { numero: true },
      });
      const numero = (ultimaConta?.numero ?? 0) + 1;

      const conta = await (async () => {
        try {
          return await tx.contaReceber.create({
            data: {
              numero,
              descricao:
                'Ordem de serviço nº ' + ordem.numero + ' - ' + ordem.titulo,
              documento:
                dados.documento?.trim() || 'ORDEM-SERVICO-' + ordem.numero,
              observacao:
                dados.observacao?.trim() ||
                'Conta gerada a partir da ordem de serviço nº ' +
                  ordem.numero +
                  '.',
              origem: OrigemContaReceber.ORDEM_SERVICO,
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
              valorRecebido: 0,
              valorAberto: valorOriginal,
              empresaId,
              clienteId: ordem.clienteId,
              ordemServicoId: ordem.id,
              usuarioCriacaoId: this.obterUsuarioId(usuario),
            },
            include: this.includeConta,
          });
        } catch (error) {
          this.tratarErroGeracaoOrdemServico(error);
        }
      })();

      await this.registrarHistorico(
        conta.id,
        'Conta a receber nº ' +
          numero +
          ' gerada a partir da ordem de serviço nº ' +
          ordem.numero +
          '.',
        usuario,
        tx,
      );

      return conta;
    });
  }

  async adicionarHistorico(
    empresaId: string,
    contaReceberId: string,
    dados: CriarContaReceberHistoricoDto,
    usuario: AuthenticatedUser,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const conta = await tx.contaReceber.findFirst({
        where: { id: contaReceberId, empresaId },
        select: { id: true },
      });

      if (!conta) {
        throw new NotFoundException('Conta a receber não encontrada');
      }

      return tx.contaReceberHistorico.create({
        data: {
          contaReceberId: conta.id,
          descricao: dados.descricao.trim(),
          usuarioId: this.obterUsuarioId(usuario),
        },
        include: {
          usuario: {
            select: this.usuarioSelect,
          },
        },
      });
    });
  }

  async listarHistorico(empresaId: string, contaReceberId: string) {
    const conta = await this.prisma.contaReceber.findFirst({
      where: { id: contaReceberId, empresaId },
      select: { id: true },
    });

    if (!conta) {
      throw new NotFoundException('Conta a receber não encontrada');
    }

    return this.prisma.contaReceberHistorico.findMany({
      where: {
        contaReceberId: conta.id,
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
