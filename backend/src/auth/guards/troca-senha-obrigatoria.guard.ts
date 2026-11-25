import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../types/authenticated-request.type';
const PERMITIR_TROCA = 'auth:permitir-troca-pendente';
export const PermitirTrocaPendente = () => SetMetadata(PERMITIR_TROCA, true);
@Injectable()
export class TrocaSenhaObrigatoriaGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const usuario = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>().user;
    if (
      usuario?.trocaSenhaObrigatoria === true &&
      !new Reflector().get<boolean>(PERMITIR_TROCA, context.getHandler())
    ) {
      throw new ForbiddenException({
        error: 'TROCA_SENHA_OBRIGATORIA',
        message: 'É necessário alterar a senha antes de continuar.',
      });
    }
    return true;
  }
}
