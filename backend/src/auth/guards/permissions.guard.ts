import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import type { AuthenticatedRequest } from '../types/authenticated-request.type';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permissoesObrigatorias = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!permissoesObrigatorias || permissoesObrigatorias.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const usuario = request.user;

    if (!usuario) {
      throw new ForbiddenException('Usuário autenticado não encontrado.');
    }

    const permissoesDoUsuario = usuario.permissoes ?? [];

    const possuiTodasAsPermissoes = permissoesObrigatorias.every((permissao) =>
      permissoesDoUsuario.includes(permissao),
    );

    if (!possuiTodasAsPermissoes) {
      throw new ForbiddenException(
        'Usuário não possui as permissões necessárias para esta operação.',
      );
    }

    return true;
  }
}
