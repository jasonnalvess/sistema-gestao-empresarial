import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, Observable, of } from 'rxjs';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditoriaAcao, AuditoriaEntidade } from '../enums/auditoria.enum';
import { AuditoriaInterceptor } from './auditoria.interceptor';

describe('AuditoriaInterceptor', () => {
  const auditoriaService = new AuditoriaService({} as PrismaService);
  let registrar: jest.SpiedFunction<AuditoriaService['registrar']>;
  const reflector = new Reflector();
  const interceptor = new AuditoriaInterceptor(auditoriaService, reflector);

  beforeEach(() => {
    jest.restoreAllMocks();
    registrar = jest.spyOn(auditoriaService, 'registrar').mockResolvedValue({
      id: 'log-id',
      acao: 'CRIAR',
      entidade: 'PRODUTO',
      entidadeId: null,
      dadosAntigos: null,
      dadosNovos: null,
      empresaId: null,
      usuarioId: null,
      ip: null,
      createdAt: new Date(),
    });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      acao: AuditoriaAcao.CRIAR,
      entidade: AuditoriaEntidade.PRODUTO,
    });
  });

  it('instancia o interceptor', () => {
    expect(interceptor).toBeDefined();
  });

  it('não grava operação não decorada', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const resposta = { id: 'recurso-id' };

    await expect(executar(resposta)).resolves.toBe(resposta);
    expect(registrar).not.toHaveBeenCalled();
  });

  it.each([
    [
      'envelope data.id',
      { success: true, data: { id: 'data-id' } },
      {},
      'data-id',
    ],
    ['resposta direta id', { id: 'direto-id' }, {}, 'direto-id'],
    ['params.id', { nome: 'sem id' }, { id: 'params-id' }, 'params-id'],
    ['ausência de id', { nome: 'sem id' }, {}, undefined],
    ['data array', { data: [{ id: 'item-id' }] }, {}, undefined],
    [
      'data paginada',
      { data: { data: [{ id: 'item-id' }], meta: {} } },
      {},
      undefined,
    ],
  ])(
    'resolve entidadeId para %s',
    async (_cenario, resposta, params, esperado) => {
      await executar(resposta, { params, body: {} });
      expect(registrar).toHaveBeenCalledWith(
        expect.objectContaining({ entidadeId: esperado }),
      );
    },
  );

  it('preserva exatamente a resposta original e grava operação decorada', async () => {
    const resposta = { success: true, data: { id: 'produto-id' } };
    await expect(executar(resposta)).resolves.toBe(resposta);
    expect(registrar).toHaveBeenCalledTimes(1);
  });

  it('trata falha de gravação sem quebrar a resposta', async () => {
    const erroLogger = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation();
    registrar.mockRejectedValueOnce(new Error('indisponível'));
    const resposta = { id: 'produto-id' };

    await expect(executar(resposta)).resolves.toBe(resposta);
    expect(erroLogger).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      'SUPER_ADMIN com empresa validada',
      { id: 'admin', tipo: 'SUPER_ADMIN', empresaId: null },
      { empresaId: 'empresa-validada', origem: 'SUPER_ADMIN_HEADER' },
      'empresa-validada',
    ],
    [
      'usuário empresarial',
      { id: 'usuario', tipo: 'USUARIO_EMPRESA', empresaId: 'empresa-usuario' },
      undefined,
      'empresa-usuario',
    ],
    [
      'operação global',
      { id: 'admin', tipo: 'SUPER_ADMIN', empresaId: null },
      undefined,
      undefined,
    ],
  ])(
    'registra empresa efetiva: %s',
    async (_cenario, user, empresaContexto, esperado) => {
      await executar(
        {},
        { user, empresaContexto, headers: { 'x-empresa-id': 'nao-confiavel' } },
      );
      expect(registrar).toHaveBeenCalledWith(
        expect.objectContaining({ empresaId: esperado }),
      );
    },
  );

  it('não aceita header como contexto empresarial', async () => {
    await executar(
      {},
      {
        user: { id: 'admin', tipo: 'SUPER_ADMIN', empresaId: null },
        headers: { 'x-empresa-id': 'empresa-header' },
      },
    );
    expect(registrar).toHaveBeenCalledWith(
      expect.objectContaining({ empresaId: undefined }),
    );
  });

  it('preserva usuário e IP sem registrar request ou headers', async () => {
    await executar(
      {},
      {
        user: {
          id: 'usuario-id',
          tipo: 'USUARIO_EMPRESA',
          empresaId: 'empresa-id',
        },
        ip: '127.0.0.1',
        headers: { authorization: 'Bearer segredo', cookie: 'segredo' },
      },
    );
    expect(registrar).toHaveBeenCalledWith(
      expect.objectContaining({ usuarioId: 'usuario-id', ip: '127.0.0.1' }),
    );
    expect(registrar.mock.calls[0][0]).not.toHaveProperty('headers');
  });

  it('sanitiza body sem mutar o original', async () => {
    const body = {
      nome: 'Produto',
      Password: 'segredo',
      perfil: { access_token: 'token', ativo: true },
      itens: [{ API_KEY: 'chave', valor: 2 }],
    };
    await executar({}, { body });

    expect(registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        dadosNovos: {
          nome: 'Produto',
          Password: '[REDACTED]',
          perfil: { access_token: '[REDACTED]', ativo: true },
          itens: [{ API_KEY: '[REDACTED]', valor: 2 }],
        },
      }),
    );
    expect(body.Password).toBe('segredo');
  });

  it('sanitiza a resposta quando não há body', async () => {
    await executar(
      { data: { id: 'id', refreshToken: 'segredo', nome: 'Nome' } },
      { body: undefined },
    );
    expect(registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        dadosNovos: { id: 'id', refreshToken: '[REDACTED]', nome: 'Nome' },
      }),
    );
  });

  function executar(
    resposta: unknown,
    requestParcial: Record<string, unknown> = {},
  ): Promise<unknown> {
    const request = {
      params: {},
      body: {},
      headers: {},
      ip: '127.0.0.1',
      ...requestParcial,
    };
    const context = {
      getHandler: () => executar,
      getClass: () => AuditoriaInterceptor,
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    const next: CallHandler = {
      handle: (): Observable<unknown> => of(resposta),
    };
    return firstValueFrom(interceptor.intercept(context, next));
  }
});
