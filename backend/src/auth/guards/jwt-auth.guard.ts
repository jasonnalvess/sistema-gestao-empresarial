import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TrocaSenhaObrigatoriaGuard } from './troca-senha-obrigatoria.guard';
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const autenticado = await super.canActivate(context);
    return (
      Boolean(autenticado) &&
      new TrocaSenhaObrigatoriaGuard().canActivate(context)
    );
  }
}
