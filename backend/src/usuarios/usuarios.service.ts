import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { respostaPaginada } from '../common/utils/resposta-paginada';
import { PaginacaoDto } from '../common/dto/paginacao.dto';
import { calcularPaginacao } from '../common/utils/paginacao';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  private selectSeguro = {
    id: true,
    nome: true,
    email: true,
    tipo: true,
    ativo: true,
    empresaId: true,
    createdAt: true,
    updatedAt: true,
  };

  async criar(
    dados: {
      nome: string;
      email: string;
      senha: string;
      tipo: 'SUPER_ADMIN' | 'ADMIN_EMPRESA' | 'USUARIO_EMPRESA';
      empresaId?: string;
    },
    usuarioLogado?: any,
  ) {
    if (usuarioLogado?.tipo === 'ADMIN_EMPRESA') {
      if (dados.tipo === 'SUPER_ADMIN') {
        throw new ForbiddenException('Administrador de empresa não pode criar Super Admin');
      }

      dados.empresaId = usuarioLogado.empresaId;
    }

    const senhaCriptografada = await bcrypt.hash(dados.senha, 10);

    return this.prisma.usuario.create({
      data: {
        nome: dados.nome,
        email: dados.email,
        senha: senhaCriptografada,
        tipo: dados.tipo,
        empresaId: dados.empresaId,
      },
      select: this.selectSeguro,
    });
  }

  async listar(usuarioLogado: any, paginacao: PaginacaoDto) {
  const page = paginacao.page ?? 1;
  const limit = paginacao.limit ?? 10;

  const { skip, take } = calcularPaginacao(page, limit);

  const where: any =
    usuarioLogado.tipo === 'SUPER_ADMIN'
      ? {}
      : { empresaId: usuarioLogado.empresaId };

  const [data, total] = await this.prisma.$transaction([
    this.prisma.usuario.findMany({
      where,
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
        ativo: true,
        empresaId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take,
    }),
    this.prisma.usuario.count({
      where,
    }),
  ]);

  return respostaPaginada(data, total, page, limit);
}

  async buscarPorId(id: string, usuarioLogado?: any) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: this.selectSeguro,
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (
      usuarioLogado?.tipo !== 'SUPER_ADMIN' &&
      usuario.empresaId !== usuarioLogado.empresaId
    ) {
      throw new ForbiddenException('Acesso negado a usuário de outra empresa');
    }

    return usuario;
  }

async atualizar(
  id: string,
  dados: {
    nome?: string;
    email?: string;
    tipo?: 'SUPER_ADMIN' | 'ADMIN_EMPRESA' | 'USUARIO_EMPRESA';
  },
  usuarioLogado?: any,
) {
  await this.buscarPorId(id, usuarioLogado);

  if (usuarioLogado?.tipo === 'ADMIN_EMPRESA') {
    if (dados.tipo === 'SUPER_ADMIN') {
      throw new ForbiddenException('Administrador de empresa não pode definir Super Admin');
    }
  }

  return this.prisma.usuario.update({
    where: { id },
    data: {
      nome: dados.nome,
      email: dados.email,
      tipo: dados.tipo,
    },
    select: this.selectSeguro,
  });
}

  async ativar(id: string, usuarioLogado?: any) {
    await this.buscarPorId(id, usuarioLogado);

    return this.prisma.usuario.update({
      where: { id },
      data: { ativo: true },
      select: this.selectSeguro,
    });
  }

  async desativar(id: string, usuarioLogado?: any) {
    await this.buscarPorId(id, usuarioLogado);

    return this.prisma.usuario.update({
      where: { id },
      data: { ativo: false },
      select: this.selectSeguro,
    });
  }

  buscarPorEmail(email: string) {
    return this.prisma.usuario.findUnique({
      where: { email },
    });
  }
}
