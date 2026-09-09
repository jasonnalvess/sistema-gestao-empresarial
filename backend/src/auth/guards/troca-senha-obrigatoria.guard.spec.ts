import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import {
  PermitirTrocaPendente,
  TrocaSenhaObrigatoriaGuard,
} from './troca-senha-obrigatoria.guard';
class Rotas {
  normal(this: void) {}
  @PermitirTrocaPendente() troca(this: void) {}
}
describe('TrocaSenhaObrigatoriaGuard', () => {
  const guard = new TrocaSenhaObrigatoriaGuard();
  const contexto = (
    trocaSenhaObrigatoria: boolean | undefined,
    handler = Rotas.prototype.normal,
  ) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user: { trocaSenhaObrigatoria } }),
      }),
      getHandler: () => handler,
    }) as unknown as ExecutionContext;
  it('bloqueia pendência independentemente de permissão ou papel', () => {
    expect(() => guard.canActivate(contexto(true))).toThrow(ForbiddenException);
    try {
      guard.canActivate(contexto(true));
    } catch (e) {
      expect((e as ForbiddenException).getResponse()).toEqual({
        error: 'TROCA_SENHA_OBRIGATORIA',
        message: 'É necessário alterar a senha antes de continuar.',
      });
    }
  });
  it('permite somente exceção explícita do handler', () => {
    expect(guard.canActivate(contexto(true, Rotas.prototype.troca))).toBe(true);
  });
  it.each([false, undefined])('preserva sessão sem pendência %s', (flag) => {
    expect(guard.canActivate(contexto(flag))).toBe(true);
  });
});
