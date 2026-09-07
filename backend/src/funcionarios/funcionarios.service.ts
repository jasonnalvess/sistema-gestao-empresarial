import { AlterarSituacaoFuncionarioDto } from './dto/alterar-situacao.dto';
import { planejarSituacao } from './situacao-funcionario';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, TipoEventoFuncionarioHistorico } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PaginacaoDto } from '../common/dto/paginacao.dto';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';
import { prepararJsonAuditoria } from '../auditoria/auditoria-sanitizer';
import {
  CriarFuncionarioDto,
  EditarFuncionarioDto,
  EditarDadosPessoaisFuncionarioDto,
  FiltroFuncionariosDto,
} from './dto/funcionarios.dto';
import {
  apresentarFuncionario,
  camposOperacionais,
  camposPessoais,
  operacionalSelect,
  pessoalSelect,
} from './funcionarios.select';

@Injectable()
export class FuncionariosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(empresaId: string, filtros: FiltroFuncionariosDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      tipoVinculo,
      cargoId,
      departamentoId,
      gestorId,
      acesso,
    } = filtros;
    const where: Prisma.FuncionarioWhereInput = {
      empresaId,
      status,
      tipoVinculo,
      cargoId,
      departamentoId,
      gestorId,
      ...(search
        ? {
            OR: ['nome', 'nomePreferido', 'matricula', 'emailCorporativo'].map(
              (campo) => ({
                [campo]: { contains: search, mode: 'insensitive' },
              }),
            ),
          }
        : {}),
      ...(acesso === 'SEM_USUARIO'
        ? { usuarioId: null }
        : acesso
          ? {
              usuarioId: { not: null },
              usuario: { is: { ativo: acesso === 'USUARIO_ATIVO' } },
            }
          : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.funcionario.findMany({
        where,
        select: operacionalSelect,
        ...calcularPaginacao(page, limit),
        orderBy: [{ nome: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.funcionario.count({ where }),
    ]);
    return respostaPaginada(
      data.map(apresentarFuncionario),
      total,
      page,
      limit,
    );
  }

  async buscar(empresaId: string, id: string) {
    const registro = await this.prisma.funcionario.findFirst({
      where: { id, empresaId },
      select: operacionalSelect,
    });
    if (!registro) throw new NotFoundException('Funcionário não encontrado.');
    return apresentarFuncionario(registro);
  }

  async dadosPessoais(empresaId: string, id: string) {
    const registro = await this.prisma.funcionario.findFirst({
      where: { id, empresaId },
      select: pessoalSelect,
    });
    if (!registro) throw new NotFoundException('Funcionário não encontrado.');
    const { id: funcionarioId, ...dados } = registro;
    return { funcionarioId, ...dados };
  }

  async historico(empresaId: string, id: string, filtros: PaginacaoDto) {
    const funcionario = await this.prisma.funcionario.findFirst({
      where: { id, empresaId },
      select: { id: true },
    });
    if (!funcionario)
      throw new NotFoundException('Funcionário não encontrado.');
    const { page = 1, limit = 10 } = filtros;
    const where = { empresaId, funcionarioId: id };
    const [data, total] = await Promise.all([
      this.prisma.funcionarioHistorico.findMany({
        where,
        ...calcularPaginacao(page, limit),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          funcionarioId: true,
          tipo: true,
          statusAnterior: true,
          statusNovo: true,
          acessoAnterior: true,
          acessoNovo: true,
          origem: true,
          createdAt: true,
          operacaoId: true,
          atorUsuario: {
            select: { id: true, nome: true, email: true, tipo: true },
          },
        },
      }),
      this.prisma.funcionarioHistorico.count({ where }),
    ]);
    return respostaPaginada(data, total, page, limit);
  }

  criar(
    empresaId: string,
    ator: AuthenticatedUser,
    dados: CriarFuncionarioDto,
  ) {
    const permissoes = ['funcionarios.criar'];
    if (camposPessoais.some((campo) => dados[campo] !== undefined))
      permissoes.push('funcionarios.dados_pessoais.editar');
    return this.escrever(empresaId, ator, permissoes, async (tx) => {
      const id = randomUUID();
      await this.validarAssociacoes(tx, empresaId, id, dados);
      const agora = new Date();
      const registro = await tx.funcionario.create({
        data: {
          ...this.selecionar(dados, [...camposOperacionais, ...camposPessoais]),
          id,
          empresaId,
          nome: dados.nome,
          matricula: dados.matricula,
          tipoVinculo: dados.tipoVinculo,
          dataAdmissao: new Date(dados.dataAdmissao),
          status: 'ATIVO',
          statusDesde: agora,
          dataDesligamento: null,
          usuarioId: null,
          versaoRegistro: 0,
        },
        select: operacionalSelect,
      });
      await this.registrar(
        tx,
        empresaId,
        ator.id,
        id,
        ['CRIACAO'],
        Object.keys(
          this.selecionar(dados, [...camposOperacionais, ...camposPessoais]),
        ),
      );
      return apresentarFuncionario(registro);
    });
  }

  editar(
    empresaId: string,
    ator: AuthenticatedUser,
    id: string,
    dados: EditarFuncionarioDto,
  ) {
    return this.escrever(
      empresaId,
      ator,
      ['funcionarios.editar'],
      async (tx) => {
        await this.bloquear(tx, empresaId, id);
        const antes = await tx.funcionario.findFirst({
          where: { id, empresaId },
          select: operacionalSelect,
        });
        if (!antes) throw new NotFoundException('Funcionário não encontrado.');
        this.validarVersao(antes.versaoRegistro, dados.versaoRegistro);
        const alteracoes = this.selecionar(dados, camposOperacionais);
        if (dados.dataAdmissao !== undefined)
          alteracoes.dataAdmissao = new Date(dados.dataAdmissao);
        const campos = Object.keys(alteracoes).filter(
          (campo) =>
            !this.iguais(antes[campo as keyof typeof antes], alteracoes[campo]),
        );
        if (!campos.length) return apresentarFuncionario(antes);
        // Somente associações novas são validadas; inativação não desfaz vínculos antigos.
        await this.validarAssociacoes(tx, empresaId, id, {
          cargoId: campos.includes('cargoId') ? dados.cargoId : undefined,
          departamentoId: campos.includes('departamentoId')
            ? dados.departamentoId
            : undefined,
          gestorId: campos.includes('gestorId') ? dados.gestorId : undefined,
        });
        const registro = await tx.funcionario.update({
          where: { id, empresaId, versaoRegistro: dados.versaoRegistro },
          data: { ...alteracoes, versaoRegistro: { increment: 1 } },
          select: operacionalSelect,
        });
        const eventos: TipoEventoFuncionarioHistorico[] = [];
        if (campos.includes('cargoId')) eventos.push('ALTERACAO_CARGO');
        if (campos.includes('departamentoId'))
          eventos.push('ALTERACAO_DEPARTAMENTO');
        if (campos.includes('gestorId')) eventos.push('ALTERACAO_GESTOR');
        if (
          campos.some(
            (campo) =>
              !['cargoId', 'departamentoId', 'gestorId'].includes(campo),
          )
        )
          eventos.push('EDICAO');
        await this.registrar(tx, empresaId, ator.id, id, eventos, campos);
        return apresentarFuncionario(registro);
      },
    );
  }

  editarDadosPessoais(
    empresaId: string,
    ator: AuthenticatedUser,
    id: string,
    dados: EditarDadosPessoaisFuncionarioDto,
  ) {
    return this.escrever(
      empresaId,
      ator,
      ['funcionarios.dados_pessoais.editar'],
      async (tx) => {
        await this.bloquear(tx, empresaId, id);
        const antes = await tx.funcionario.findFirst({
          where: { id, empresaId },
          select: { ...pessoalSelect, versaoRegistro: true },
        });
        if (!antes) throw new NotFoundException('Funcionário não encontrado.');
        this.validarVersao(antes.versaoRegistro, dados.versaoRegistro);
        const alteracoes = this.selecionar(dados, camposPessoais);
        const campos = Object.keys(alteracoes).filter(
          (campo) =>
            !this.iguais(antes[campo as keyof typeof antes], alteracoes[campo]),
        );
        const depois = campos.length
          ? await tx.funcionario.update({
              where: { id, empresaId, versaoRegistro: dados.versaoRegistro },
              data: { ...alteracoes, versaoRegistro: { increment: 1 } },
              select: { ...pessoalSelect, versaoRegistro: true },
            })
          : antes;
        if (campos.length)
          await this.registrar(tx, empresaId, ator.id, id, ['EDICAO'], campos);
        const { id: funcionarioId, ...resultado } = depois;
        return { funcionarioId, ...resultado };
      },
    );
  }

  alterarSituacao(
    empresaId: string,
    ator: AuthenticatedUser,
    id: string,
    dados: AlterarSituacaoFuncionarioDto,
  ) {
    return this.escrever(
      empresaId,
      ator,
      ['funcionarios.situacao.gerenciar'],
      async (tx) => {
        await this.bloquear(tx, empresaId, id);
        const funcionario = await tx.funcionario.findFirst({
          where: { id, empresaId },
          select: {
            id: true,
            status: true,
            dataAdmissao: true,
            usuarioId: true,
            versaoRegistro: true,
          },
        });
        if (!funcionario)
          throw new NotFoundException('Funcionário não encontrado.');
        this.validarVersao(funcionario.versaoRegistro, dados.versaoRegistro);
        let ativo: boolean | undefined;
        if (funcionario.usuarioId) {
          await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id" = ${funcionario.usuarioId} AND "empresaId" = ${empresaId} FOR UPDATE`;
          const usuario = await tx.usuario.findFirst({
            where: { id: funcionario.usuarioId, empresaId },
            select: { ativo: true, tipo: true },
          });
          if (!usuario || usuario.tipo !== 'USUARIO_EMPRESA')
            throw new ConflictException(
              'Vínculo de usuário incompatível com o funcionário.',
            );
          ativo = usuario.ativo;
        }
        const agora = new Date();
        const plano = planejarSituacao(
          funcionario.status,
          funcionario.dataAdmissao,
          ativo,
          dados,
          agora,
        );
        if (plano.suspender)
          await tx.usuario.update({
            where: { id: funcionario.usuarioId!, empresaId },
            data: { ativo: false, versaoAutorizacao: { increment: 1 } },
            select: { id: true },
          });
        const depois = await tx.funcionario.update({
          where: { id, empresaId, versaoRegistro: dados.versaoRegistro },
          data: {
            status: dados.status,
            statusDesde: agora,
            dataDesligamento: plano.dataDesligamento,
            versaoRegistro: { increment: 1 },
          },
          select: operacionalSelect,
        });
        const operacaoId = randomUUID();
        const estados = {
          statusAnterior: funcionario.status,
          statusNovo: dados.status,
          acessoAnterior: plano.acessoAnterior,
          acessoNovo: plano.acessoNovo,
        };
        const evento = {
          empresaId,
          funcionarioId: id,
          ...estados,
          origem: 'RH' as const,
          atorUsuarioId: ator.id,
          usuarioAfetadoId: funcionario.usuarioId,
          acaoAcessoSolicitada: dados.acaoAcesso ?? null,
          operacaoId,
        };
        await tx.funcionarioHistorico.createMany({
          data: [
            { ...evento, tipo: 'ALTERACAO_STATUS' },
            ...(plano.suspender
              ? [{ ...evento, tipo: 'INATIVACAO_ACESSO' as const }]
              : []),
          ],
        });
        await tx.auditoriaLog.create({
          data: {
            empresaId,
            usuarioId: ator.id,
            entidade: 'FUNCIONARIO',
            entidadeId: id,
            acao: 'ALTERAR_SITUACAO',
            dadosNovos: prepararJsonAuditoria({
              ...estados,
              operacaoId,
              acaoAcessoSolicitada: dados.acaoAcesso ?? null,
            }),
          },
        });
        return apresentarFuncionario(depois);
      },
    );
  }

  private selecionar(
    dados: object,
    campos: readonly string[],
  ): Record<string, string | number | Date | null> {
    return Object.fromEntries(
      campos
        .filter(
          (campo) => (dados as Record<string, unknown>)[campo] !== undefined,
        )
        .map((campo) => [
          campo,
          (dados as Record<string, string | number | Date | null>)[campo],
        ]),
    );
  }
  private iguais(a: unknown, b: unknown) {
    return a instanceof Date && b instanceof Date
      ? a.getTime() === b.getTime()
      : a === b;
  }
  private validarVersao(atual: number, esperada: number) {
    if (atual !== esperada)
      throw new ConflictException(
        'Funcionário alterado por outra operação. Atualize os dados e tente novamente.',
      );
  }
  private bloquear(
    tx: Prisma.TransactionClient,
    empresaId: string,
    id: string,
  ) {
    return tx.$queryRaw`SELECT "id" FROM "Funcionario" WHERE "id" = ${id} AND "empresaId" = ${empresaId} FOR UPDATE`;
  }
  private async validarAssociacoes(
    tx: Prisma.TransactionClient,
    empresaId: string,
    id: string,
    dados: {
      cargoId?: string | null;
      departamentoId?: string | null;
      gestorId?: string | null;
    },
  ) {
    if (dados.cargoId) {
      await tx.$queryRaw`SELECT "id" FROM "Cargo" WHERE "id" = ${dados.cargoId} AND "empresaId" = ${empresaId} FOR SHARE`;
      if (
        !(await tx.cargo.findFirst({
          where: { id: dados.cargoId, empresaId, ativo: true },
          select: { id: true },
        }))
      )
        throw new BadRequestException(
          'Cargo inexistente ou inativo nesta empresa.',
        );
    }
    if (dados.departamentoId) {
      await tx.$queryRaw`SELECT "id" FROM "Departamento" WHERE "id" = ${dados.departamentoId} AND "empresaId" = ${empresaId} FOR SHARE`;
      if (
        !(await tx.departamento.findFirst({
          where: { id: dados.departamentoId, empresaId, ativo: true },
          select: { id: true },
        }))
      )
        throw new BadRequestException(
          'Departamento inexistente ou inativo nesta empresa.',
        );
    }
    if (dados.gestorId) {
      if (dados.gestorId === id)
        throw new BadRequestException(
          'Funcionário não pode ser seu próprio gestor.',
        );
      await tx.$queryRaw`SELECT "id" FROM "Funcionario" WHERE "id" = ${dados.gestorId} AND "empresaId" = ${empresaId} FOR SHARE`;
      if (
        !(await tx.funcionario.findFirst({
          where: {
            id: dados.gestorId,
            empresaId,
            status: { not: 'DESLIGADO' },
          },
          select: { id: true },
        }))
      )
        throw new BadRequestException(
          'Gestor inexistente ou desligado nesta empresa.',
        );
    }
  }
  private async registrar(
    tx: Prisma.TransactionClient,
    empresaId: string,
    atorUsuarioId: string,
    funcionarioId: string,
    eventos: TipoEventoFuncionarioHistorico[],
    campos: string[],
  ) {
    const operacaoId = randomUUID();
    await tx.funcionarioHistorico.createMany({
      data: eventos.map((tipo) => ({
        empresaId,
        funcionarioId,
        atorUsuarioId,
        tipo,
        origem: 'RH',
        operacaoId,
        ...(tipo === 'CRIACAO'
          ? { statusNovo: 'ATIVO' as const, acessoNovo: 'SEM_USUARIO' as const }
          : {}),
      })),
    });
    await tx.auditoriaLog.create({
      data: {
        empresaId,
        usuarioId: atorUsuarioId,
        entidade: 'FUNCIONARIO',
        entidadeId: funcionarioId,
        acao: eventos.includes('CRIACAO') ? 'CRIAR' : 'ATUALIZAR',
        dadosNovos: prepararJsonAuditoria({ operacaoId, campos }),
      },
    });
  }
  private async escrever<T>(
    empresaId: string,
    ator: AuthenticatedUser,
    permissoes: string[],
    operacao: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
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
                perfis: {
                  where: {
                    ativo: true,
                    perfil: {
                      ativo: true,
                      ...(ator.tipo === 'SUPER_ADMIN'
                        ? { empresaId: null, escopo: 'SISTEMA' }
                        : { empresaId, escopo: 'EMPRESA' }),
                    },
                  },
                  select: {
                    perfil: {
                      select: {
                        permissoes: {
                          where: {
                            permitido: true,
                            permissao: { ativo: true },
                          },
                          select: { permissao: { select: { chave: true } } },
                        },
                      },
                    },
                  },
                },
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
            )
              throw new UnauthorizedException(
                'Sessão inválida. Faça login novamente.',
              );
            const atuais = new Set(
              atual.perfis.flatMap((v) =>
                v.perfil.permissoes.map((p) => p.permissao.chave),
              ),
            );
            if (
              !['SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA'].includes(
                atual.tipo,
              ) ||
              !permissoes.every(
                (p) => ator.permissoes?.includes(p) && atuais.has(p),
              )
            )
              throw new ForbiddenException('Operação não autorizada.');
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
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError) {
          if (
            e.code === 'P2034' ||
            (e.code === 'P2010' &&
              ['40001', '40P01'].includes(String(e.meta?.code)))
          ) {
            if (tentativa < 2) continue;
            throw new ConflictException(
              'Alteração concorrente. Tente novamente.',
            );
          }
          if (e.code === 'P2002')
            throw new ConflictException(
              String(e.meta?.target).includes('cpf')
                ? 'CPF já cadastrado nesta empresa.'
                : 'Matrícula já cadastrada nesta empresa.',
            );
          if (e.code === 'P2025')
            throw new ConflictException(
              'Funcionário alterado por outra operação.',
            );
          if (e.code === 'P2003' || e.code === 'P2004')
            throw new ConflictException(
              'Dados incompatíveis com a integridade do funcionário.',
            );
        }
        throw e;
      }
    }
    throw new ConflictException('Alteração concorrente. Tente novamente.');
  }
}
