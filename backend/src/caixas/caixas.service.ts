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

  private tratarErroPrisma(error: unknown): never {
    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Já existe um caixa com este nome ou código nesta empresa',
      );
    }

    throw error;
  }

  private async validarCaixa(
    id: string,
    usuario: any,
  ) {
    const caixa =
      await this.prisma.caixa.findUnique({
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
  ) {
    return this.prisma.aberturaCaixa.findFirst({
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
    const caixa = await this.validarCaixa(
      id,
      usuario,
    );

    if (!caixa.ativo) {
      throw new BadRequestException(
        'Caixa inativo não pode ser aberto',
      );
    }

    if (caixa.status === StatusCaixa.ABERTO) {
      throw new BadRequestException(
        'Este caixa já está aberto',
      );
    }

    const aberturaExistente =
      await this.buscarAberturaAtual(id);

    if (aberturaExistente) {
      throw new BadRequestException(
        'Já existe uma abertura ativa para este caixa',
      );
    }

    const saldoInicial = Number(
      dados.saldoInicial,
    );

    return this.prisma.$transaction(
      async (tx) => {
        const abertura =
          await tx.aberturaCaixa.create({
            data: {
              saldoInicial,

              observacaoAbertura:
                dados.observacao?.trim(),

              aberto: true,

              empresaId:
                caixa.empresaId,

              caixaId: caixa.id,

              usuarioAberturaId:
                this.obterUsuarioId(
                  usuario,
                ),
            },

            include: this.includeAbertura,
          });

        const caixaAtualizado =
          await tx.caixa.update({
            where: {
              id: caixa.id,
            },

            data: {
              status: StatusCaixa.ABERTO,
              saldoAtual: saldoInicial,
            },

            include: this.includeCaixa,
          });

        return {
          abertura,
          caixa: caixaAtualizado,
        };
      },
    );
  }

  async criarMovimentacao(
    caixaId: string,
    dados: CriarMovimentacaoCaixaDto,
    usuario: any,
  ) {
    const caixa = await this.validarCaixa(
      caixaId,
      usuario,
    );

    if (!caixa.ativo) {
      throw new BadRequestException(
        'Caixa inativo não aceita movimentações',
      );
    }

    if (caixa.status !== StatusCaixa.ABERTO) {
      throw new BadRequestException(
        'O caixa precisa estar aberto para receber movimentações',
      );
    }

    const abertura =
      await this.buscarAberturaAtual(caixaId);

    if (!abertura) {
      throw new BadRequestException(
        'Nenhuma abertura ativa foi encontrada para este caixa',
      );
    }

    const valor = Number(dados.valor);
    const saldoAnterior = Number(
      caixa.saldoAtual,
    );

    let saldoPosterior = saldoAnterior;

    if (
      dados.tipo ===
      TipoMovimentacaoCaixa.ENTRADA
    ) {
      saldoPosterior =
        saldoAnterior + valor;
    } else {
      saldoPosterior =
        saldoAnterior - valor;

      if (saldoPosterior < 0) {
        throw new BadRequestException(
          `Saldo insuficiente. Saldo disponível: R$ ${saldoAnterior.toFixed(
            2,
          )}`,
        );
      }
    }

    return this.prisma.$transaction(
      async (tx) => {
        const movimentacao =
          await tx.movimentacaoCaixa.create({
            data: {
              tipo: dados.tipo,

              origem:
                dados.origem ??
                OrigemMovimentacaoCaixa.MANUAL,

              descricao:
                dados.descricao.trim(),

              documento:
                dados.documento?.trim(),

              observacao:
                dados.observacao?.trim(),

              valor,

              saldoAnterior,
              saldoPosterior,

              dataMovimentacao:
                dados.dataMovimentacao
                  ? new Date(
                      dados.dataMovimentacao,
                    )
                  : new Date(),

              empresaId:
                caixa.empresaId,

              caixaId:
                caixa.id,

              aberturaCaixaId:
                abertura.id,

              usuarioId:
                this.obterUsuarioId(
                  usuario,
                ),
            },

            include: {
              caixa: true,

              aberturaCaixa: true,

              usuario: {
                select: this.usuarioSelect,
              },
            },
          });

        const caixaAtualizado =
          await tx.caixa.update({
            where: {
              id: caixa.id,
            },

            data: {
              saldoAtual:
                saldoPosterior,
            },
          });

        return {
          movimentacao,
          caixa: caixaAtualizado,
        };
      },
    );
  }

  async fechar(
    id: string,
    dados: FecharCaixaDto,
    usuario: any,
  ) {
    const caixa = await this.validarCaixa(
      id,
      usuario,
    );

    if (caixa.status !== StatusCaixa.ABERTO) {
      throw new BadRequestException(
        'Este caixa não está aberto',
      );
    }

    const abertura =
      await this.buscarAberturaAtual(id);

    if (!abertura) {
      throw new BadRequestException(
        'Nenhuma abertura ativa foi encontrada',
      );
    }

    const saldoSistema = Number(
      caixa.saldoAtual,
    );

    const saldoInformado = Number(
      dados.saldoInformado,
    );

    const diferenca =
      saldoInformado - saldoSistema;

    return this.prisma.$transaction(
      async (tx) => {
        const fechamento =
          await tx.aberturaCaixa.update({
            where: {
              id: abertura.id,
            },

            data: {
              aberto: false,

              dataFechamento:
                new Date(),

              saldoSistema,

              saldoInformado,

              diferenca,

              observacaoFechamento:
                dados.observacao?.trim(),

              usuarioFechamentoId:
                this.obterUsuarioId(
                  usuario,
                ),
            },

            include: this.includeAbertura,
          });

        const caixaAtualizado =
          await tx.caixa.update({
            where: {
              id: caixa.id,
            },

            data: {
              status: StatusCaixa.FECHADO,
              saldoAtual: saldoInformado,
            },

            include: this.includeCaixa,
          });

        return {
          fechamento,
          caixa: caixaAtualizado,
        };
      },
    );
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