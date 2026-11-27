import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { prepararJsonAuditoria } from '../auditoria/auditoria-sanitizer';
import {
  calcularPeriodoComercial,
  comoIsoUtc,
} from '../common/validacao-comercial/situacao-comercial';
import { obterEmpresaId } from '../common/utils/obter-empresa-id';
import { PrismaService } from '../prisma/prisma.service';

const CAMPOS_EMPRESA_COMERCIAL = {
  id: true,
  nome: true,
  ativa: true,
  validadeComercialInicio: true,
  validadeComercialFim: true,
} as const;

@Injectable()
export class EmpresasService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(dados: { nome: string; cnpj?: string }) {
    try {
      return await this.prisma.empresa.create({
        data: {
          nome: dados.nome,
          cnpj: dados.cnpj,
        },
      });
    } catch (error) {
      this.tratarConflitoCnpj(error);
    }
  }

  listar(usuarioLogado: AuthenticatedUser) {
    if (usuarioLogado.tipo === 'SUPER_ADMIN') {
      return this.prisma.empresa.findMany({
        orderBy: { createdAt: 'desc' },
      });
    }

    return this.prisma.empresa.findMany({
      where: {
        id: obterEmpresaId(usuarioLogado),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async buscarPorId(id: string, usuarioLogado: AuthenticatedUser) {
    const empresa = await this.buscarEmpresaOuFalhar(id);

    if (
      usuarioLogado.tipo !== 'SUPER_ADMIN' &&
      empresa.id !== obterEmpresaId(usuarioLogado)
    ) {
      throw new ForbiddenException('Acesso negado a empresa de outro usuário');
    }

    return empresa;
  }

  async atualizar(id: string, dados: { nome?: string; cnpj?: string }) {
    await this.buscarEmpresaOuFalhar(id);

    try {
      return await this.prisma.empresa.update({
        where: { id },
        data: dados,
      });
    } catch (error) {
      this.tratarConflitoCnpj(error);
    }
  }

  async ativar(id: string) {
    await this.buscarEmpresaOuFalhar(id);

    return this.prisma.empresa.update({
      where: { id },
      data: { ativa: true },
    });
  }

  async desativar(id: string) {
    await this.buscarEmpresaOuFalhar(id);

    return this.prisma.empresa.update({
      where: { id },
      data: { ativa: false },
    });
  }

  async excluir(id: string) {
    await this.buscarEmpresaOuFalhar(id);

    return this.prisma.empresa.delete({
      where: { id },
    });
  }

  /**
   * Regularização comercial exclusiva de SUPER_ADMIN (autorizada no
   * controller por `@Roles('SUPER_ADMIN')`).
   *
   * - lock pessimista `FOR UPDATE` na empresa serializa regularizações;
   * - define nova janela comercial `[agora, agora + diasValidade)` em UTC;
   * - auditoria transacional com ator, motivo, validade anterior/nova e IP;
   * - não altera `ativa`, usuários, perfis, permissões ou módulos;
   * - não incrementa `versaoAutorizacao`: o estado comercial é reavaliado a
   *   cada requisição pelo `JwtStrategy`/`ValidadeComercialGuard`.
   */
  async regularizar(
    id: string,
    dados: { diasValidade: number; motivo: string },
    ator: AuthenticatedUser,
    ip?: string,
  ) {
    const motivo = dados.motivo.trim();

    for (let tentativa = 0; tentativa < 3; tentativa++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            await tx.$queryRaw`SELECT "id" FROM "Empresa" WHERE "id" = ${id} FOR UPDATE`;

            const empresa = await tx.empresa.findUnique({
              where: { id },
              select: CAMPOS_EMPRESA_COMERCIAL,
            });
            if (!empresa) throw new NotFoundException('Empresa não encontrada');

            const periodo = calcularPeriodoComercial(
              new Date(),
              dados.diasValidade,
            );
            const atualizada = await tx.empresa.update({
              where: { id },
              data: periodo,
              select: CAMPOS_EMPRESA_COMERCIAL,
            });

            await tx.auditoriaLog.create({
              data: {
                acao: 'REGULARIZACAO_COMERCIAL',
                entidade: 'Empresa',
                entidadeId: empresa.id,
                dadosAntigos: prepararJsonAuditoria({
                  ativa: empresa.ativa,
                  validadeComercialInicio: comoIsoUtc(
                    empresa.validadeComercialInicio,
                  ),
                  validadeComercialFim: comoIsoUtc(
                    empresa.validadeComercialFim,
                  ),
                }),
                dadosNovos: prepararJsonAuditoria({
                  ativa: empresa.ativa,
                  validadeComercialInicio: comoIsoUtc(
                    atualizada.validadeComercialInicio,
                  ),
                  validadeComercialFim: comoIsoUtc(
                    atualizada.validadeComercialFim,
                  ),
                  diasValidade: dados.diasValidade,
                  motivo,
                }),
                empresaId: empresa.id,
                usuarioId: ator.id,
                ip,
              },
            });

            return atualizada;
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: 15000,
            maxWait: 5000,
          },
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

  private alvoP2002(error: unknown, campos: readonly string[]): boolean {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== 'P2002'
    ) {
      return false;
    }

    const target = error.meta?.target;
    return Array.isArray(target)
      ? target.length === campos.length &&
          campos.every((campo) => target.includes(campo))
      : false;
  }

  private tratarConflitoCnpj(error: unknown): never {
    if (this.alvoP2002(error, ['cnpj'])) {
      throw new ConflictException('CNPJ já cadastrado para outra empresa');
    }

    throw error;
  }

  private async buscarEmpresaOuFalhar(id: string) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id },
    });

    if (!empresa) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return empresa;
  }
}
