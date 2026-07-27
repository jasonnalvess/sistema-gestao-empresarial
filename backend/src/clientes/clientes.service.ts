import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { obterEmpresaId } from '../common/utils/obter-empresa-id';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';
import { PrismaService } from '../prisma/prisma.service';
import { CriarClienteHistoricoDto } from './dto/criar-cliente-historico.dto';
import { CriarClienteDto } from './dto/criar-cliente.dto';
import { FiltroClientesDto } from './dto/filtro-clientes.dto';

@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(dados: CriarClienteDto, usuarioLogado: AuthenticatedUser) {
    const empresaId = obterEmpresaId(usuarioLogado);

    return this.prisma.cliente.create({
      data: {
        ...dados,
        tipo: dados.tipo ?? 'PF',
        empresaId,
      },
    });
  }

  async listar(usuarioLogado: AuthenticatedUser, paginacao: FiltroClientesDto) {
    const page = paginacao.page ?? 1;
    const limit = paginacao.limit ?? 10;
    const { skip, take } = calcularPaginacao(page, limit);

    const where: Prisma.ClienteWhereInput =
      usuarioLogado.tipo === 'SUPER_ADMIN'
        ? {}
        : {
            empresaId: obterEmpresaId(usuarioLogado),
          };

    if (paginacao.search) {
      where.OR = [
        {
          nome: {
            contains: paginacao.search,
            mode: 'insensitive',
          },
        },
        {
          documento: {
            contains: paginacao.search,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: paginacao.search,
            mode: 'insensitive',
          },
        },
        {
          celular: {
            contains: paginacao.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (paginacao.tipo) {
      where.tipo = paginacao.tipo;
    }

    if (paginacao.ativo) {
      where.ativo = paginacao.ativo === 'true';
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.cliente.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take,
      }),
      this.prisma.cliente.count({
        where,
      }),
    ]);

    return respostaPaginada(data, total, page, limit);
  }

  async buscarPorId(id: string, usuarioLogado: AuthenticatedUser) {
    const cliente = await this.prisma.cliente.findUnique({
      where: {
        id,
      },
      include: {
        agendaEventos: {
          orderBy: {
            dataInicio: 'desc',
          },
          take: 10,
        },
        ordensServico: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente não encontrado');
    }

    if (
      usuarioLogado.tipo !== 'SUPER_ADMIN' &&
      cliente.empresaId !== obterEmpresaId(usuarioLogado)
    ) {
      throw new ForbiddenException('Acesso negado a cliente de outra empresa');
    }

    return cliente;
  }

  async atualizar(
    id: string,
    dados: Partial<CriarClienteDto>,
    usuarioLogado: AuthenticatedUser,
  ) {
    await this.buscarPorId(id, usuarioLogado);

    return this.prisma.cliente.update({
      where: {
        id,
      },
      data: dados,
    });
  }

  async ativar(id: string, usuarioLogado: AuthenticatedUser) {
    await this.buscarPorId(id, usuarioLogado);

    return this.prisma.cliente.update({
      where: {
        id,
      },
      data: {
        ativo: true,
      },
    });
  }

  async desativar(id: string, usuarioLogado: AuthenticatedUser) {
    await this.buscarPorId(id, usuarioLogado);

    return this.prisma.cliente.update({
      where: {
        id,
      },
      data: {
        ativo: false,
      },
    });
  }

  async adicionarHistorico(
    clienteId: string,
    dados: CriarClienteHistoricoDto,
    usuarioLogado: AuthenticatedUser,
  ) {
    await this.buscarPorId(clienteId, usuarioLogado);

    return this.prisma.clienteHistorico.create({
      data: {
        clienteId,
        descricao: dados.descricao,
        usuarioId: usuarioLogado.id,
      },
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
    });
  }

  async listarHistorico(clienteId: string, usuarioLogado: AuthenticatedUser) {
    await this.buscarPorId(clienteId, usuarioLogado);

    return this.prisma.clienteHistorico.findMany({
      where: {
        clienteId,
      },
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
        createdAt: 'desc',
      },
    });
  }
}
