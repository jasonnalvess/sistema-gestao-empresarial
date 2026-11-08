import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../common/services/mail.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { prepararJsonAuditoria } from '../auditoria/auditoria-sanitizer';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash, timingSafeEqual } from 'crypto';

@Injectable()
export class RecoveryService {
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

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    await this.prisma.$transaction(async (tx) => {
      // Invalida tokens anteriores
      await tx.passwordResetToken.deleteMany({
        where: { userId: usuario.id },
      });

      // Cria novo token
      await tx.passwordResetToken.create({
        data: {
          userId: usuario.id,
          tokenHash: tokenHash,
          expiresAt: expiresAt,
        },
      });
    });

    try {
      await this.mailService.sendPasswordResetEmail(usuario.email, rawToken);

      await this.auditoriaService.registrar({
        acao: 'SOLICITACAO_RECUPERACAO_SENHA',
        entidade: 'Usuario',
        entidadeId: usuario.id,
        dadosNovos: prepararJsonAuditoria({ email: usuario.email }),
        empresaId: usuario.empresaId ?? undefined,
        usuarioId: usuario.id,
        ip: ip,
      });
    } catch (error) {
      // Falha SMTP logada internamente no MailService
    }
  }

  async redefinirSenha(
    token: string,
    novaSenha: string,
    ip?: string,
  ): Promise<void> {
    const hashedInputToken = createHash('sha256').update(token).digest('hex');

    await this.prisma.$transaction(async (tx) => {
      // 1. Busca o token com bloqueio de linha (FOR UPDATE) para garantir atomicidade
      const tokens = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "PasswordResetToken"
        WHERE "tokenHash" = ${hashedInputToken}
        FOR UPDATE
      `;

      if (!tokens || tokens.length === 0) {
        throw new BadRequestException('Token de recuperação inválido.');
      }

      const tokenId = tokens[0].id;
      const tokenRecord = await tx.passwordResetToken.findUnique({
        where: { id: tokenId },
      });

      if (
        !tokenRecord ||
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

      // 2. Atualiza senha e incrementa versão de autorização
      await tx.usuario.update({
        where: { id: usuario.id },
        data: {
          senha: senhaHashed,
          versaoAutorizacao: { increment: 1 },
        },
      });

      // 3. Marca token como utilizado
      await tx.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      });

      // 4. Registra auditoria
      await this.auditoriaService.registrar({
        acao: 'REDEFINICAO_SENHA_CONCLUIDA',
        entidade: 'Usuario',
        entidadeId: usuario.id,
        dadosNovos: prepararJsonAuditoria({ senhaAlterada: true }),
        empresaId: usuario.empresaId ?? undefined,
        usuarioId: usuario.id,
        ip: ip,
      });
    });
  }
}
