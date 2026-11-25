import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';
import { PrismaService } from '../prisma/prisma.service';
import { AtualizarClienteDto } from './dto/atualizar-cliente.dto';
import { CriarClienteHistoricoDto } from './dto/criar-cliente-historico.dto';
import { CriarClienteDto } from './dto/criar-cliente.dto';
import { FiltroClientesDto } from './dto/filtro-clientes.dto';

@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly usuarioSelect = {
    id: true,
    nome: true,
    email: true,
    tipo: true,
  };

  private limparDocumento(documento: string) {
    return documento.replace(/\D/g, '');
  }

  private tratarErroPrisma(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.map(String)
        : [];

      if (
        target.length === 2 &&
        target.includes('empresaId') &&
        target.includes('documento')
      ) {
        throw new ConflictException(
          'Já existe um cliente com este CPF/CNPJ nesta empresa.',
        );
      }
    }

    throw error;
  }

  private valorComparavel(
    valor: string | number | boolean | null | undefined,
  ): string {
    if (valor === null || valor === undefined) return '';
    return String(valor);
  }

  private valorExibicao(
    valor: string | number | boolean | null | undefined,
  ): string {
    if (valor === null || valor === undefined || valor === '') {
      return 'não informado';
    }
    return String(valor);
  }

  private montarDescricaoAlteracoes(
    anterior: Prisma.ClienteGetPayload<object>,
    atualizado: Prisma.ClienteGetPayload<object>,
  ): string | null {
    const campos = [
      { label: 'Nome', anterior: anterior.nome, atualizado: atualizado.nome },
      { label: 'Tipo', anterior: anterior.tipo, atualizado: atualizado.tipo },
      {
        label: 'Documento',
        anterior: anterior.documento,
        atualizado: atualizado.documento,
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
        label: 'Endereço',
        anterior: anterior.endereco,
        atualizado: atualizado.endereco,
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
      { label: 'CEP', anterior: anterior.cep, atualizado: atualizado.cep },
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
          `${campo.label}: ${this.valorExibicao(campo.anterior)} → ${this.valorExibicao(campo.atualizado)}`,
      );

    if (alteracoes.length === 0) return null;
    return `Cliente atualizado.\n${alteracoes.join('\n')}`;
  }

  private async registrarHistorico(
    clienteId: string,
    descricao: string,
    usuarioLogado: AuthenticatedUser,
  ) {
    return this.prisma.clienteHistorico.create({
      data: { clienteId, descricao, usuarioId: usuarioLogado.id },
    });
  }

  async criar(
    empresaId: string,
    dados: CriarClienteDto,
    usuarioLogado: AuthenticatedUser,
  ) {
    const cliente = await this.prisma.cliente
      .create({
        data: {
          nome: dados.nome.trim(),
          tipo: (dados.tipo ?? 'PF').trim().toUpperCase(),
          documento: dados.documento
            ? this.limparDocumento(dados.documento)
            : undefined,
          email: dados.email?.trim().toLowerCase(),
          telefone: dados.telefone?.trim(),
          celular: dados.celular?.trim(),
          endereco: dados.endereco?.trim(),
          cidade: dados.cidade?.trim(),
          estado: dados.estado?.trim().toUpperCase(),
          cep: dados.cep ? dados.cep.replace(/\D/g, '') : undefined,
          observacao: dados.observacao?.trim(),
          empresaId,
        },
      })
      .catch((error: unknown) => this.tratarErroPrisma(error));

    await this.registrarHistorico(
      cliente.id,
      'Cliente cadastrado.',
      usuarioLogado,
    );
    return cliente;
  }

  async listar(empresaId: string, paginacao: FiltroClientesDto) {
    const page = paginacao.page ?? 1;
    const limit = paginacao.limit ?? 10;
    const { skip, take } = calcularPaginacao(page, limit);
    const where: Prisma.ClienteWhereInput = { empresaId };

    if (paginacao.search) {
      where.OR = [
        { nome: { contains: paginacao.search, mode: 'insensitive' } },
        {
          documento: {
            contains: this.limparDocumento(paginacao.search),
            mode: 'insensitive',
          },
        },
        { email: { contains: paginacao.search, mode: 'insensitive' } },
        { celular: { contains: paginacao.search, mode: 'insensitive' } },
      ];
    }
    if (paginacao.tipo) where.tipo = paginacao.tipo;
    if (paginacao.ativo) where.ativo = paginacao.ativo === 'true';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.cliente.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.cliente.count({ where }),
    ]);
    return respostaPaginada(data, total, page, limit);
  }

  async buscarPorId(empresaId: string, id: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id, empresaId },
      include: {
        agendaEventos: { orderBy: { dataInicio: 'desc' }, take: 10 },
        ordensServico: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!cliente) throw new NotFoundException('Cliente não encontrado');
    return cliente;
  }

  async atualizar(
    empresaId: string,
    id: string,
    dados: AtualizarClienteDto,
    usuarioLogado: AuthenticatedUser,
  ) {
    const clienteAnterior = await this.buscarPorId(empresaId, id);
    const clienteAtualizado = await this.prisma.cliente
      .update({
        where: { id },
        data: {
          nome: dados.nome?.trim(),
          tipo: dados.tipo?.trim().toUpperCase(),
          documento: dados.documento
            ? this.limparDocumento(dados.documento)
            : undefined,
          email: dados.email?.trim().toLowerCase(),
          telefone: dados.telefone?.trim(),
          celular: dados.celular?.trim(),
          endereco: dados.endereco?.trim(),
          cidade: dados.cidade?.trim(),
          estado: dados.estado?.trim().toUpperCase(),
          cep: dados.cep ? dados.cep.replace(/\D/g, '') : undefined,
          observacao: dados.observacao?.trim(),
        },
      })
      .catch((error: unknown) => this.tratarErroPrisma(error));
    const descricao = this.montarDescricaoAlteracoes(
      clienteAnterior,
      clienteAtualizado,
    );
    if (descricao) await this.registrarHistorico(id, descricao, usuarioLogado);
    return clienteAtualizado;
  }

  async ativar(
    empresaId: string,
    id: string,
    usuarioLogado: AuthenticatedUser,
  ) {
    const cliente = await this.buscarPorId(empresaId, id);
    if (cliente.ativo) return cliente;
    const atualizado = await this.prisma.cliente.update({
      where: { id },
      data: { ativo: true },
    });
    await this.registrarHistorico(id, 'Cliente ativado.', usuarioLogado);
    return atualizado;
  }

  async desativar(
    empresaId: string,
    id: string,
    usuarioLogado: AuthenticatedUser,
  ) {
    const cliente = await this.buscarPorId(empresaId, id);
    if (!cliente.ativo) return cliente;
    const atualizado = await this.prisma.cliente.update({
      where: { id },
      data: { ativo: false },
    });
    await this.registrarHistorico(id, 'Cliente desativado.', usuarioLogado);
    return atualizado;
  }

  async adicionarHistorico(
    empresaId: string,
    clienteId: string,
    dados: CriarClienteHistoricoDto,
    usuarioLogado: AuthenticatedUser,
  ) {
    await this.buscarPorId(empresaId, clienteId);
    return this.prisma.clienteHistorico.create({
      data: {
        clienteId,
        descricao: dados.descricao.trim(),
        usuarioId: usuarioLogado.id,
      },
      include: { usuario: { select: this.usuarioSelect } },
    });
  }

  async listarHistorico(empresaId: string, clienteId: string) {
    await this.buscarPorId(empresaId, clienteId);
    return this.prisma.clienteHistorico.findMany({
      where: { clienteId },
      include: { usuario: { select: this.usuarioSelect } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
