import { PrismaClient } from '@prisma/client';

export const BANCO_INTEGRACAO = 'sistema_gestao_integracao';
export const VARIAVEL_URL_INTEGRACAO = 'INTEGRATION_DATABASE_URL';
export const VARIAVEL_HABILITACAO = 'RUN_VALIDADE_COMERCIAL_INTEGRATION_TESTS';

export function obterUrlIntegracao(): string | null {
  const url = process.env[VARIAVEL_URL_INTEGRACAO];
  return typeof url === 'string' && url.trim().length > 0 ? url.trim() : null;
}

export function integracaoHabilitada(): boolean {
  return (
    process.env[VARIAVEL_HABILITACAO] === 'true' &&
    obterUrlIntegracao() !== null
  );
}

export function criarClienteIntegracao(): PrismaClient {
  const url = obterUrlIntegracao();
  if (!url) throw new Error('URL de integração ausente.');
  return new PrismaClient({ datasources: { db: { url } } });
}

/**
 * Fixtures mínimas da V3.6.4 para o banco `sistema_gestao_integracao`.
 *
 * Este módulo existe para manter o padrão gated do projeto: os testes reais
 * só executam com RUN_VALIDADE_COMERCIAL_INTEGRATION_TESTS=true e
 * INTEGRATION_DATABASE_URL apontando para `sistema_gestao_integracao`.
 */
export const PREFIXO_FIXTURE = 'IT_VALIDADE_COMERCIAL_';
