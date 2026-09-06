import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';
import { FiltroPerfisDto } from './dto/filtro-perfis.dto';

const perfilSelect = {
  id: true,
  nome: true,
  chave: true,
  descricao: true,
  sistema: true,
  escopo: true,
  ativo: true,
  empresaId: true,
} satisfies Prisma.PerfilSelect;

@Injectable()
export class PerfisService {
  constructor(private readonly prisma: PrismaService) {}

  listar(empresaId: string, filtros: FiltroPerfisDto) {
    return this.listarContexto({ empresaId, escopo: 'EMPRESA' }, filtros);
  }

  listarGlobais(filtros: FiltroPerfisDto) {
    return this.listarContexto({ empresaId: null, escopo: 'SISTEMA' }, filtros);
  }

  private async listarContexto(
    contexto: Prisma.PerfilWhereInput,
    filtros: FiltroPerfisDto,
  ) {
    const { page = 1, limit = 10, ativo, sistema, search } = filtros;
    const where: Prisma.PerfilWhereInput = {
      ...contexto,
      ativo,
      sistema,
      ...(search
        ? {
            OR: [
              { nome: { contains: search, mode: 'insensitive' } },
              { chave: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.perfil.findMany({
        where,
        select: perfilSelect,
        ...calcularPaginacao(page, limit),
        orderBy: [{ nome: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.perfil.count({ where }),
    ]);
    return respostaPaginada(data, total, page, limit);
  }

  buscar(empresaId: string, id: string) {
    return this.buscarContexto({ id, empresaId, escopo: 'EMPRESA' });
  }

  buscarGlobal(id: string) {
    return this.buscarContexto({ id, empresaId: null, escopo: 'SISTEMA' });
  }

  private async buscarContexto(where: Prisma.PerfilWhereInput) {
    const perfil = await this.prisma.perfil.findFirst({
      where,
      select: {
        ...perfilSelect,
        permissoes: {
          orderBy: { permissao: { chave: 'asc' } },
          select: {
            permitido: true,
            permissao: {
              select: {
                id: true,
                chave: true,
                nome: true,
                descricao: true,
                modulo: true,
                ativo: true,
              },
            },
          },
        },
      },
    });
    if (!perfil) throw new NotFoundException('Perfil não encontrado.');
    return {
      ...perfil,
      permissoes: perfil.permissoes.map(({ permissao, permitido }) => ({
        ...permissao,
        permitido,
      })),
    };
  }
}
