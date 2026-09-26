import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';
import {
  CriarEstruturaRhDto,
  EditarEstruturaRhDto,
  FiltroEstruturaRhDto,
} from './estrutura-rh.dto';

const select = {
  id: true,
  nome: true,
  descricao: true,
  ativo: true,
  createdAt: true,
  updatedAt: true,
};

// Cargo e Departamento compartilham o mesmo contrato de cadastro.
export class EstruturaRhService {
  constructor(
    protected readonly prisma: PrismaService,
    private readonly entidade: 'cargo' | 'departamento',
  ) {}
  async listar(empresaId: string, filtros: FiltroEstruturaRhDto) {
    const { page = 1, limit = 10, search, ativo } = filtros;
    const where = {
      empresaId,
      ativo,
      ...(search
        ? {
            OR: [
              { nome: { contains: search, mode: 'insensitive' as const } },
              { descricao: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const args = {
      where,
      select,
      ...calcularPaginacao(page, limit),
      orderBy: [{ nome: 'asc' as const }, { id: 'asc' as const }],
    };
    const [data, total] = await Promise.all([
      this.entidade === 'cargo'
        ? this.prisma.cargo.findMany(args)
        : this.prisma.departamento.findMany(args),
      this.entidade === 'cargo'
        ? this.prisma.cargo.count({ where })
        : this.prisma.departamento.count({ where }),
    ]);
    return respostaPaginada(data, total, page, limit);
  }
  async buscar(empresaId: string, id: string) {
    const args = { where: { id, empresaId }, select };
    const registro = await (this.entidade === 'cargo'
      ? this.prisma.cargo.findFirst(args)
      : this.prisma.departamento.findFirst(args));
    if (!registro) throw new NotFoundException('Registro não encontrado.');
    return registro;
  }
  criar(empresaId: string, dados: CriarEstruturaRhDto) {
    return this.tratar(async () => {
      const args = {
        data: {
          empresaId,
          nome: dados.nome.trim(),
          descricao: dados.descricao?.trim() || null,
          ativo: true,
        },
        select,
      };
      return this.entidade === 'cargo'
        ? this.prisma.cargo.create(args)
        : this.prisma.departamento.create(args);
    });
  }
  async editar(empresaId: string, id: string, dados: EditarEstruturaRhDto) {
    await this.buscar(empresaId, id);
    return this.atualizar(empresaId, id, {
      ...(dados.nome !== undefined ? { nome: dados.nome.trim() } : {}),
      ...(dados.descricao !== undefined
        ? { descricao: dados.descricao?.trim() || null }
        : {}),
    });
  }
  async alterarAtivo(empresaId: string, id: string, ativo: boolean) {
    await this.buscar(empresaId, id);
    return this.atualizar(empresaId, id, { ativo });
  }
  private atualizar(
    empresaId: string,
    id: string,
    data: Prisma.CargoUpdateInput,
  ) {
    return this.tratar(async () => {
      const args = { where: { id, empresaId }, data, select };
      return this.entidade === 'cargo'
        ? this.prisma.cargo.update(args)
        : this.prisma.departamento.update(args);
    });
  }
  private async tratar<T>(operacao: () => Promise<T>): Promise<T> {
    try {
      return await operacao();
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002')
          throw new ConflictException(
            'Já existe um registro com este nome nesta empresa.',
          );
        if (e.code === 'P2025')
          throw new NotFoundException('Registro não encontrado.');
      }
      throw e;
    }
  }
}
