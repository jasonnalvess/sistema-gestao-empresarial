import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PaginacaoDto } from '../common/dto/paginacao.dto';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';
import { obterEmpresaId } from '../common/utils/obter-empresa-id';
import { PrismaService } from '../prisma/prisma.service';

type TipoUsuario = 'SUPER_ADMIN' | 'ADMIN_EMPRESA' | 'USUARIO_EMPRESA';

type CriarUsuarioDados = {
  nome: string;
  email: string;
  senha: string;
  tipo: TipoUsuario;
  empresaId?: string;
};

type AtualizarUsuarioDados = {
  nome?: string;
  email?: string;
  tipo?: TipoUsuario;
};

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly selectSeguro = {
    id: true,
    nome: true,
    email: true,
    tipo: true,
    ativo: true,
    empresaId: true,
    createdAt: true,
    updatedAt: true,
  } satisfies Prisma.UsuarioSelect;

  async criar(dados: CriarUsuarioDados, usuarioLogado: AuthenticatedUser) {
    const empresaId =
      usuarioLogado.tipo === 'ADMIN_EMPRESA'
        ? obterEmpresaId(usuarioLogado)
        : (dados.empresaId ?? null);

    if (
      usuarioLogado.tipo === 'ADMIN_EMPRESA' &&
      dados.tipo === 'SUPER_ADMIN'
    ) {
      throw new ForbiddenException(
        'Administrador de empresa não pode criar Super Admin',
      );
    }

    if (dados.tipo === 'SUPER_ADMIN') {
      if (empresaId !== null) {
        throw new BadRequestException(
          'Super Admin não pode possuir empresa vinculada',
        );
      }
    } else {
      if (!empresaId) {
        throw new BadRequestException(
          'Usuário empresarial deve possuir uma empresa',
        );
      }
      const empresa = await this.prisma.empresa.findUnique({
        where: { id: empresaId },
        select: { id: true },
      });
      if (!empresa) {
        throw new NotFoundException('Empresa não encontrada');
      }
    }

    const senhaCriptografada = await bcrypt.hash(dados.senha, 10);

    return this.prisma.usuario.create({
      data: {
        nome: dados.nome,
        email: dados.email,
        senha: senhaCriptografada,
        tipo: dados.tipo,
        empresaId,
      },
      select: this.selectSeguro,
    });
  }

  async listar(usuarioLogado: AuthenticatedUser, paginacao: PaginacaoDto) {
    const page = paginacao.page ?? 1;
    const limit = paginacao.limit ?? 10;
    const { skip, take } = calcularPaginacao(page, limit);

    const where: Prisma.UsuarioWhereInput =
      usuarioLogado.tipo === 'SUPER_ADMIN'
        ? {}
        : { empresaId: obterEmpresaId(usuarioLogado) };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.usuario.findMany({
        where,
        select: this.selectSeguro,
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

  async buscarPorId(id: string, usuarioLogado: AuthenticatedUser) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: this.selectSeguro,
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (
      usuarioLogado.tipo !== 'SUPER_ADMIN' &&
      usuario.empresaId !== obterEmpresaId(usuarioLogado)
    ) {
      throw new ForbiddenException('Acesso negado a usuário de outra empresa');
    }

    return usuario;
  }

  async atualizar(
    id: string,
    dados: AtualizarUsuarioDados,
    usuarioLogado: AuthenticatedUser,
  ) {
    await this.validarUsuarioGerenciavel(id, usuarioLogado);

    if (
      usuarioLogado.tipo === 'ADMIN_EMPRESA' &&
      dados.tipo === 'SUPER_ADMIN'
    ) {
      throw new ForbiddenException(
        'Administrador de empresa não pode definir Super Admin',
      );
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

  async ativar(id: string, usuarioLogado: AuthenticatedUser) {
    await this.validarUsuarioGerenciavel(id, usuarioLogado);

    return this.prisma.usuario.update({
      where: { id },
      data: { ativo: true },
      select: this.selectSeguro,
    });
  }

  async desativar(id: string, usuarioLogado: AuthenticatedUser) {
    await this.validarUsuarioGerenciavel(id, usuarioLogado);

    return this.prisma.usuario.update({
      where: { id },
      data: { ativo: false },
      select: this.selectSeguro,
    });
  }

  private async validarUsuarioGerenciavel(
    id: string,
    usuarioLogado: AuthenticatedUser,
  ) {
    const usuario = await this.buscarPorId(id, usuarioLogado);
    if (
      usuarioLogado.tipo === 'ADMIN_EMPRESA' &&
      usuario.tipo === 'SUPER_ADMIN'
    ) {
      throw new ForbiddenException(
        'Administrador de empresa não pode gerenciar Super Admin',
      );
    }
  }

  buscarPorEmail(email: string) {
    return this.prisma.usuario.findUnique({
      where: { email },
    });
  }

  buscarPorEmailComAutorizacao(email: string) {
    return this.prisma.usuario.findUnique({
      where: { email },
      select: {
        id: true,
        nome: true,
        email: true,
        senha: true,
        tipo: true,
        ativo: true,
        empresaId: true,
        perfis: {
          where: {
            ativo: true,
            perfil: {
              ativo: true,
            },
          },
          select: {
            perfil: {
              select: {
                id: true,
                nome: true,
                chave: true,
                escopo: true,
                empresaId: true,
                permissoes: {
                  where: {
                    permitido: true,
                    permissao: {
                      ativo: true,
                    },
                  },
                  select: {
                    permissao: {
                      select: {
                        chave: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }
}
