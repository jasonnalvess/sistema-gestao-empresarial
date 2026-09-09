import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: jest.Mocked<Reflector>;

  const criarContexto = (user?: { permissoes?: string[] }): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new PermissionsGuard(reflector);
  });

  it('deve permitir acesso quando nenhuma permissão for exigida', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const resultado = guard.canActivate(criarContexto());

    expect(resultado).toBe(true);
  });

  it('deve permitir acesso quando a lista de permissões exigidas estiver vazia', () => {
    reflector.getAllAndOverride.mockReturnValue([]);

    const resultado = guard.canActivate(criarContexto());

    expect(resultado).toBe(true);
  });

  it('deve permitir acesso quando o usuário possuir a permissão exigida', () => {
    reflector.getAllAndOverride.mockReturnValue(['usuarios.visualizar']);

    const resultado = guard.canActivate(
      criarContexto({
        permissoes: ['usuarios.visualizar'],
      }),
    );

    expect(resultado).toBe(true);
  });

  it('deve permitir acesso quando o usuário possuir todas as permissões exigidas', () => {
    reflector.getAllAndOverride.mockReturnValue([
      'usuarios.visualizar',
      'usuarios.editar',
    ]);

    const resultado = guard.canActivate(
      criarContexto({
        permissoes: [
          'usuarios.visualizar',
          'usuarios.editar',
          'usuarios.criar',
        ],
      }),
    );

    expect(resultado).toBe(true);
  });

  it('deve negar acesso quando o usuário não estiver disponível na requisição', () => {
    reflector.getAllAndOverride.mockReturnValue(['usuarios.visualizar']);

    expect(() => guard.canActivate(criarContexto())).toThrow(
      ForbiddenException,
    );
  });

  it('deve negar acesso quando o usuário não possuir a permissão exigida', () => {
    reflector.getAllAndOverride.mockReturnValue(['usuarios.editar']);

    expect(() =>
      guard.canActivate(
        criarContexto({
          permissoes: ['usuarios.visualizar'],
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('deve negar acesso quando faltar uma das permissões exigidas', () => {
    reflector.getAllAndOverride.mockReturnValue([
      'usuarios.visualizar',
      'usuarios.editar',
    ]);

    expect(() =>
      guard.canActivate(
        criarContexto({
          permissoes: ['usuarios.visualizar'],
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('deve considerar ausência de permissões como uma lista vazia', () => {
    reflector.getAllAndOverride.mockReturnValue(['usuarios.visualizar']);

    expect(() =>
      guard.canActivate(
        criarContexto({
          permissoes: undefined,
        }),
      ),
    ).toThrow(ForbiddenException);
  });
});
