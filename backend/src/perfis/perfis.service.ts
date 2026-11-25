import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { prepararJsonAuditoria } from '../auditoria/auditoria-sanitizer';
import { CriarPerfilDto } from './dto/criar-perfil.dto';
import { EditarPerfilDto } from './dto/editar-perfil.dto';
import { ConfigurarPermissoesDto } from './dto/configurar-permissoes.dto';
import { PERMISSOES_EMPRESARIAIS_DELEGAVEIS } from './permissoes-delegaveis';
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

  criar(empresaId: string, ator: AuthenticatedUser, dados: CriarPerfilDto) {
    return this.escrever(empresaId, ator, 'perfis.criar', async (tx) => {
      const perfil = await tx.perfil.create({
        data: {
          nome: dados.nome.trim(),
          chave: dados.chave.trim().toLowerCase(),
          descricao:
            dados.descricao === undefined
              ? undefined
              : dados.descricao.trim() || null,
          empresaId,
          escopo: 'EMPRESA',
          sistema: false,
          ativo: true,
        },
        select: perfilSelect,
      });
      await this.auditar(
        tx,
        empresaId,
        ator.id,
        perfil.id,
        'CRIAR',
        null,
        perfil,
        0,
      );
      return perfil;
    });
  }

  editar(
    empresaId: string,
    ator: AuthenticatedUser,
    id: string,
    dados: EditarPerfilDto,
  ) {
    if (dados.nome === undefined && dados.descricao === undefined) {
      throw new BadRequestException('Informe nome ou descrição.');
    }
    return this.escrever(empresaId, ator, 'perfis.editar', async (tx) => {
      const antes = await this.perfilParaEscrita(tx, empresaId, id);
      const nome = dados.nome ?? antes.nome;
      const descricao =
        dados.descricao === undefined
          ? antes.descricao
          : dados.descricao?.trim() || null;
      if (nome === antes.nome && descricao === antes.descricao) return antes;
      const depois = await tx.perfil.update({
        where: { id, empresaId, escopo: 'EMPRESA' },
        data: { nome, descricao },
        select: perfilSelect,
      });
      await this.auditar(
        tx,
        empresaId,
        ator.id,
        id,
        'ATUALIZAR',
        antes,
        depois,
        0,
      );
      return depois;
    });
  }

  alterarAtivo(
    empresaId: string,
    ator: AuthenticatedUser,
    id: string,
    ativo: boolean,
  ) {
    return this.escrever(
      empresaId,
      ator,
      ativo ? 'perfis.ativar' : 'perfis.inativar',
      async (tx) => {
        const antes = await this.perfilParaEscrita(tx, empresaId, id);
        if (antes.ativo === ativo) return antes;
        if (ativo && ator.tipo === 'ADMIN_EMPRESA') {
          this.validarLimiteAtual(ator, await this.associacoes(tx, id));
        }
        const usuarios = await this.usuariosParaRevogar(tx, empresaId, id);
        const depois = await tx.perfil.update({
          where: { id, empresaId, escopo: 'EMPRESA' },
          data: { ativo },
          select: perfilSelect,
        });
        const revogados = await this.revogar(tx, empresaId, usuarios);
        await this.auditar(
          tx,
          empresaId,
          ator.id,
          id,
          ativo ? 'ATIVAR' : 'DESATIVAR',
          antes,
          depois,
          revogados,
        );
        return depois;
      },
    );
  }

  configurarPermissoes(
    empresaId: string,
    ator: AuthenticatedUser,
    id: string,
    dados: ConfigurarPermissoesDto,
  ) {
    return this.escrever(
      empresaId,
      ator,
      'perfis.permissoes.gerenciar',
      async (tx) => {
        const perfil = await this.perfilParaEscrita(tx, empresaId, id);
        const antes = await this.associacoes(tx, id);
        this.validarLimiteAtual(ator, antes);
        const ids = dados.permissoes.map((item) => item.permissaoId);
        if (new Set(ids).size !== ids.length)
          throw new BadRequestException('Permissões duplicadas.');
        const permissoes = await tx.permissao.findMany({
          where: { id: { in: ids } },
          select: {
            id: true,
            chave: true,
            nome: true,
            descricao: true,
            modulo: true,
            ativo: true,
          },
          orderBy: { chave: 'asc' },
        });
        if (
          permissoes.length !== ids.length ||
          permissoes.some((item) => !item.ativo)
        ) {
          throw new BadRequestException('Permissão inexistente ou inativa.');
        }
        for (const permissao of permissoes)
          this.validarDelegacao(ator, permissao.chave);
        const solicitado = new Map(
          dados.permissoes.map((item) => [item.permissaoId, item.permitido]),
        );
        const depois = permissoes.map((permissao) => ({
          ...permissao,
          permitido: solicitado.get(permissao.id)!,
        }));
        const identico =
          antes.length === depois.length &&
          antes.every((item) => solicitado.get(item.id) === item.permitido);
        if (identico) return { ...perfil, permissoes: antes };
        const usuarios = await this.usuariosParaRevogar(tx, empresaId, id);
        await tx.perfilPermissao.deleteMany({ where: { perfilId: id } });
        if (depois.length) {
          await tx.perfilPermissao.createMany({
            data: depois.map((item) => ({
              perfilId: id,
              permissaoId: item.id,
              permitido: item.permitido,
            })),
          });
        }
        const revogados = await this.revogar(tx, empresaId, usuarios);
        await this.auditar(
          tx,
          empresaId,
          ator.id,
          id,
          'ATUALIZAR_PERMISSOES',
          { ...perfil, permissoes: antes },
          { ...perfil, permissoes: depois },
          revogados,
        );
        return { ...perfil, permissoes: depois };
      },
    );
  }

  private async escrever<T>(
    empresaId: string,
    ator: AuthenticatedUser,
    permissao: string,
    operacao: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            // O bloqueio coordena a escrita com inativação/revogação concorrente do ator.
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
              !atual ||
              !atual.ativo ||
              !Number.isSafeInteger(ator.versaoAutorizacao) ||
              atual.versaoAutorizacao !== ator.versaoAutorizacao ||
              atual.tipo !== ator.tipo ||
              atual.empresaId !== ator.empresaId ||
              (atual.tipo === 'SUPER_ADMIN'
                ? atual.empresaId !== null
                : atual.empresaId !== empresaId)
            ) {
              throw new UnauthorizedException(
                'Sessão inválida. Faça login novamente.',
              );
            }
            if (
              !['SUPER_ADMIN', 'ADMIN_EMPRESA'].includes(atual.tipo) ||
              !ator.permissoes?.includes(permissao)
            ) {
              throw new ForbiddenException('Operação não autorizada.');
            }
            const empresa = await tx.empresa.findUnique({
              where: { id: empresaId },
              select: { ativa: true },
            });
            if (!empresa)
              throw new NotFoundException('Empresa não encontrada.');
            if (!empresa.ativa)
              throw new ForbiddenException('Empresa inativa.');
            return operacao(tx);
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          const conflito =
            error.code === 'P2034' ||
            (error.code === 'P2010' &&
              ['40001', '40P01'].includes(String(error.meta?.code)));
          if (conflito) {
            if (tentativa < 2) continue;
            throw new ConflictException(
              'Alteração concorrente. Tente novamente.',
            );
          }
          const target = error.meta?.target;
          const chaveDuplicada = Array.isArray(target)
            ? target.length === 2 &&
              target.includes('empresaId') &&
              target.includes('chave')
            : target === 'Perfil_empresaId_chave_key';
          if (error.code === 'P2002' && chaveDuplicada) {
            throw new ConflictException(
              'Já existe um perfil com esta chave nesta empresa.',
            );
          }
        }
        throw error;
      }
    }
    throw new ConflictException('Alteração concorrente. Tente novamente.');
  }

  private async perfilParaEscrita(
    tx: Prisma.TransactionClient,
    empresaId: string,
    id: string,
  ) {
    // Futuras atribuições devem coordenar-se pelo mesmo bloqueio do perfil.
    await tx.$queryRaw`SELECT "id" FROM "Perfil" WHERE "id" = ${id} AND "empresaId" = ${empresaId} AND "escopo" = 'EMPRESA' FOR UPDATE`;
    const perfil = await tx.perfil.findFirst({
      where: { id, empresaId, escopo: 'EMPRESA' },
      select: perfilSelect,
    });
    if (!perfil) throw new NotFoundException('Perfil não encontrado.');
    if (perfil.sistema)
      throw new ForbiddenException('Perfil padrão protegido.');
    return perfil;
  }

  private async associacoes(tx: Prisma.TransactionClient, perfilId: string) {
    const itens = await tx.perfilPermissao.findMany({
      where: { perfilId },
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
    });
    return itens.map(({ permissao, permitido }) => ({
      ...permissao,
      permitido,
    }));
  }

  private validarDelegacao(ator: AuthenticatedUser, chave: string) {
    if (
      !PERMISSOES_EMPRESARIAIS_DELEGAVEIS.includes(chave) ||
      (ator.tipo === 'ADMIN_EMPRESA' && !ator.permissoes?.includes(chave))
    ) {
      throw new ForbiddenException('Permissão fora do limite de delegação.');
    }
  }

  private validarLimiteAtual(
    ator: AuthenticatedUser,
    itens: { chave: string; permitido: boolean }[],
  ) {
    if (ator.tipo === 'ADMIN_EMPRESA') {
      for (const item of itens) this.validarDelegacao(ator, item.chave);
    }
  }

  private async usuariosParaRevogar(
    tx: Prisma.TransactionClient,
    empresaId: string,
    perfilId: string,
  ) {
    const vinculos = await tx.usuarioPerfil.findMany({
      where: { perfilId },
      select: {
        usuario: { select: { id: true, tipo: true, empresaId: true } },
      },
    });
    if (
      vinculos.some(
        ({ usuario }) =>
          usuario.empresaId !== empresaId ||
          !['ADMIN_EMPRESA', 'USUARIO_EMPRESA'].includes(usuario.tipo),
      )
    ) {
      throw new ConflictException(
        'Perfil possui vínculo de usuário incompatível com a empresa.',
      );
    }
    return [...new Set(vinculos.map(({ usuario }) => usuario.id))];
  }

  private async revogar(
    tx: Prisma.TransactionClient,
    empresaId: string,
    ids: string[],
  ) {
    if (!ids.length) return 0;
    const resultado = await tx.usuario.updateMany({
      where: {
        id: { in: ids },
        empresaId,
        tipo: { in: ['ADMIN_EMPRESA', 'USUARIO_EMPRESA'] },
      },
      data: { versaoAutorizacao: { increment: 1 } },
    });
    if (resultado.count !== ids.length)
      throw new ConflictException('Vínculos alterados durante a operação.');
    return resultado.count;
  }

  private async auditar(
    tx: Prisma.TransactionClient,
    empresaId: string,
    usuarioId: string,
    perfilId: string,
    acao: string,
    antes: unknown,
    depois: unknown,
    usuariosRevogados: number,
  ) {
    await tx.auditoriaLog.create({
      data: {
        empresaId,
        usuarioId,
        entidadeId: perfilId,
        entidade: 'PERFIL',
        acao,
        dadosAntigos: prepararJsonAuditoria(antes),
        dadosNovos: prepararJsonAuditoria({
          perfil: depois,
          usuariosRevogados,
        }),
      },
    });
  }
}
