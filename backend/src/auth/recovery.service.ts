import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../common/services/mail.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { prepararJsonAuditoria } from '../auditoria/auditoria-sanitizer';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'crypto';

const VALIDADE_TOKEN_ATIVO_MS = 30 * 60 * 1000;
const VALIDADE_PENDENCIA_MS = 10 * 60 * 1000;

interface DadosReserva {
  tokenHash: string;
  pendingExpiresAt: Date;
  pendingCreatedAt: Date;
  requestId: string;
}

interface LinhaPendente {
  id: string;
  pendingTokenHash: string | null;
  pendingExpiresAt: Date | null;
  pendingRequestId: string | null;
}

interface LinhaConsumo {
  id: string;
  userId: string;
  tokenHash: string | null;
  expiresAt: Date | null;
  usedAt: Date | null;
}

@Injectable()
export class RecoveryService {
  private readonly logger = new Logger(RecoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async solicitarRecuperacao(email: string, ip?: string): Promise<void> {
    const emailNormalizado = email.toLowerCase().trim();
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: emailNormalizado },
    });

    // Retornamos void para evitar enumeração de usuários
    if (!usuario || !usuario.ativo) {
      return;
    }

    const agora = new Date();
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const requestId = randomUUID();
    const pendingCreatedAt = agora;
    const pendingExpiresAt = new Date(agora.getTime() + VALIDADE_PENDENCIA_MS);

    await this.reservarPendencia(usuario.id, {
      tokenHash,
      pendingCreatedAt,
      pendingExpiresAt,
      requestId,
    });

    // O envio ocorre fora de qualquer transação PostgreSQL e fora do retry.
    try {
      await this.mailService.sendPasswordResetEmail(usuario.email, rawToken);
    } catch (erro) {
      this.logger.error(
        `Falha ao enviar a solicitação de recuperação de senha. codigo=${this.codigoErro(erro)}`,
      );
      await this.cancelarPendencia(usuario.id, requestId).catch(
        (erroCancelamento) => {
          this.logger.error(
            `Falha ao cancelar a solicitação de recuperação de senha. codigo=${this.codigoErro(erroCancelamento)}`,
          );
        },
      );
      return;
    }

    const promovido = await this.promoverPendencia(usuario.id, requestId).catch(
      (erro) => {
        this.logger.error(
          `Falha ao promover a solicitação de recuperação de senha. codigo=${this.codigoErro(erro)}`,
        );
        return null;
      },
    );

    if (promovido === null) {
      return;
    }

    if (!promovido) {
      this.logger.warn(
        'Solicitação de recuperação de senha não promovida: condição perdida.',
      );
      return;
    }

    // B9 do fluxo de emissão permanece pendente: a auditoria continua
    // best-effort e fora da transação de promoção, sem atomicidade.
    try {
      await this.auditoriaService.registrar({
        acao: 'SOLICITACAO_RECUPERACAO_SENHA',
        entidade: 'Usuario',
        entidadeId: usuario.id,
        dadosNovos: prepararJsonAuditoria({ email: usuario.email }),
        empresaId: usuario.empresaId ?? undefined,
        usuarioId: usuario.id,
        ip: ip,
      });
    } catch (erro) {
      this.logger.error(
        `Falha ao auditar a solicitação de recuperação de senha. codigo=${this.codigoErro(erro)}`,
      );
    }
  }

  async redefinirSenha(
    token: string,
    novaSenha: string,
    ip?: string,
  ): Promise<void> {
    const hashedInputToken = createHash('sha256').update(token).digest('hex');

    // Leitura-dica sem lock: apenas localiza o usuário para a ordem canônica.
    const dica = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashedInputToken },
      select: { userId: true },
    });

    if (!dica) {
      throw new BadRequestException('Token de recuperação inválido.');
    }

    await this.executarComRetry(() =>
      this.prisma.$transaction(async (tx) => {
        // 1. Ordem canônica: Usuario -> PasswordResetToken.
        await this.bloquearUsuario(tx, dica.userId);

        // 2. Bloqueia a linha do token do usuário e revalida sob lock.
        const linhas = await tx.$queryRaw<LinhaConsumo[]>`
          SELECT "id", "userId", "tokenHash", "expiresAt", "usedAt"
          FROM "PasswordResetToken"
          WHERE "userId" = ${dica.userId}
          FOR UPDATE
        `;

        const tokenRecord = linhas[0];

        if (
          !tokenRecord ||
          tokenRecord.userId !== dica.userId ||
          !tokenRecord.tokenHash ||
          tokenRecord.tokenHash !== hashedInputToken ||
          !tokenRecord.expiresAt ||
          tokenRecord.usedAt ||
          new Date() > tokenRecord.expiresAt
        ) {
          throw new BadRequestException(
            'Este token expirou ou já foi utilizado.',
          );
        }

        const usuario = await tx.usuario.findUnique({
          where: { id: tokenRecord.userId },
        });

        if (!usuario || !usuario.ativo) {
          throw new UnauthorizedException('Usuário não encontrado ou inativo.');
        }

        const senhaHashed = await bcrypt.hash(novaSenha, 12);

        // 3. Atualiza senha e incrementa versão de autorização.
        await tx.usuario.update({
          where: { id: usuario.id },
          data: {
            senha: senhaHashed,
            versaoAutorizacao: { increment: 1 },
          },
        });

        // 4. Consumo atômico e limpeza da pendência no mesmo UPDATE.
        await tx.passwordResetToken.update({
          where: { id: tokenRecord.id },
          data: {
            usedAt: new Date(),
            pendingTokenHash: null,
            pendingExpiresAt: null,
            pendingRequestId: null,
            pendingCreatedAt: null,
          },
        });

        // 5. Registra auditoria na mesma transação da alteração de senha.
        await tx.auditoriaLog.create({
          data: {
            acao: 'REDEFINICAO_SENHA_CONCLUIDA',
            entidade: 'Usuario',
            entidadeId: usuario.id,
            dadosNovos: prepararJsonAuditoria({ senhaAlterada: true }),
            empresaId: usuario.empresaId ?? undefined,
            usuarioId: usuario.id,
            ip: ip,
          },
        });
      }),
    );
  }

  /**
   * Etapa 1 — reserva a solicitação vigente sem alterar o token ativo.
   * A linha do usuário é bloqueada para serializar reservas concorrentes.
   */
  private async reservarPendencia(
    usuarioId: string,
    dados: DadosReserva,
  ): Promise<void> {
    await this.executarComRetry(() =>
      this.prisma.$transaction(async (tx) => {
        await this.bloquearUsuario(tx, usuarioId);

        await tx.passwordResetToken.upsert({
          where: { userId: usuarioId },
          create: {
            userId: usuarioId,
            pendingTokenHash: dados.tokenHash,
            pendingExpiresAt: dados.pendingExpiresAt,
            pendingRequestId: dados.requestId,
            pendingCreatedAt: dados.pendingCreatedAt,
          },
          update: {
            pendingTokenHash: dados.tokenHash,
            pendingExpiresAt: dados.pendingExpiresAt,
            pendingRequestId: dados.requestId,
            pendingCreatedAt: dados.pendingCreatedAt,
          },
        });
      }),
    );
  }

  /**
   * Etapa 3A — promove a pendência somente se ela ainda for a solicitação
   * vigente e não estiver expirada. Retorna false quando perdeu a condição.
   */
  private async promoverPendencia(
    usuarioId: string,
    requestId: string,
  ): Promise<boolean> {
    return this.executarComRetry(() =>
      this.prisma.$transaction(async (tx) => {
        await this.bloquearUsuario(tx, usuarioId);

        const linhas = await tx.$queryRaw<LinhaPendente[]>`
          SELECT "id", "pendingTokenHash", "pendingExpiresAt", "pendingRequestId"
          FROM "PasswordResetToken"
          WHERE "userId" = ${usuarioId}
          FOR UPDATE
        `;

        const linha = linhas[0];

        if (!linha || linha.pendingRequestId !== requestId) {
          return false;
        }

        const agora = new Date();

        if (
          !linha.pendingTokenHash ||
          !linha.pendingExpiresAt ||
          linha.pendingExpiresAt.getTime() <= agora.getTime()
        ) {
          await tx.passwordResetToken.updateMany({
            where: { userId: usuarioId, pendingRequestId: requestId },
            data: {
              pendingTokenHash: null,
              pendingExpiresAt: null,
              pendingRequestId: null,
              pendingCreatedAt: null,
            },
          });
          return false;
        }

        const resultado = await tx.passwordResetToken.updateMany({
          where: { userId: usuarioId, pendingRequestId: requestId },
          data: {
            tokenHash: linha.pendingTokenHash,
            expiresAt: new Date(agora.getTime() + VALIDADE_TOKEN_ATIVO_MS),
            usedAt: null,
            pendingTokenHash: null,
            pendingExpiresAt: null,
            pendingRequestId: null,
            pendingCreatedAt: null,
          },
        });

        return resultado.count === 1;
      }),
    );
  }

  /**
   * Etapa 3B — cancela somente a própria pendência. Nunca altera o token ativo
   * e nunca apaga a pendência de uma solicitação mais recente.
   */
  private async cancelarPendencia(
    usuarioId: string,
    requestId: string,
  ): Promise<void> {
    await this.executarComRetry(() =>
      this.prisma.$transaction(async (tx) => {
        await this.bloquearUsuario(tx, usuarioId);

        await tx.passwordResetToken.updateMany({
          where: { userId: usuarioId, pendingRequestId: requestId },
          data: {
            pendingTokenHash: null,
            pendingExpiresAt: null,
            pendingRequestId: null,
            pendingCreatedAt: null,
          },
        });
      }),
    );
  }

  private async executarComRetry<T>(operacao: () => Promise<T>): Promise<T> {
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      try {
        return await operacao();
      } catch (erro) {
        if (this.erroConcorrencia(erro)) {
          if (tentativa < 2) continue;
          throw new ConflictException(
            'Alteração concorrente. Tente novamente.',
          );
        }
        throw erro;
      }
    }
    throw new ConflictException('Alteração concorrente. Tente novamente.');
  }

  private erroConcorrencia(erro: unknown): boolean {
    if (!(erro instanceof Prisma.PrismaClientKnownRequestError)) {
      return false;
    }

    if (erro.code === 'P2034') {
      return true;
    }

    if (erro.code !== 'P2010') {
      return false;
    }

    const meta = erro.meta?.code;
    return meta === '40001' || meta === '40P01';
  }

  private codigoErro(erro: unknown): string {
    if (erro instanceof Prisma.PrismaClientKnownRequestError) {
      const meta = erro.meta?.code;
      const sufixo =
        typeof meta === 'string' || typeof meta === 'number' ? `/${meta}` : '';
      return `${erro.code}${sufixo}`;
    }

    if (erro instanceof Error) {
      const codigo = (erro as { code?: unknown }).code;
      return typeof codigo === 'string' ? `${erro.name}/${codigo}` : erro.name;
    }

    return 'desconhecido';
  }

  private async bloquearUsuario(
    tx: Prisma.TransactionClient,
    usuarioId: string,
  ): Promise<void> {
    await tx.$queryRaw`
      SELECT "id" FROM "Usuario" WHERE "id" = ${usuarioId} FOR UPDATE
    `;
  }
}
