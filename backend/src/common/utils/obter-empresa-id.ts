import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';

export function obterEmpresaId(usuarioLogado: AuthenticatedUser): string {
  if (!usuarioLogado.empresaId) {
    throw new ForbiddenException(
      'Usuário não está vinculado a nenhuma empresa',
    );
  }

  return usuarioLogado.empresaId;
}
