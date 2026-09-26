import { AtualizarPerfisUsuarioDto } from './dto/atualizar-perfis-usuario.dto';
import { PERMISSOES_EMPRESARIAIS_DELEGAVEIS } from '../perfis/permissoes-delegaveis';
import { prepararJsonAuditoria } from '../auditoria/auditoria-sanitizer';
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
import { isUUID } from 'class-validator';
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

const perfilAtribuidoSelect = {
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

  async listar(
    usuarioLogado: AuthenticatedUser,
    paginacao: PaginacaoDto,
    empresaSelecionada?: string,
  ) {
    const page = paginacao.page ?? 1;
    const limit = paginacao.limit ?? 10;
    const { skip, take } = calcularPaginacao(page, limit);

    const empresaSelecionadaNormalizada = empresaSelecionada?.trim() || null;

    let where: Prisma.UsuarioWhereInput;

    if (usuarioLogado.tipo === 'SUPER_ADMIN') {
      if (!empresaSelecionadaNormalizada) {
        where = {};
      } else {
        if (!isUUID(empresaSelecionadaNormalizada)) {
          throw new BadRequestException('Empresa selecionada inválida.');
        }

        const empresa = await this.prisma.empresa.findUnique({
          where: { id: empresaSelecionadaNormalizada },
          select: { id: true, ativa: true },
        });

        if (!empresa) {
          throw new NotFoundException('Empresa não encontrada.');
        }

        if (!empresa.ativa) {
          throw new ForbiddenException(
            'Empresa inativa não pode utilizar este módulo.',
          );
        }

        where = { empresaId: empresa.id };
      }
    } else {
      where = { empresaId: obterEmpresaId(usuarioLogado) };
    }

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

  async listarPerfis(id: string, ator: AuthenticatedUser) {
    this.validarGestaoPerfis(ator);
    const alvo = await this.alvoParaPerfis(this.prisma, id, ator);
    return this.perfisAtivosDoUsuario(this.prisma, id, alvo.empresaId);
  }

  async atualizarPerfis(
    id: string,
    dados: AtualizarPerfisUsuarioDto,
    ator: AuthenticatedUser,
  ) {
    this.validarGestaoPerfis(ator);
    const ids = [...dados.perfisIds].sort();
    if (new Set(ids).size !== ids.length)
      throw new BadRequestException('Perfis duplicados.');
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id" = ${ator.id} FOR UPDATE`;
            const atual = await tx.usuario.findUnique({
              where: { id: ator.id },
              select: {
                ativo: true,
                tipo: true,
                empresaId: true,
                versaoAutorizacao: true,
              },
            });
            if (
              !atual?.ativo ||
              !Number.isSafeInteger(ator.versaoAutorizacao) ||
              atual.versaoAutorizacao !== ator.versaoAutorizacao ||
              atual.tipo !== ator.tipo ||
              atual.empresaId !== ator.empresaId ||
              (atual.tipo === 'SUPER_ADMIN' && atual.empresaId !== null)
            )
              throw new UnauthorizedException(
                'Sessão inválida. Faça login novamente.',
              );
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
                      permissao: {
                        chave: 'usuarios.perfis.gerenciar',
                        ativo: true,
                      },
                    },
                  },
                },
              },
            });
            if (!autorizado)
              throw new ForbiddenException('Operação não autorizada.');
            const inicial = await this.alvoParaPerfis(tx, id, ator);
            await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id" = ${id} AND "empresaId" = ${inicial.empresaId} FOR UPDATE`;
            const alvo = await this.alvoParaPerfis(tx, id, ator);
            const empresa = await tx.empresa.findUnique({
              where: { id: alvo.empresaId },
              select: { ativa: true },
            });
            if (!empresa?.ativa)
              throw new ForbiddenException('Empresa indisponível.');
            // Mesmo bloqueio usado por PerfisService; ordem estável para múltiplos perfis.
            for (const perfilId of ids)
              await tx.$queryRaw`SELECT "id" FROM "Perfil" WHERE "id" = ${perfilId} AND "empresaId" = ${alvo.empresaId} FOR UPDATE`;
            const perfis = await tx.perfil.findMany({
              where: {
                id: { in: ids },
                empresaId: alvo.empresaId,
                escopo: 'EMPRESA',
                ativo: true,
              },
              select: {
                ...perfilAtribuidoSelect,
                permissoes: {
                  where: { permitido: true, permissao: { ativo: true } },
                  select: {
                    permitido: true,
                    permissao: { select: { chave: true, ativo: true } },
                  },
                },
              },
              orderBy: { id: 'asc' },
            });
            if (perfis.length !== ids.length)
              throw new BadRequestException(
                'Perfil inexistente ou indisponível para esta empresa.',
              );
            if (ator.tipo === 'ADMIN_EMPRESA') {
              for (const perfil of perfis)
                for (const item of perfil.permissoes) {
                  if (
                    item.permitido &&
                    item.permissao.ativo &&
                    (!PERMISSOES_EMPRESARIAIS_DELEGAVEIS.includes(
                      item.permissao.chave,
                    ) ||
                      !ator.permissoes?.includes(item.permissao.chave))
                  )
                    throw new ForbiddenException(
                      'Permissão fora do limite de delegação.',
                    );
                }
            }
            const vinculos = await tx.usuarioPerfil.findMany({
              where: { usuarioId: id },
              select: { perfilId: true, ativo: true },
            });
            const anteriores = vinculos
              .filter((v) => v.ativo)
              .map((v) => v.perfilId)
              .sort();
            if (
              anteriores.length === ids.length &&
              anteriores.every((valor, i) => valor === ids[i])
            )
              return this.perfisAtivosDoUsuario(tx, id, alvo.empresaId);
            await tx.usuarioPerfil.updateMany({
              where: { usuarioId: id, ativo: true, perfilId: { notIn: ids } },
              data: { ativo: false },
            });
            await tx.usuarioPerfil.updateMany({
              where: { usuarioId: id, ativo: false, perfilId: { in: ids } },
              data: { ativo: true },
            });
            const existentes = new Set(vinculos.map((v) => v.perfilId));
            const novos = ids.filter((perfilId) => !existentes.has(perfilId));
            if (novos.length)
              await tx.usuarioPerfil.createMany({
                data: novos.map((perfilId) => ({
                  usuarioId: id,
                  perfilId,
                  ativo: true,
                })),
              });
            await tx.usuario.update({
              where: { id, empresaId: alvo.empresaId },
              data: { versaoAutorizacao: { increment: 1 } },
              select: { id: true },
            });
            await tx.auditoriaLog.create({
              data: {
                empresaId: alvo.empresaId,
                usuarioId: ator.id,
                entidade: 'USUARIO',
                entidadeId: id,
                acao: 'ATUALIZAR_PERFIS',
                dadosAntigos: prepararJsonAuditoria({ perfisIds: anteriores }),
                dadosNovos: prepararJsonAuditoria({ perfisIds: ids }),
              },
            });
            return this.perfisAtivosDoUsuario(tx, id, alvo.empresaId);
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

  private validarGestaoPerfis(ator: AuthenticatedUser) {
    if (
      !['ADMIN_EMPRESA', 'SUPER_ADMIN'].includes(ator.tipo) ||
      !ator.permissoes?.includes('usuarios.perfis.gerenciar')
    )
      throw new ForbiddenException('Operação não autorizada.');
  }

  private async alvoParaPerfis(
    tx: Prisma.TransactionClient,
    id: string,
    ator: AuthenticatedUser,
  ) {
    const alvo = await tx.usuario.findFirst({
      where: {
        id,
        ...(ator.tipo === 'ADMIN_EMPRESA'
          ? { empresaId: obterEmpresaId(ator) }
          : {}),
      },
      select: { id: true, empresaId: true, tipo: true },
    });
    if (!alvo) throw new NotFoundException('Usuário não encontrado.');
    if (
      !alvo.empresaId ||
      !['ADMIN_EMPRESA', 'USUARIO_EMPRESA'].includes(alvo.tipo)
    )
      throw new ForbiddenException(
        'Este endpoint administra somente perfis de usuários empresariais.',
      );
    return { ...alvo, empresaId: alvo.empresaId };
  }

  private async perfisAtivosDoUsuario(
    tx: Prisma.TransactionClient,
    id: string,
    empresaId: string,
  ) {
    const vinculos = await tx.usuarioPerfil.findMany({
      where: {
        usuarioId: id,
        ativo: true,
        perfil: { empresaId, escopo: 'EMPRESA', ativo: true },
      },
      select: { perfil: { select: perfilAtribuidoSelect } },
      orderBy: { perfil: { id: 'asc' } },
    });
    return vinculos.map((v) => v.perfil);
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
