import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TrocaSenhaObrigatoriaGuard } from './troca-senha-obrigatoria.guard';
import { ValidadeComercialGuard } from '../../common/validacao-comercial/validade-comercial.guard';

/**
 * Guard de autenticação única de todas as rotas protegidas.
 *
 * A cadeia garante, nesta ordem:
 * 1. autenticação JWT (401);
 * 2. troca obrigatória de senha (V3.6.3);
 * 3. bloqueio comercial (V3.6.4) — válido para toda rota autenticada,
 *    independentemente de usar ou não `EmpresaContextoGuard`.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const autenticado = await super.canActivate(context);
    return (
      Boolean(autenticado) &&
      new TrocaSenhaObrigatoriaGuard().canActivate(context) &&
      new ValidadeComercialGuard().canActivate(context)
    );
  }
}
