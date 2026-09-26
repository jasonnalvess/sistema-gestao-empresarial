import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { prepararJsonAuditoria } from '../auditoria/auditoria-sanitizer';
import type { AuthenticatedUser } from './types/authenticated-user.type';
import { TrocarSenhaDto } from './dto/trocar-senha.dto';
@Injectable()
export class TrocaSenhaService {
  constructor(private readonly prisma: PrismaService) {}
  async trocar(ator: AuthenticatedUser, dados: TrocarSenhaDto) {
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id" = ${ator.id} FOR UPDATE`;
            const usuario = await tx.usuario.findUnique({
              where: { id: ator.id },
              select: {
                senha: true,
                ativo: true,
                versaoAutorizacao: true,
                tipo: true,
                empresaId: true,
              },
            });
            if (
              !usuario?.ativo ||
              !Number.isSafeInteger(ator.versaoAutorizacao) ||
              usuario.versaoAutorizacao !== ator.versaoAutorizacao ||
              usuario.tipo !== ator.tipo ||
              usuario.empresaId !== ator.empresaId
            )
              throw new UnauthorizedException(
                'Sessão inválida. Faça login novamente.',
              );
            if (!(await bcrypt.compare(dados.senhaAtual, usuario.senha)))
              throw new UnauthorizedException('Senha atual inválida.');
            if (await bcrypt.compare(dados.novaSenha, usuario.senha))
              throw new BadRequestException(
                'A nova senha deve ser diferente da atual.',
              );
            const senha = await bcrypt.hash(dados.novaSenha, 10);
            await tx.usuario.update({
              where: { id: ator.id },
              data: {
                senha,
                trocaSenhaObrigatoria: false,
                versaoAutorizacao: { increment: 1 },
              },
              select: { id: true },
            });
            await tx.auditoriaLog.create({
              data: {
                empresaId: usuario.empresaId,
                usuarioId: ator.id,
                entidade: 'USUARIO',
                entidadeId: ator.id,
                acao: 'TROCAR_SENHA',
                dadosNovos: prepararJsonAuditoria({
                  operacaoId: randomUUID(),
                  novoLoginNecessario: true,
                }),
              },
            });
            return { novoLoginNecessario: true };
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
}
