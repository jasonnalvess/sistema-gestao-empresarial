import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../../auth/types/authenticated-request.type';
import { PERMITIR_VALIDADE_EXPIRADA_KEY } from './permitir-validade-expirada.decorator';
import {
  CODIGO_EMPRESA_INATIVA,
  CODIGO_VALIDADE_COMERCIAL_EXPIRADA,
  CODIGO_VALIDADE_COMERCIAL_INVALIDA,
} from './situacao-comercial';

const MENSAGENS_BLOQUEIO: Record<string, string> = {
  [CODIGO_EMPRESA_INATIVA]: 'Empresa inativa não pode utilizar este módulo.',
  [CODIGO_VALIDADE_COMERCIAL_EXPIRADA]:
    'A validade comercial da empresa não está vigente. Regularize o acesso para continuar.',
  [CODIGO_VALIDADE_COMERCIAL_INVALIDA]:
    'A validade comercial da empresa está inconsistente e o acesso foi bloqueado.',
};

/**
 * Enforcement comercial centralizado.
 *
 * É executado pelo `JwtAuthGuard` depois da autenticação e da verificação de
 * troca obrigatória, portanto cobre TODA rota autenticada — inclusive as que
 * não usam `EmpresaContextoGuard`. A situação é resolvida no `JwtStrategy` na
 * mesma consulta do usuário (sem roundtrip adicional) e reavaliada a cada
 * requisição, sem cache.
 *
 * SUPER_ADMIN global é isento: preserva a capacidade administrativa sobre
 * empresas com validade expirada (regularização, suporte).
 */
@Injectable()
export class ValidadeComercialGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Partial<AuthenticatedRequest>>();
    const usuario = request.user;

    if (!usuario) return true;
    if (usuario.tipo === 'SUPER_ADMIN') return true;

    const permitido = new Reflector().getAllAndOverride<boolean>(
      PERMITIR_VALIDADE_EXPIRADA_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (permitido) return true;

    const codigo = usuario.codigoBloqueio;
    if (!codigo) return true;

    throw new ForbiddenException({
      error: codigo,
      message:
        MENSAGENS_BLOQUEIO[codigo] ??
        'O acesso empresarial está bloqueado pela situação comercial.',
    });
  }
}
