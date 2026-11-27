import { Prisma } from '@prisma/client';
import {
  BANCO_INTEGRACAO,
  criarObservadorErros,
  integracaoHabilitada,
  obterUrlIntegracao,
  sqlStateDoErro,
  validarIdentidadeBanco,
} from './reset-manual-database-fixtures';

describe('proteções da suíte de integração do reset manual', () => {
  it('habilita somente com RUN_RESET_INTEGRATION_TESTS exatamente true', () => {
    expect(integracaoHabilitada('true')).toBe(true);
    expect(integracaoHabilitada('TRUE')).toBe(false);
    expect(integracaoHabilitada('1')).toBe(false);
    expect(integracaoHabilitada('false')).toBe(false);
    expect(integracaoHabilitada(undefined)).toBe(false);
  });

  it('exige INTEGRATION_DATABASE_URL sem fallback para DATABASE_URL', () => {
    const integracaoOriginal = process.env.INTEGRATION_DATABASE_URL;
    const bancoOriginal = process.env.DATABASE_URL;
    delete process.env.INTEGRATION_DATABASE_URL;
    process.env.DATABASE_URL =
      'postgresql://usuario:senha@host:5432/sistema_gestao_integracao';
    try {
      // Mesmo com DATABASE_URL definida, a ausência da variável exclusiva
      // falha e não há fallback.
      expect(() => obterUrlIntegracao()).toThrow(/INTEGRATION_DATABASE_URL/);
      expect(() => obterUrlIntegracao(undefined)).toThrow(
        /INTEGRATION_DATABASE_URL/,
      );
    } finally {
      if (integracaoOriginal === undefined) {
        delete process.env.INTEGRATION_DATABASE_URL;
      } else {
        process.env.INTEGRATION_DATABASE_URL = integracaoOriginal;
      }
      if (bancoOriginal === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = bancoOriginal;
      }
    }
  });

  it('funciona mesmo quando INTEGRATION_DATABASE_URL está exportada', () => {
    const integracaoOriginal = process.env.INTEGRATION_DATABASE_URL;
    process.env.INTEGRATION_DATABASE_URL =
      'postgresql://usuario:senha@host:5432/sistema_gestao_integracao';
    try {
      expect(integracaoHabilitada('true')).toBe(true);
      expect(integracaoHabilitada('false')).toBe(false);
      expect(obterUrlIntegracao()).toBe(process.env.INTEGRATION_DATABASE_URL);
    } finally {
      if (integracaoOriginal === undefined) {
        delete process.env.INTEGRATION_DATABASE_URL;
      } else {
        process.env.INTEGRATION_DATABASE_URL = integracaoOriginal;
      }
    }
  });

  it('registra código Prisma e SQLSTATE efetivamente recebidos', () => {
    const observador = criarObservadorErros();
    const erroPrisma = new Prisma.PrismaClientKnownRequestError('teste', {
      code: 'P2010',
      clientVersion: 'teste',
      meta: { code: '40P01' },
    });
    observador.registrar(erroPrisma);
    observador.registrar(new Error('erro comum'));

    expect(observador.codigos()).toEqual(['P2010']);
    expect(observador.sqlstates()).toEqual(['40P01']);
    expect(sqlStateDoErro(erroPrisma)).toBe('40P01');
    expect(sqlStateDoErro(new Error('comum'))).toBeNull();
  });

  it('aceita somente o banco e o schema isolados', () => {
    expect(() =>
      validarIdentidadeBanco(BANCO_INTEGRACAO, 'public'),
    ).not.toThrow();
  });

  it.each(['sistema_gestao_teste', 'sistema_gestao_prod', 'outro_banco'])(
    'recusa o banco %s',
    (banco) => {
      expect(() => validarIdentidadeBanco(banco, 'public')).toThrow();
    },
  );

  it('recusa schema diferente de public', () => {
    expect(() => validarIdentidadeBanco(BANCO_INTEGRACAO, 'tenant_x')).toThrow(
      /Schema de integração inesperado/,
    );
  });

  it('não expõe URL ou credenciais na mensagem de erro', () => {
    const original = process.env.INTEGRATION_DATABASE_URL;
    delete process.env.INTEGRATION_DATABASE_URL;
    try {
      let mensagem = '';
      try {
        obterUrlIntegracao();
      } catch (erro) {
        mensagem = erro instanceof Error ? erro.message : String(erro);
      }
      expect(mensagem).toContain('INTEGRATION_DATABASE_URL');
      expect(mensagem).not.toContain('postgresql://');
      expect(mensagem).not.toContain('usuario');
    } finally {
      if (original === undefined) {
        delete process.env.INTEGRATION_DATABASE_URL;
      } else {
        process.env.INTEGRATION_DATABASE_URL = original;
      }
    }
  });
});
