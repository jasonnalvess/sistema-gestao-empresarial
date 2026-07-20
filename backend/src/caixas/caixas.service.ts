import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  OrigemMovimentacaoCaixa,
  Prisma,
  StatusCaixa,
  TipoMovimentacaoCaixa,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';

import { CriarCaixaDto } from './dto/criar-caixa.dto';
import { AtualizarCaixaDto } from './dto/atualizar-caixa.dto';
import { FiltroCaixasDto } from './dto/filtro-caixas.dto';
import { AbrirCaixaDto } from './dto/abrir-caixa.dto';
import { FecharCaixaDto } from './dto/fechar-caixa.dto';
import { CriarMovimentacaoCaixaDto } from './dto/criar-movimentacao-caixa.dto';
import { FiltroMovimentacoesCaixaDto } from './dto/filtro-movimentacoes-caixa.dto';
import { FiltroResumoCaixasDto } from './dto/filtro-resumo-caixas.dto';

@Injectable()
export class CaixasService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private readonly usuarioSelect = {
    id: true,
    nome: true,
    email: true,
    tipo: true,
  };

  private readonly includeCaixa = {
    usuarioCriacao: {
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
      },
    },

    aberturas: {
      where: {
        aberto: true,
      },

      include: {
        usuarioAbertura: {
          select: {
            id: true,
            nome: true,
            email: true,
            tipo: true,
          },
        },
      },

      orderBy: {
        dataAbertura: 'desc' as const,
      },

      take: 1,
    },
  };

  private readonly includeAbertura = {
    caixa: true,

    usuarioAbertura: {
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
      },
    },

    usuarioFechamento: {
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
      },
    },

    movimentacoes: {
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            tipo: true,
          },
        },

        pagamentoContaPagar: {
          include: {
            contaPagar: {
              select: {
                id: true,
                numero: true,
                descricao: true,
              },
            },
          },
        },

        recebimentoContaReceber: {
          include: {
            contaReceber: {
              select: {
                id: true,
                numero: true,
                descricao: true,
              },
            },
          },
        },
      },

      orderBy: {
        dataMovimentacao: 'desc' as const,
      },
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

  private alvoP2002(error: unknown, campos: string[], indice: string): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
      return false;
    }
    const target = error.meta?.target;
    return Array.isArray(target)
      ? campos.every((campo) => target.includes(campo))
      : typeof target === 'string' && target.includes(indice);
  }

  private tratarErroPrisma(error: unknown): never {
    if (this.alvoP2002(error, ['empresaId', 'codigo'], 'Caixa_empresaId_codigo_key')) {
      throw new ConflictException('Já existe um caixa com este código nesta empresa');
    }
    if (this.alvoP2002(error, ['empresaId', 'nome'], 'Caixa_empresaId_nome_key')) {
      throw new ConflictException('Já existe um caixa com este nome nesta empresa');
    }
    throw error;
  }

  private async bloquearCaixa(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Caixa" WHERE "id" = ${id} FOR UPDATE`);
  }

  private async registrarHistorico(
    tx: Prisma.TransactionClient,
    caixaId: string,
    empresaId: string,
    descricao: string,
    usuario: any,
  ) {
    return tx.caixaHistorico.create({
      data: {
        caixaId,
        empresaId,
        descricao,
        usuarioId: this.obterUsuarioId(usuario),
      },
    });
  }

  private async validarCaixa(
    id: string,
    usuario: any,
    cliente: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const caixa =
      await cliente.caixa.findUnique({
        where: {
          id,
        },

        include: this.includeCaixa,
      });

    if (!caixa) {
      throw new NotFoundException(
        'Caixa não encontrado',
      );
    }

    if (
      usuario.tipo !== 'SUPER_ADMIN' &&
      caixa.empresaId !== usuario.empresaId
    ) {
      throw new ForbiddenException(
        'Caixa pertence a outra empresa',
      );
    }

    return caixa;
  }

  private async buscarAberturaAtual(
    caixaId: string,
    cliente: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return cliente.aberturaCaixa.findFirst({
      where: {
        caixaId,
        aberto: true,
      },

      include: this.includeAbertura,

      orderBy: {
        dataAbertura: 'desc',
      },
    });
  }

  async criar(
    dados: CriarCaixaDto,
    usuario: any,
  ) {
    const empresaId =
      this.obterEmpresaId(usuario);

    try {
      return await this.prisma.caixa.create({
        data: {
          nome: dados.nome.trim(),
          codigo:
            dados.codigo.trim().toUpperCase(),

          descricao:
            dados.descricao?.trim(),

          empresaId,

          usuarioCriacaoId:
            this.obterUsuarioId(usuario),

          status: StatusCaixa.FECHADO,
          saldoAtual: 0,
          ativo: true,
        },

        include: this.includeCaixa,
      });
    } catch (error) {
      this.tratarErroPrisma(error);
    }
  }

  async listar(
    usuario: any,
    filtros: FiltroCaixasDto,
  ) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 10;

    const { skip, take } =
      calcularPaginacao(page, limit);

    const where: Prisma.CaixaWhereInput =
      usuario.tipo === 'SUPER_ADMIN'
        ? {}
        : {
            empresaId: usuario.empresaId,
          };

    if (filtros.status) {
      where.status = filtros.status;
    }

    if (filtros.ativo !== undefined) {
      where.ativo = filtros.ativo;
    }

    if (filtros.search) {
      where.OR = [
        {
          nome: {
            contains: filtros.search,
            mode: 'insensitive',
          },
        },

        {
          codigo: {
            contains: filtros.search,
            mode: 'insensitive',
          },
        },

        {
          descricao: {
            contains: filtros.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const camposOrdenacao = [
      'nome',
      'codigo',
      'status',
      'saldoAtual',
      'createdAt',
      'updatedAt',
    ];

    const sortBy =
      camposOrdenacao.includes(
        filtros.sortBy ?? '',
      )
        ? filtros.sortBy
        : 'nome';

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.caixa.findMany({
          where,

          include: this.includeCaixa,

          orderBy: {
            [sortBy!]:
              filtros.order ?? 'asc',
          },

          skip,
          take,
        }),

        this.prisma.caixa.count({
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
    const caixa =
      await this.prisma.caixa.findUnique({
        where: {
          id,
        },

        include: {
          usuarioCriacao: {
            select: this.usuarioSelect,
          },

          aberturas: {
            include: {
              usuarioAbertura: {
                select: this.usuarioSelect,
              },

              usuarioFechamento: {
                select: this.usuarioSelect,
              },

              _count: {
                select: {
                  movimentacoes: true,
                },
              },
            },

            orderBy: {
              dataAbertura: 'desc',
            },

            take: 20,
          },

          movimentacoes: {
            include: {
              usuario: {
                select: this.usuarioSelect,
              },
            },

            orderBy: {
              dataMovimentacao: 'desc',
            },

            take: 30,
          },
        },
      });

    if (!caixa) {
      throw new NotFoundException(
        'Caixa não encontrado',
      );
    }

    if (
      usuario.tipo !== 'SUPER_ADMIN' &&
      caixa.empresaId !== usuario.empresaId
    ) {
      throw new ForbiddenException(
        'Caixa pertence a outra empresa',
      );
    }

    return caixa;
  }

  async atualizar(
    id: string,
    dados: AtualizarCaixaDto,
    usuario: any,
  ) {
    const caixa = await this.validarCaixa(
      id,
      usuario,
    );

    if (
      dados.ativo === false &&
      caixa.status === StatusCaixa.ABERTO
    ) {
      throw new BadRequestException(
        'Um caixa aberto não pode ser desativado',
      );
    }

    try {
      return await this.prisma.caixa.update({
        where: {
          id,
        },

        data: {
          nome:
            dados.nome !== undefined
              ? dados.nome.trim()
              : undefined,

          codigo:
            dados.codigo !== undefined
              ? dados.codigo
                  .trim()
                  .toUpperCase()
              : undefined,

          descricao:
            dados.descricao !== undefined
              ? dados.descricao.trim()
              : undefined,

          ativo: dados.ativo,

          status:
            dados.ativo === false
              ? StatusCaixa.INATIVO
              : dados.ativo === true &&
                  caixa.status ===
                    StatusCaixa.INATIVO
                ? StatusCaixa.FECHADO
                : undefined,
        },

        include: this.includeCaixa,
      });
    } catch (error) {
      this.tratarErroPrisma(error);
    }
  }

  async abrir(
    id: string,
    dados: AbrirCaixaDto,
    usuario: any,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.bloquearCaixa(tx, id);
        const caixa = await this.validarCaixa(id, usuario, tx);

        if (!caixa.ativo) {
          throw new BadRequestException('Caixa inativo não pode ser aberto');
        }
        if (caixa.status === StatusCaixa.ABERTO) {
          throw new BadRequestException('Este caixa já está aberto');
        }
        if (await this.buscarAberturaAtual(id, tx)) {
          throw new BadRequestException('Já existe uma abertura ativa para este caixa');
        }

        const saldoInicial = Number(dados.saldoInicial);
        const transicao = await tx.caixa.updateMany({
          where: { id, empresaId: caixa.empresaId, ativo: true, status: StatusCaixa.FECHADO },
          data: { status: StatusCaixa.ABERTO, saldoAtual: saldoInicial },
        });
        if (transicao.count !== 1) {
          throw new BadRequestException('Este caixa já está aberto ou não pode mais ser aberto');
        }

        const abertura = await tx.aberturaCaixa.create({
          data: {
            saldoInicial,
            observacaoAbertura: dados.observacao?.trim(),
            aberto: true,
            empresaId: caixa.empresaId,
            caixaId: caixa.id,
            usuarioAberturaId: this.obterUsuarioId(usuario),
          },
          include: this.includeAbertura,
        });

        await this.registrarHistorico(
          tx, caixa.id, caixa.empresaId,
          `Caixa aberto com saldo inicial de R$ ${saldoInicial.toFixed(2)}.`,
          usuario,
        );

        const caixaAtualizado = await tx.caixa.findUniqueOrThrow({
          where: { id: caixa.id },
          include: this.includeCaixa,
        });
        return { abertura, caixa: caixaAtualizado };
      });
    } catch (error) {
      if (this.alvoP2002(error, ['caixaId'], 'AberturaCaixa_caixaId_aberto_key')) {
        throw new ConflictException('Já existe uma abertura ativa para este caixa');
      }
      throw error;
    }
  }

  async criarMovimentacao(
    caixaId: string,
    dados: CriarMovimentacaoCaixaDto,
    usuario: any,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.bloquearCaixa(tx, caixaId);
      const caixa = await this.validarCaixa(caixaId, usuario, tx);

      if (!caixa.ativo) {
        throw new BadRequestException('Caixa inativo não aceita movimentações');
      }
      if (caixa.status !== StatusCaixa.ABERTO) {
        throw new BadRequestException('O caixa precisa estar aberto para receber movimentações');
      }

      const abertura = await this.buscarAberturaAtual(caixaId, tx);
      if (!abertura) {
        throw new BadRequestException('Nenhuma abertura ativa foi encontrada para este caixa');
      }

      const valor = Number(dados.valor);
      const where = {
        id: caixa.id,
        empresaId: caixa.empresaId,
        ativo: true,
        status: StatusCaixa.ABERTO,
        ...(dados.tipo === TipoMovimentacaoCaixa.SAIDA
          ? { saldoAtual: { gte: valor } }
          : {}),
      };
      const alteracao = await tx.caixa.updateMany({
        where,
        data: {
          saldoAtual: dados.tipo === TipoMovimentacaoCaixa.ENTRADA
            ? { increment: valor }
            : { decrement: valor },
        },
      });

      if (alteracao.count !== 1) {
        const atual = await tx.caixa.findUnique({ where: { id: caixa.id }, select: { saldoAtual: true } });
        if (dados.tipo === TipoMovimentacaoCaixa.SAIDA) {
          throw new BadRequestException(
            `Saldo insuficiente. Saldo disponível: R$ ${Number(atual?.saldoAtual ?? 0).toFixed(2)}`,
          );
        }
        throw new BadRequestException('O caixa não está mais disponível para movimentação');
      }

      const caixaAtualizado = await tx.caixa.findUniqueOrThrow({ where: { id: caixa.id } });
      const saldoPosterior = Number(caixaAtualizado.saldoAtual);
      const saldoAnterior = dados.tipo === TipoMovimentacaoCaixa.ENTRADA
        ? saldoPosterior - valor
        : saldoPosterior + valor;

      const movimentacao = await tx.movimentacaoCaixa.create({
        data: {
          tipo: dados.tipo,
          origem: dados.origem ?? OrigemMovimentacaoCaixa.MANUAL,
          descricao: dados.descricao.trim(),
          documento: dados.documento?.trim(),
          observacao: dados.observacao?.trim(),
          valor,
          saldoAnterior,
          saldoPosterior,
          dataMovimentacao: dados.dataMovimentacao ? new Date(dados.dataMovimentacao) : new Date(),
          empresaId: caixa.empresaId,
          caixaId: caixa.id,
          aberturaCaixaId: abertura.id,
          usuarioId: this.obterUsuarioId(usuario),
        },
        include: {
          caixa: true,
          aberturaCaixa: true,
          usuario: { select: this.usuarioSelect },
        },
      });

      await this.registrarHistorico(
        tx, caixa.id, caixa.empresaId,
        `${dados.tipo === TipoMovimentacaoCaixa.ENTRADA ? 'Entrada' : 'Saída'} manual de R$ ${valor.toFixed(2)} registrada.`,
        usuario,
      );
      return { movimentacao, caixa: caixaAtualizado };
    });
  }

  async fechar(
    id: string,
    dados: FecharCaixaDto,
    usuario: any,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.bloquearCaixa(tx, id);
      const caixa = await this.validarCaixa(id, usuario, tx);

      if (caixa.status !== StatusCaixa.ABERTO) {
        throw new BadRequestException('Este caixa não está aberto');
      }
      const abertura = await this.buscarAberturaAtual(id, tx);
      if (!abertura) {
        throw new BadRequestException('Nenhuma abertura ativa foi encontrada');
      }

      const saldoSistema = Number(caixa.saldoAtual);
      const saldoInformado = Number(dados.saldoInformado);
      const diferenca = saldoInformado - saldoSistema;
      const dataFechamento = new Date();

      const transicaoAbertura = await tx.aberturaCaixa.updateMany({
        where: { id: abertura.id, caixaId: id, empresaId: caixa.empresaId, aberto: true },
        data: {
          aberto: false,
          dataFechamento,
          saldoSistema,
          saldoInformado,
          diferenca,
          observacaoFechamento: dados.observacao?.trim(),
          usuarioFechamentoId: this.obterUsuarioId(usuario),
        },
      });
      if (transicaoAbertura.count !== 1) {
        throw new BadRequestException('Esta abertura já foi fechada');
      }

      const transicaoCaixa = await tx.caixa.updateMany({
        where: { id, empresaId: caixa.empresaId, ativo: true, status: StatusCaixa.ABERTO },
        data: { status: StatusCaixa.FECHADO, saldoAtual: saldoInformado },
      });
      if (transicaoCaixa.count !== 1) {
        throw new BadRequestException('Este caixa já foi fechado');
      }

      await this.registrarHistorico(
        tx, caixa.id, caixa.empresaId,
        `Caixa fechado com saldo de sistema de R$ ${saldoSistema.toFixed(2)} e saldo informado de R$ ${saldoInformado.toFixed(2)}.`,
        usuario,
      );

      const fechamento = await tx.aberturaCaixa.findUniqueOrThrow({
        where: { id: abertura.id },
        include: this.includeAbertura,
      });
      const caixaAtualizado = await tx.caixa.findUniqueOrThrow({
        where: { id: caixa.id },
        include: this.includeCaixa,
      });
      return { fechamento, caixa: caixaAtualizado };
    });
  }

  async buscarAberturaAtiva(
    caixaId: string,
    usuario: any,
  ) {
    await this.validarCaixa(
      caixaId,
      usuario,
    );

    const abertura =
      await this.buscarAberturaAtual(caixaId);

    if (!abertura) {
      throw new NotFoundException(
        'Nenhuma abertura ativa encontrada',
      );
    }

    return abertura;
  }

  async listarMovimentacoes(
    usuario: any,
    filtros: FiltroMovimentacoesCaixaDto,
  ) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 10;

    const { skip, take } =
      calcularPaginacao(page, limit);

    const where: Prisma.MovimentacaoCaixaWhereInput =
      usuario.tipo === 'SUPER_ADMIN'
        ? {}
        : {
            empresaId: usuario.empresaId,
          };

    if (filtros.caixaId) {
      where.caixaId =
        filtros.caixaId;
    }

    if (filtros.aberturaCaixaId) {
      where.aberturaCaixaId =
        filtros.aberturaCaixaId;
    }

    if (filtros.tipo) {
      where.tipo = filtros.tipo;
    }

    if (filtros.origem) {
      where.origem = filtros.origem;
    }

    if (
      filtros.dataInicio ||
      filtros.dataFim
    ) {
      where.dataMovimentacao = {};

      if (filtros.dataInicio) {
        where.dataMovimentacao.gte =
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

        where.dataMovimentacao.lte =
          dataFim;
      }
    }

    if (filtros.search) {
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
          caixa: {
            nome: {
              contains: filtros.search,
              mode: 'insensitive',
            },
          },
        },

        {
          caixa: {
            codigo: {
              contains: filtros.search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    const camposOrdenacao = [
      'dataMovimentacao',
      'valor',
      'tipo',
      'origem',
      'createdAt',
    ];

    const sortBy =
      camposOrdenacao.includes(
        filtros.sortBy ?? '',
      )
        ? filtros.sortBy
        : 'dataMovimentacao';

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.movimentacaoCaixa.findMany({
          where,

          include: {
            caixa: true,

            aberturaCaixa: {
              select: {
                id: true,
                dataAbertura: true,
                dataFechamento: true,
                aberto: true,
              },
            },

            usuario: {
              select: this.usuarioSelect,
            },

            pagamentoContaPagar: {
              include: {
                contaPagar: {
                  select: {
                    id: true,
                    numero: true,
                    descricao: true,
                  },
                },
              },
            },

            recebimentoContaReceber: {
              include: {
                contaReceber: {
                  select: {
                    id: true,
                    numero: true,
                    descricao: true,
                  },
                },
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

        this.prisma.movimentacaoCaixa.count({
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

  async listarAberturas(
    caixaId: string,
    usuario: any,
  ) {
    const caixa = await this.validarCaixa(
      caixaId,
      usuario,
    );

    return this.prisma.aberturaCaixa.findMany({
      where: {
        caixaId: caixa.id,
      },

      include: {
        usuarioAbertura: {
          select: this.usuarioSelect,
        },

        usuarioFechamento: {
          select: this.usuarioSelect,
        },

        _count: {
          select: {
            movimentacoes: true,
          },
        },
      },

      orderBy: {
        dataAbertura: 'desc',
      },
    });
  }

  async resumo(
    usuario: any,
    filtros: FiltroResumoCaixasDto,
  ) {
    const empresaId =
      usuario.tipo === 'SUPER_ADMIN'
        ? undefined
        : usuario.empresaId;

    const whereCaixas: Prisma.CaixaWhereInput = {
      ...(empresaId
        ? {
            empresaId,
          }
        : {}),
    };

    const whereMovimentacoes: Prisma.MovimentacaoCaixaWhereInput =
      {
        ...(empresaId
          ? {
              empresaId,
            }
          : {}),
      };

    if (filtros.caixaId) {
      whereMovimentacoes.caixaId =
        filtros.caixaId;
    }

    if (filtros.tipo) {
      whereMovimentacoes.tipo =
        filtros.tipo;
    }

    if (filtros.origem) {
      whereMovimentacoes.origem =
        filtros.origem;
    }

    if (filtros.search) {
      whereMovimentacoes.OR = [
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
          caixa: {
            nome: {
              contains: filtros.search,
              mode: 'insensitive',
            },
          },
        },
        {
          caixa: {
            codigo: {
              contains: filtros.search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    if (filtros.dataInicio || filtros.dataFim) {
      whereMovimentacoes.dataMovimentacao = {};

      if (filtros.dataInicio) {
        whereMovimentacoes.dataMovimentacao.gte =
          new Date(filtros.dataInicio);
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

        whereMovimentacoes.dataMovimentacao.lte =
          dataFim;
      }
    }

    // Criar filtros específicos para entradas e saídas
    const whereEntradas: Prisma.MovimentacaoCaixaWhereInput =
      {
        ...whereMovimentacoes,

        tipo:
          TipoMovimentacaoCaixa.ENTRADA,
      };

    const whereSaidas: Prisma.MovimentacaoCaixaWhereInput =
      {
        ...whereMovimentacoes,

        tipo:
          TipoMovimentacaoCaixa.SAIDA,
      };

    if (
      filtros.tipo ===
      TipoMovimentacaoCaixa.SAIDA
    ) {
      whereEntradas.id = {
        equals:
          '00000000-0000-0000-0000-000000000000',
      };
    }

    if (
      filtros.tipo ===
      TipoMovimentacaoCaixa.ENTRADA
    ) {
      whereSaidas.id = {
        equals:
          '00000000-0000-0000-0000-000000000000',
      };
    }

    const [
      saldoTotal,
      caixasTotal,
      caixasAbertos,
      caixasFechados,
      caixasInativos,
      entradas,
      saidas,
      quantidadeEntradas,
      quantidadeSaidas,
    ] = await this.prisma.$transaction([
      this.prisma.caixa.aggregate({
        where: {
          ...whereCaixas,
          ativo: true,
        },

        _sum: {
          saldoAtual: true,
        },
      }),

      this.prisma.caixa.count({
        where: whereCaixas,
      }),

      this.prisma.caixa.count({
        where: {
          ...whereCaixas,
          ativo: true,
          status: StatusCaixa.ABERTO,
        },
      }),

      this.prisma.caixa.count({
        where: {
          ...whereCaixas,
          ativo: true,
          status: StatusCaixa.FECHADO,
        },
      }),

      this.prisma.caixa.count({
        where: {
          ...whereCaixas,
          ativo: false,
        },
      }),

      this.prisma.movimentacaoCaixa.aggregate({
        where: whereEntradas,

        _sum: {
          valor: true,
        },
      }),

      this.prisma.movimentacaoCaixa.aggregate({
        where: whereSaidas,

        _sum: {
          valor: true,
        },
      }),

      this.prisma.movimentacaoCaixa.count({
        where: whereEntradas,
      }),

      this.prisma.movimentacaoCaixa.count({
        where: whereSaidas,
      }),
    ]);

    const valorEntradas = Number(
      entradas._sum.valor ?? 0,
    );

    const valorSaidas = Number(
      saidas._sum.valor ?? 0,
    );

    return {
      filtros: {
        search:
          filtros.search ?? null,

        caixaId:
          filtros.caixaId ?? null,

        tipo:
          filtros.tipo ?? null,

        origem:
          filtros.origem ?? null,

        dataInicio:
          filtros.dataInicio ?? null,

        dataFim:
          filtros.dataFim ?? null,
      },

      caixas: {
        total: caixasTotal,
        abertos: caixasAbertos,
        fechados: caixasFechados,
        inativos: caixasInativos,

        saldoTotal: Number(
          saldoTotal._sum.saldoAtual ?? 0,
        ),
      },

      movimentacoes: {
        entradas: valorEntradas,
        saidas: valorSaidas,

        resultado:
          valorEntradas - valorSaidas,

        quantidadeEntradas,
        quantidadeSaidas,

        quantidadeTotal:
          quantidadeEntradas +
          quantidadeSaidas,
      },
    };
  }
}