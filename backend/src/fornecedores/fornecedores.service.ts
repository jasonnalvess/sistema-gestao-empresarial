import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { obterEmpresaId } from '../common/utils/obter-empresa-id';

import { CriarFornecedorDto } from './dto/criar-fornecedor.dto';
import { AtualizarFornecedorDto } from './dto/atualizar-fornecedor.dto';
import { FiltroFornecedoresDto } from './dto/filtro-fornecedores.dto';
import { CriarFornecedorHistoricoDto } from './dto/criar-fornecedor-historico.dto';

@Injectable()
export class FornecedoresService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly usuarioSelect = {
    id: true,
    nome: true,
    email: true,
    tipo: true,
  };

  private tratarErroPrisma(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.map(String)
        : [];

      if (target.includes('documento')) {
        throw new ConflictException(
          'Já existe um fornecedor com este documento nesta empresa',
        );
      }

      throw new ConflictException('Já existe um fornecedor com esses dados');
    }

    throw error;
  }

  private limparDocumento(documento: string) {
    return documento.replace(/\D/g, '');
  }

  private valorComparavel(valor: unknown): string {
    if (valor === null || valor === undefined) {
      return '';
    }

    return String(valor);
  }

  private valorExibicao(valor: unknown): string {
    if (valor === null || valor === undefined || valor === '') {
      return 'não informado';
    }

    return String(valor);
  }

  private montarDescricaoAlteracoes(
    anterior: Prisma.FornecedorGetPayload<object>,
    atualizado: Prisma.FornecedorGetPayload<object>,
  ): string | null {
    const campos = [
      {
        label: 'Razão social',
        anterior: anterior.razaoSocial,
        atualizado: atualizado.razaoSocial,
      },
      {
        label: 'Nome fantasia',
        anterior: anterior.nomeFantasia,
        atualizado: atualizado.nomeFantasia,
      },
      {
        label: 'Documento',
        anterior: anterior.documento,
        atualizado: atualizado.documento,
      },
      {
        label: 'Inscrição estadual',
        anterior: anterior.inscricaoEstadual,
        atualizado: atualizado.inscricaoEstadual,
      },
      {
        label: 'Inscrição municipal',
        anterior: anterior.inscricaoMunicipal,
        atualizado: atualizado.inscricaoMunicipal,
      },
      {
        label: 'E-mail',
        anterior: anterior.email,
        atualizado: atualizado.email,
      },
      {
        label: 'Telefone',
        anterior: anterior.telefone,
        atualizado: atualizado.telefone,
      },
      {
        label: 'Celular',
        anterior: anterior.celular,
        atualizado: atualizado.celular,
      },
      {
        label: 'Contato',
        anterior: anterior.contato,
        atualizado: atualizado.contato,
      },
      {
        label: 'CEP',
        anterior: anterior.cep,
        atualizado: atualizado.cep,
      },
      {
        label: 'Endereço',
        anterior: anterior.endereco,
        atualizado: atualizado.endereco,
      },
      {
        label: 'Número',
        anterior: anterior.numero,
        atualizado: atualizado.numero,
      },
      {
        label: 'Complemento',
        anterior: anterior.complemento,
        atualizado: atualizado.complemento,
      },
      {
        label: 'Bairro',
        anterior: anterior.bairro,
        atualizado: atualizado.bairro,
      },
      {
        label: 'Cidade',
        anterior: anterior.cidade,
        atualizado: atualizado.cidade,
      },
      {
        label: 'Estado',
        anterior: anterior.estado,
        atualizado: atualizado.estado,
      },
      {
        label: 'Observação',
        anterior: anterior.observacao,
        atualizado: atualizado.observacao,
      },
    ];

    const alteracoes = campos
      .filter(
        (campo) =>
          this.valorComparavel(campo.anterior) !==
          this.valorComparavel(campo.atualizado),
      )
      .map(
        (campo) =>
          `${campo.label}: ${this.valorExibicao(
            campo.anterior,
          )} → ${this.valorExibicao(campo.atualizado)}`,
      );

    if (alteracoes.length === 0) {
      return null;
    }

    return `Fornecedor atualizado.\n${alteracoes.join('\n')}`;
  }

  private async registrarHistorico(
    fornecedorId: string,
    descricao: string,
    usuarioLogado: AuthenticatedUser,
  ) {
    return this.prisma.fornecedorHistorico.create({
      data: {
        fornecedorId,
        descricao,
        usuarioId: usuarioLogado.id,
      },
    });
  }

  async criar(dados: CriarFornecedorDto, usuarioLogado: AuthenticatedUser) {
    const empresaId = obterEmpresaId(usuarioLogado);

    try {
      const fornecedor = await this.prisma.fornecedor.create({
        data: {
          razaoSocial: dados.razaoSocial.trim(),
          nomeFantasia: dados.nomeFantasia?.trim(),
          documento: this.limparDocumento(dados.documento),
          inscricaoEstadual: dados.inscricaoEstadual?.trim(),
          inscricaoMunicipal: dados.inscricaoMunicipal?.trim(),
          email: dados.email?.trim().toLowerCase(),
          telefone: dados.telefone?.trim(),
          celular: dados.celular?.trim(),
          contato: dados.contato?.trim(),
          cep: dados.cep?.replace(/\D/g, ''),
          endereco: dados.endereco?.trim(),
          numero: dados.numero?.trim(),
          complemento: dados.complemento?.trim(),
          bairro: dados.bairro?.trim(),
          cidade: dados.cidade?.trim(),
          estado: dados.estado?.trim().toUpperCase(),
          observacao: dados.observacao?.trim(),
          empresaId,
        },
      });

      await this.registrarHistorico(
        fornecedor.id,
        'Fornecedor cadastrado.',
        usuarioLogado,
      );

      return fornecedor;
    } catch (error) {
      this.tratarErroPrisma(error);
    }
  }

  async listar(
    usuarioLogado: AuthenticatedUser,
    filtros: FiltroFornecedoresDto,
  ) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 10;
    const { skip, take } = calcularPaginacao(page, limit);

    const where: Prisma.FornecedorWhereInput =
      usuarioLogado.tipo === 'SUPER_ADMIN'
        ? {}
        : {
            empresaId: obterEmpresaId(usuarioLogado),
          };

    if (filtros.search) {
      where.OR = [
        {
          razaoSocial: {
            contains: filtros.search,
            mode: 'insensitive',
          },
        },
        {
          nomeFantasia: {
            contains: filtros.search,
            mode: 'insensitive',
          },
        },
        {
          documento: {
            contains: filtros.search.replace(/\D/g, ''),
          },
        },
        {
          email: {
            contains: filtros.search,
            mode: 'insensitive',
          },
        },
        {
          telefone: {
            contains: filtros.search,
            mode: 'insensitive',
          },
        },
        {
          celular: {
            contains: filtros.search,
            mode: 'insensitive',
          },
        },
        {
          cidade: {
            contains: filtros.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (filtros.ativo !== undefined) {
      where.ativo = filtros.ativo;
    }

    if (filtros.cidade) {
      where.cidade = {
        contains: filtros.cidade,
        mode: 'insensitive',
      };
    }

    if (filtros.estado) {
      where.estado = filtros.estado.toUpperCase();
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.fornecedor.findMany({
        where,
        orderBy: {
          [filtros.sortBy ?? 'createdAt']: filtros.order ?? 'desc',
        },
        skip,
        take,
      }),

      this.prisma.fornecedor.count({
        where,
      }),
    ]);

    return respostaPaginada(data, total, page, limit);
  }

  async buscarPorId(id: string, usuarioLogado: AuthenticatedUser) {
    const fornecedor = await this.prisma.fornecedor.findUnique({
      where: {
        id,
      },
      include: {
        historicos: {
          include: {
            usuario: {
              select: this.usuarioSelect,
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 20,
        },
      },
    });

    if (!fornecedor) {
      throw new NotFoundException('Fornecedor não encontrado');
    }

    if (
      usuarioLogado.tipo !== 'SUPER_ADMIN' &&
      fornecedor.empresaId !== obterEmpresaId(usuarioLogado)
    ) {
      throw new ForbiddenException(
        'Acesso negado a fornecedor de outra empresa',
      );
    }

    return fornecedor;
  }

  async atualizar(
    id: string,
    dados: AtualizarFornecedorDto,
    usuarioLogado: AuthenticatedUser,
  ) {
    const fornecedorAnterior = await this.buscarPorId(id, usuarioLogado);

    try {
      const fornecedorAtualizado = await this.prisma.fornecedor.update({
        where: {
          id,
        },
        data: {
          razaoSocial: dados.razaoSocial?.trim(),
          nomeFantasia: dados.nomeFantasia?.trim(),
          documento: dados.documento
            ? this.limparDocumento(dados.documento)
            : undefined,
          inscricaoEstadual: dados.inscricaoEstadual?.trim(),
          inscricaoMunicipal: dados.inscricaoMunicipal?.trim(),
          email: dados.email?.trim().toLowerCase(),
          telefone: dados.telefone?.trim(),
          celular: dados.celular?.trim(),
          contato: dados.contato?.trim(),
          cep: dados.cep ? dados.cep.replace(/\D/g, '') : undefined,
          endereco: dados.endereco?.trim(),
          numero: dados.numero?.trim(),
          complemento: dados.complemento?.trim(),
          bairro: dados.bairro?.trim(),
          cidade: dados.cidade?.trim(),
          estado: dados.estado?.trim().toUpperCase(),
          observacao: dados.observacao?.trim(),
        },
      });

      const descricaoHistorico = this.montarDescricaoAlteracoes(
        fornecedorAnterior,
        fornecedorAtualizado,
      );

      if (descricaoHistorico) {
        await this.registrarHistorico(id, descricaoHistorico, usuarioLogado);
      }

      return fornecedorAtualizado;
    } catch (error) {
      this.tratarErroPrisma(error);
    }
  }

  async ativar(id: string, usuarioLogado: AuthenticatedUser) {
    const fornecedor = await this.buscarPorId(id, usuarioLogado);

    if (fornecedor.ativo) {
      return fornecedor;
    }

    const fornecedorAtualizado = await this.prisma.fornecedor.update({
      where: {
        id,
      },
      data: {
        ativo: true,
      },
    });

    await this.registrarHistorico(id, 'Fornecedor ativado.', usuarioLogado);

    return fornecedorAtualizado;
  }

  async desativar(id: string, usuarioLogado: AuthenticatedUser) {
    const fornecedor = await this.buscarPorId(id, usuarioLogado);

    if (!fornecedor.ativo) {
      return fornecedor;
    }

    const fornecedorAtualizado = await this.prisma.fornecedor.update({
      where: {
        id,
      },
      data: {
        ativo: false,
      },
    });

    await this.registrarHistorico(id, 'Fornecedor desativado.', usuarioLogado);

    return fornecedorAtualizado;
  }

  async adicionarHistorico(
    fornecedorId: string,
    dados: CriarFornecedorHistoricoDto,
    usuarioLogado: AuthenticatedUser,
  ) {
    await this.buscarPorId(fornecedorId, usuarioLogado);

    return this.prisma.fornecedorHistorico.create({
      data: {
        fornecedorId,
        descricao: dados.descricao.trim(),
        usuarioId: usuarioLogado.id,
      },
      include: {
        usuario: {
          select: this.usuarioSelect,
        },
      },
    });
  }

  async listarHistorico(
    fornecedorId: string,
    usuarioLogado: AuthenticatedUser,
  ) {
    await this.buscarPorId(fornecedorId, usuarioLogado);

    return this.prisma.fornecedorHistorico.findMany({
      where: {
        fornecedorId,
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
