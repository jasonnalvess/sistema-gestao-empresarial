import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
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
    const usuarioAtual = await this.validarUsuarioGerenciavel(
      id,
      usuarioLogado,
    );

    if (
      usuarioLogado.tipo === 'ADMIN_EMPRESA' &&
      dados.tipo === 'SUPER_ADMIN'
    ) {
      throw new ForbiddenException(
        'Administrador de empresa não pode definir Super Admin',
      );
    }

    if (dados.tipo !== undefined) {
      for (let tentativa = 0; tentativa < 3; tentativa++) {
        try {
          return await this.prisma.$transaction(
            async (tx) => {
              await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id" = ${usuarioLogado.id} FOR UPDATE`;
              const empresaId = usuarioAtual.empresaId;
              const vinculo = empresaId
                ? await tx.funcionario.findFirst({
                    where: { empresaId, usuarioId: id },
                    select: { id: true },
                  })
                : null;
              if (vinculo)
                await tx.$queryRaw`SELECT "id" FROM "Funcionario" WHERE "id" = ${vinculo.id} AND "empresaId" = ${empresaId} FOR UPDATE`;
              await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id" = ${id} AND "empresaId" IS NOT DISTINCT FROM ${empresaId} FOR UPDATE`;
              const atual = await tx.usuario.findFirst({
                where: { id, empresaId },
                select: this.selectSeguro,
              });
              if (
                !atual ||
                (usuarioLogado.tipo === 'ADMIN_EMPRESA' &&
                  atual.tipo === 'SUPER_ADMIN')
              )
                throw new ConflictException(
                  'Usuário alterado durante a operação.',
                );
              const associado = empresaId
                ? await tx.funcionario.findFirst({
                    where: { empresaId, usuarioId: id },
                    select: { id: true },
                  })
                : null;
              if (associado && dados.tipo !== 'USUARIO_EMPRESA')
                throw new ConflictException(
                  'Usuário associado a funcionário deve permanecer USUARIO_EMPRESA.',
                );
              return tx.usuario.update({
                where: { id },
                data: {
                  nome: dados.nome,
                  email: dados.email,
                  tipo: dados.tipo,
                  ...(dados.tipo !== atual.tipo
                    ? { versaoAutorizacao: { increment: 1 } }
                    : {}),
                },
                select: this.selectSeguro,
              });
            },
            { isolationLevel: 'Serializable' },
          );
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            (error.code === 'P2034' ||
              (error.code === 'P2010' &&
                ['40001', '40P01'].includes(String(error.meta?.code))))
          ) {
            if (tentativa < 2) continue;
            throw new ConflictException(
              'Alteração concorrente. Tente novamente.',
            );
          }
          throw error;
        }
      }
      throw new ConflictException('Alteração concorrente. Tente novamente.');
    }
    return this.prisma.usuario.update({
      where: { id },
      data: {
        nome: dados.nome,
        email: dados.email,
        tipo: dados.tipo,
        ...(dados.tipo !== undefined && dados.tipo !== usuarioAtual.tipo
          ? { versaoAutorizacao: { increment: 1 } }
          : {}),
      },
      select: this.selectSeguro,
    });
  }

  ativar(id: string, usuarioLogado: AuthenticatedUser) {
    return this.alterarAcesso(id, usuarioLogado, true);
  }

  desativar(id: string, usuarioLogado: AuthenticatedUser) {
    return this.alterarAcesso(id, usuarioLogado, false);
  }

  private async alterarAcesso(
    id: string,
    ator: AuthenticatedUser,
    ativo: boolean,
  ) {
    const alvoInicial = await this.validarUsuarioGerenciavel(id, ator);
    // Mantém a decisão inicial entre retries: uma desvinculação concorrente
    // não transforma esta ativação em ativação de uma conta independente.
    const vinculoInicial =
      ativo && alvoInicial.empresaId
        ? await this.prisma.funcionario.findFirst({
            where: { empresaId: alvoInicial.empresaId, usuarioId: id },
            select: { id: true },
          })
        : null;
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            // Mesma ordem do RH: ator -> funcionário -> usuário vinculado.
            await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id" = ${ator.id} FOR UPDATE`;
            const atual = await tx.usuario.findFirst({
              where: { id: ator.id },
              select: {
                ativo: true,
                tipo: true,
                empresaId: true,
                versaoAutorizacao: true,
              },
            });
            if (
              !atual ||
              !atual.ativo ||
              !Number.isSafeInteger(ator.versaoAutorizacao) ||
              atual.versaoAutorizacao !== ator.versaoAutorizacao ||
              atual.tipo !== ator.tipo ||
              atual.empresaId !== ator.empresaId
            )
              throw new UnauthorizedException(
                'Sessão inválida. Faça login novamente.',
              );
            const permissao = ativo ? 'usuarios.ativar' : 'usuarios.inativar';
            if (
              !['SUPER_ADMIN', 'ADMIN_EMPRESA'].includes(atual.tipo) ||
              !ator.permissoes?.includes(permissao)
            )
              throw new ForbiddenException('Operação não autorizada.');
            const autorizado = await tx.usuarioPerfil.count({
              where: {
                usuarioId: ator.id,
                ativo: true,
                perfil: {
                  ativo: true,
                  empresaId: atual.empresaId,
                  escopo: atual.tipo === 'SUPER_ADMIN' ? 'SISTEMA' : 'EMPRESA',
                  permissoes: {
                    some: {
                      permitido: true,
                      permissao: { chave: permissao, ativo: true },
                    },
                  },
                },
              },
            });
            if (!autorizado)
              throw new ForbiddenException('Operação não autorizada.');
            const empresaId = alvoInicial.empresaId;
            const vinculo = empresaId
              ? await tx.funcionario.findFirst({
                  where: { usuarioId: id, empresaId },
                  select: { id: true },
                })
              : null;
            if (ativo && vinculo?.id !== vinculoInicial?.id)
              throw new ConflictException(
                'Vínculo alterado durante a operação. Tente novamente.',
              );
            if (vinculo)
              await tx.$queryRaw`SELECT "id" FROM "Funcionario" WHERE "id" = ${vinculo.id} AND "empresaId" = ${empresaId} FOR UPDATE`;
            await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id" = ${id} AND "empresaId" IS NOT DISTINCT FROM ${empresaId} FOR UPDATE`;
            const alvo = await tx.usuario.findFirst({
              where: { id, empresaId },
              select: this.selectSeguro,
            });
            if (!alvo)
              throw new ConflictException(
                'Usuário alterado durante a operação.',
              );
            if (
              ator.tipo === 'ADMIN_EMPRESA' &&
              (alvo.empresaId !== ator.empresaId || alvo.tipo === 'SUPER_ADMIN')
            )
              throw new ForbiddenException('Acesso negado a este usuário.');
            const funcionario = empresaId
              ? await tx.funcionario.findFirst({
                  where: { usuarioId: id, empresaId },
                  select: { id: true, status: true },
                })
              : null;
            if (funcionario?.id !== vinculo?.id)
              throw new ConflictException(
                'Vínculo alterado durante a operação. Tente novamente.',
              );
            if (funcionario && alvo.tipo !== 'USUARIO_EMPRESA')
              throw new ConflictException(
                'Vínculo de usuário incompatível com o funcionário.',
              );
            if (
              ativo &&
              funcionario &&
              ['INATIVO', 'DESLIGADO'].includes(funcionario.status)
            )
              throw new ConflictException(
                'Funcionário inativo ou desligado não pode ter acesso ativado.',
              );
            if (alvo.ativo === ativo) return alvo;
            const depois = await tx.usuario.update({
              where: { id, empresaId },
              data: {
                ativo,
                ...(!ativo ? { versaoAutorizacao: { increment: 1 } } : {}),
              },
              select: this.selectSeguro,
            });
            if (funcionario && empresaId)
              await tx.funcionarioHistorico.create({
                data: {
                  empresaId,
                  funcionarioId: funcionario.id,
                  tipo: ativo ? 'REATIVACAO_ACESSO' : 'INATIVACAO_ACESSO',
                  statusAnterior: funcionario.status,
                  statusNovo: funcionario.status,
                  origem: 'USUARIO',
                  acessoAnterior: ativo ? 'USUARIO_INATIVO' : 'USUARIO_ATIVO',
                  acessoNovo: ativo ? 'USUARIO_ATIVO' : 'USUARIO_INATIVO',
                  atorUsuarioId: ator.id,
                  usuarioAfetadoId: id,
                  operacaoId: randomUUID(),
                },
              });
            return depois;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === 'P2034' ||
            (error.code === 'P2010' &&
              ['40001', '40P01'].includes(String(error.meta?.code))))
        ) {
          if (tentativa < 2) continue;
          throw new ConflictException(
            'Alteração concorrente. Tente novamente.',
          );
        }
        throw error;
      }
    }
    throw new ConflictException('Alteração concorrente. Tente novamente.');
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
    return usuario;
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
        trocaSenhaObrigatoria: true,
        versaoAutorizacao: true,
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
