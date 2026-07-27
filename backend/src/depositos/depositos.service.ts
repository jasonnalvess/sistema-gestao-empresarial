import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Deposito } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { CriarDepositoDto } from './dto/criar-deposito.dto';
import { AtualizarDepositoDto } from './dto/atualizar-deposito.dto';
import { FiltroDepositoDto } from './dto/filtro-deposito.dto';

import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { obterEmpresaId } from '../common/utils/obter-empresa-id';

@Injectable()
export class DepositosService {
  constructor(private readonly prisma: PrismaService) {}

  private tratarErro(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Já existe um depósito com esse nome ou código.',
      );
    }

    throw error;
  }

  async criar(dados: CriarDepositoDto, usuario: AuthenticatedUser) {
    try {
      return await this.prisma.deposito.create({
        data: {
          ...dados,
          empresaId: obterEmpresaId(usuario),
        },
      });
    } catch (error) {
      this.tratarErro(error);
    }
  }

  async listar(usuario: AuthenticatedUser, filtros: FiltroDepositoDto) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 10;

    const { skip, take } = calcularPaginacao(page, limit);

    const where: Prisma.DepositoWhereInput =
      usuario.tipo === 'SUPER_ADMIN'
        ? {}
        : { empresaId: obterEmpresaId(usuario) };

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
      ];
    }

    if (filtros.ativo !== undefined) {
      where.ativo = filtros.ativo;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.deposito.findMany({
        where,
        orderBy: {
          [filtros.sortBy ?? 'createdAt']: filtros.order ?? 'desc',
        },
        skip,
        take,
      }),
      this.prisma.deposito.count({ where }),
    ]);

    return respostaPaginada(data, total, page, limit);
  }

  async buscarPorId(id: string, usuario: AuthenticatedUser): Promise<Deposito> {
    const deposito = await this.prisma.deposito.findUnique({
      where: { id },
    });

    if (!deposito) {
      throw new NotFoundException('Depósito não encontrado.');
    }

    if (
      usuario.tipo !== 'SUPER_ADMIN' &&
      deposito.empresaId !== obterEmpresaId(usuario)
    ) {
      throw new ForbiddenException('Depósito pertence a outra empresa.');
    }

    return deposito;
  }

  async atualizar(
    id: string,
    dados: AtualizarDepositoDto,
    usuario: AuthenticatedUser,
  ) {
    await this.buscarPorId(id, usuario);

    try {
      return await this.prisma.deposito.update({
        where: { id },
        data: dados,
      });
    } catch (error) {
      this.tratarErro(error);
    }
  }

  async ativar(id: string, usuario: AuthenticatedUser) {
    await this.buscarPorId(id, usuario);

    return this.prisma.deposito.update({
      where: { id },
      data: {
        ativo: true,
      },
    });
  }

  async desativar(id: string, usuario: AuthenticatedUser) {
    await this.buscarPorId(id, usuario);

    return this.prisma.deposito.update({
      where: { id },
      data: {
        ativo: false,
      },
    });
  }
}
