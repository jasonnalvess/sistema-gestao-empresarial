import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Deposito, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';
import { AtualizarDepositoDto } from './dto/atualizar-deposito.dto';
import { CriarDepositoDto } from './dto/criar-deposito.dto';
import { FiltroDepositoDto } from './dto/filtro-deposito.dto';

const CAMPOS_ORDENACAO = {
  codigo: 'codigo',
  nome: 'nome',
  ativo: 'ativo',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
} as const satisfies Record<
  string,
  keyof Prisma.DepositoOrderByWithRelationInput
>;

function ehCampoOrdenacao(
  campo: string,
): campo is keyof typeof CAMPOS_ORDENACAO {
  return campo in CAMPOS_ORDENACAO;
}

@Injectable()
export class DepositosService {
  constructor(private readonly prisma: PrismaService) {}

  private tratarP2002(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = error.meta?.target;
      const campos =
        Array.isArray(target) && target.length === 2
          ? target.map(String)
          : null;
      const codigo = campos
        ? campos.includes('empresaId') && campos.includes('codigo')
        : target === 'Deposito_empresaId_codigo_key';
      const nome = campos
        ? campos.includes('empresaId') && campos.includes('nome')
        : target === 'Deposito_empresaId_nome_key';
      if (codigo)
        throw new ConflictException(
          'Já existe um depósito com este código nesta empresa.',
        );
      if (nome)
        throw new ConflictException(
          'Já existe um depósito com este nome nesta empresa.',
        );
    }
    throw error;
  }

  async criar(empresaId: string, dados: CriarDepositoDto) {
    try {
      return await this.prisma.deposito.create({
        data: { ...dados, empresaId },
      });
    } catch (error) {
      this.tratarP2002(error);
    }
  }

  async listar(empresaId: string, filtros: FiltroDepositoDto) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 10;
    const { skip, take } = calcularPaginacao(page, limit);
    const where: Prisma.DepositoWhereInput = { empresaId };
    if (filtros.search) {
      where.OR = [
        { nome: { contains: filtros.search, mode: 'insensitive' } },
        { codigo: { contains: filtros.search, mode: 'insensitive' } },
      ];
    }
    if (filtros.ativo !== undefined) where.ativo = filtros.ativo;
    const campo =
      filtros.sortBy && ehCampoOrdenacao(filtros.sortBy)
        ? CAMPOS_ORDENACAO[filtros.sortBy]
        : 'createdAt';
    const orderBy: Prisma.DepositoOrderByWithRelationInput = {
      [campo]: filtros.order ?? 'desc',
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.deposito.findMany({ where, orderBy, skip, take }),
      this.prisma.deposito.count({ where }),
    ]);
    return respostaPaginada(data, total, page, limit);
  }

  async buscarPorId(empresaId: string, id: string): Promise<Deposito> {
    const deposito = await this.prisma.deposito.findFirst({
      where: { id, empresaId },
    });
    if (!deposito) throw new NotFoundException('Depósito não encontrado.');
    return deposito;
  }

  async atualizar(empresaId: string, id: string, dados: AtualizarDepositoDto) {
    await this.buscarPorId(empresaId, id);
    try {
      return await this.prisma.deposito.update({ where: { id }, data: dados });
    } catch (error) {
      this.tratarP2002(error);
    }
  }

  async ativar(empresaId: string, id: string) {
    await this.buscarPorId(empresaId, id);
    return this.prisma.deposito.update({
      where: { id },
      data: { ativo: true },
    });
  }

  async desativar(empresaId: string, id: string) {
    await this.buscarPorId(empresaId, id);
    return this.prisma.deposito.update({
      where: { id },
      data: { ativo: false },
    });
  }
}
