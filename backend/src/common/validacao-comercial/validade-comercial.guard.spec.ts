import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { PERMITIR_VALIDADE_EXPIRADA_KEY } from './permitir-validade-expirada.decorator';
import {
  CODIGO_EMPRESA_INATIVA,
  CODIGO_VALIDADE_COMERCIAL_EXPIRADA,
  CODIGO_VALIDADE_COMERCIAL_INVALIDA,
} from './situacao-comercial';
import { ValidadeComercialGuard } from './validade-comercial.guard';

const guard = new ValidadeComercialGuard();

const usuario = (dados: Partial<AuthenticatedUser>): AuthenticatedUser => ({
  id: 'usuario-1',
  email: 'usuario@sistema.com',
  tipo: 'ADMIN_EMPRESA',
  empresaId: '11111111-1111-4111-8111-111111111111',
  ...dados,
});

const contexto = (
  dados: Partial<AuthenticatedUser> | null,
  permitirValidadeExpirada = false,
): ExecutionContext => {
  const handler = (): void => undefined;
  if (permitirValidadeExpirada) {
    Reflect.defineMetadata(PERMITIR_VALIDADE_EXPIRADA_KEY, true, handler);
  }
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: dados === null ? undefined : usuario(dados) }),
    }),
    getHandler: () => handler,
    getClass: () => class RotaTeste {},
  } as unknown as ExecutionContext;
};

const capturarErro = (execucao: () => boolean): ForbiddenException => {
  try {
    execucao();
  } catch (erro) {
    expect(erro).toBeInstanceOf(ForbiddenException);
    return erro as ForbiddenException;
  }
  throw new Error('Esperava ForbiddenException.');
};

describe('ValidadeComercialGuard', () => {
  it('não interfere em requisições sem usuário autenticado', () => {
    expect(guard.canActivate(contexto(null))).toBe(true);
  });

  it.each([
    ['sem validade limitada (legado)', 'SEM_VALIDADE_LIMITADA'],
    ['vigente', 'VIGENTE'],
  ])('libera empresa %s', (_cenario, situacao) => {
    expect(
      guard.canActivate(
        contexto({
          situacaoComercial: situacao as AuthenticatedUser['situacaoComercial'],
          codigoBloqueio: null,
        }),
      ),
    ).toBe(true);
  });

  it('bloqueia validade expirada com código próprio', () => {
    const erro = capturarErro(() =>
      guard.canActivate(
        contexto({
          situacaoComercial: 'EXPIRADA',
          codigoBloqueio: CODIGO_VALIDADE_COMERCIAL_EXPIRADA,
        }),
      ),
    );

    expect(erro.getStatus()).toBe(403);
    expect(erro.getResponse()).toEqual({
      error: CODIGO_VALIDADE_COMERCIAL_EXPIRADA,
      message:
        'A validade comercial da empresa não está vigente. Regularize o acesso para continuar.',
    });
  });

  it('bloqueia validade ainda não iniciada com o mesmo código público', () => {
    const erro = capturarErro(() =>
      guard.canActivate(
        contexto({
          situacaoComercial: 'NAO_INICIADA',
          codigoBloqueio: CODIGO_VALIDADE_COMERCIAL_EXPIRADA,
        }),
      ),
    );

    expect(erro.getResponse()).toMatchObject({
      error: CODIGO_VALIDADE_COMERCIAL_EXPIRADA,
    });
  });

  it('bloqueia suspensão administrativa com código distinto', () => {
    const erro = capturarErro(() =>
      guard.canActivate(
        contexto({
          situacaoComercial: 'VIGENTE',
          codigoBloqueio: CODIGO_EMPRESA_INATIVA,
        }),
      ),
    );

    expect(erro.getResponse()).toEqual({
      error: CODIGO_EMPRESA_INATIVA,
      message: 'Empresa inativa não pode utilizar este módulo.',
    });
  });

  it('bloqueia dados comerciais inválidos (fail-closed)', () => {
    const erro = capturarErro(() =>
      guard.canActivate(
        contexto({
          situacaoComercial: 'INVALIDA',
          codigoBloqueio: CODIGO_VALIDADE_COMERCIAL_INVALIDA,
        }),
      ),
    );

    expect(erro.getResponse()).toMatchObject({
      error: CODIGO_VALIDADE_COMERCIAL_INVALIDA,
    });
  });

  it.each([
    'VALIDADE_COMERCIAL_EXPIRADA',
    'EMPRESA_INATIVA',
    'VALIDADE_COMERCIAL_INVALIDA',
  ])('allowlist libera a rota mesmo bloqueada (%s)', (codigo) => {
    expect(
      guard.canActivate(
        contexto(
          { situacaoComercial: 'EXPIRADA', codigoBloqueio: codigo },
          true,
        ),
      ),
    ).toBe(true);
  });

  it('SUPER_ADMIN global é isento do bloqueio comercial', () => {
    expect(
      guard.canActivate(
        contexto({
          tipo: 'SUPER_ADMIN',
          empresaId: null,
          codigoBloqueio: CODIGO_VALIDADE_COMERCIAL_EXPIRADA,
        }),
      ),
    ).toBe(true);
  });

  it('não expõe senha, hash ou token no erro de bloqueio', () => {
    const erro = capturarErro(() =>
      guard.canActivate(
        contexto({
          situacaoComercial: 'EXPIRADA',
          codigoBloqueio: CODIGO_VALIDADE_COMERCIAL_EXPIRADA,
        }),
      ),
    );
    const serializado = JSON.stringify(erro.getResponse()).toLowerCase();

    expect(serializado).not.toContain('senha');
    expect(serializado).not.toContain('hash');
    expect(serializado).not.toContain('token');
  });
});
