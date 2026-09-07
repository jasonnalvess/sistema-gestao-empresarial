import { PrismaService } from '../../prisma/prisma.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthenticatedUser } from '../types/authenticated-user.type';
import type { JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (
      typeof payload.id !== 'string' ||
      !payload.id ||
      typeof payload.versaoAutorizacao !== 'number' ||
      !Number.isSafeInteger(payload.versaoAutorizacao) ||
      payload.versaoAutorizacao < 0
    ) {
      throw new UnauthorizedException('Sessão inválida. Faça login novamente.');
    }
    const usuario = await this.prisma.usuario
      .findUnique({
        where: { id: payload.id },
        select: {
          ativo: true,
          versaoAutorizacao: true,
          tipo: true,
          empresaId: true,
        },
      })
      .catch(() => {
        throw new UnauthorizedException(
          'Sessão inválida. Faça login novamente.',
        );
      });
    if (
      !usuario ||
      !usuario.ativo ||
      usuario.versaoAutorizacao !== payload.versaoAutorizacao ||
      usuario.tipo !== payload.tipo ||
      usuario.empresaId !== payload.empresaId
    ) {
      throw new UnauthorizedException('Sessão inválida. Faça login novamente.');
    }
    return {
      versaoAutorizacao: payload.versaoAutorizacao,
      id: payload.id,
      email: payload.email,
      tipo: payload.tipo,
      empresaId: payload.empresaId,
      perfis: payload.perfis ?? [],
      permissoes: payload.permissoes ?? [],
    };
  }
}
