import { PrismaService } from '../../prisma/prisma.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthenticatedUser } from '../types/authenticated-user.type';
import type { JwtPayload } from '../types/jwt-payload.type';
import {
  avaliarSituacaoComercial,
  CODIGO_EMPRESA_INATIVA,
  CODIGO_VALIDADE_COMERCIAL_INVALIDA,
  type SituacaoComercial,
} from '../../common/validacao-comercial/situacao-comercial';

type EmpresaAutenticacao = {
  ativa: boolean;
  validadeComercialInicio: Date | null;
  validadeComercialFim: Date | null;
};

type UsuarioAutenticacao = {
  ativo: boolean;
  trocaSenhaObrigatoria: boolean;
  emailVerificado: boolean;
  versaoAutorizacao: number;
  tipo: string;
  empresaId: string | null;
  empresa: EmpresaAutenticacao | null;
};

type SituacaoComercialAutenticacao = {
  situacaoComercial?: SituacaoComercial;
  codigoBloqueio: string | null;
};

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
    // A situação comercial é resolvida na MESMA consulta do usuário: a
    // autoridade é o banco e o estado é reavaliado a cada requisição.
    const usuario = await this.prisma.usuario
      .findUnique({
        where: { id: payload.id },
        select: {
          ativo: true,
          trocaSenhaObrigatoria: true,
          emailVerificado: true,
          versaoAutorizacao: true,
          tipo: true,
          empresaId: true,
          empresa: {
            select: {
              ativa: true,
              validadeComercialInicio: true,
              validadeComercialFim: true,
            },
          },
        },
      })
      .catch(() => {
        throw new UnauthorizedException(
          'Sessão inválida. Faça login novamente.',
        );
      });
    // A verificação de e-mail entra nesta checagem, com a mesma resposta
    // genérica dos demais motivos (V3.6.5, E4): um token já emitido deixa de
    // valer quando a conta não está verificada, e o motivo da recusa não é
    // revelado ao portador do token.
    if (
      !usuario ||
      !usuario.ativo ||
      !usuario.emailVerificado ||
      usuario.versaoAutorizacao !== payload.versaoAutorizacao ||
      usuario.tipo !== payload.tipo ||
      usuario.empresaId !== payload.empresaId
    ) {
      throw new UnauthorizedException('Sessão inválida. Faça login novamente.');
    }

    const situacaoComercial = this.avaliarSituacaoComercial(usuario);
    return {
      trocaSenhaObrigatoria: usuario.trocaSenhaObrigatoria,
      versaoAutorizacao: payload.versaoAutorizacao,
      id: payload.id,
      email: payload.email,
      tipo: payload.tipo,
      empresaId: payload.empresaId,
      perfis: payload.perfis ?? [],
      permissoes: payload.permissoes ?? [],
      ...situacaoComercial,
    };
  }

  /**
   * SUPER_ADMIN global é isento do bloqueio comercial e usuários sem empresa
   * não passam por validação comercial (as regras de tenant existentes
   * continuam respondendo). Para os demais, qualquer inconsistência ou
   * ausência da empresa bloqueia (fail-closed).
   */
  private avaliarSituacaoComercial(
    usuario: UsuarioAutenticacao,
  ): SituacaoComercialAutenticacao {
    if (usuario.tipo === 'SUPER_ADMIN' || usuario.empresaId === null) {
      return { codigoBloqueio: null };
    }

    if (!usuario.empresa) {
      return {
        situacaoComercial: 'INVALIDA',
        codigoBloqueio: CODIGO_VALIDADE_COMERCIAL_INVALIDA,
      };
    }

    const avaliacao = avaliarSituacaoComercial(usuario.empresa);

    // A suspensão administrativa tem precedência na distinção do erro, mas a
    // situação comercial continua exposta para consulta/regularização.
    if (!usuario.empresa.ativa) {
      return {
        situacaoComercial: avaliacao.situacao,
        codigoBloqueio: CODIGO_EMPRESA_INATIVA,
      };
    }

    return {
      situacaoComercial: avaliacao.situacao,
      codigoBloqueio: avaliacao.codigoBloqueio,
    };
  }
}
