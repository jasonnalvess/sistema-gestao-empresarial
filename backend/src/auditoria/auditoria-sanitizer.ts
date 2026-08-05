import { Prisma } from '@prisma/client';

export const AUDITORIA_REDACTED = '[REDACTED]';
export const AUDITORIA_CIRCULAR = '[Circular]';

const CHAVES_SENSIVEIS = new Set([
  'password',
  'senha',
  'passwordhash',
  'hashsenha',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'secret',
  'clientsecret',
  'apikey',
  'apisecret',
  'databaseurl',
  'cookie',
  'setcookie',
]);

function normalizarChave(chave: string): string {
  return chave.toLowerCase().replace(/[-_\s]/g, '');
}

function objetoSimples(valor: object): valor is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(valor) as object | null;
  return prototype === Object.prototype || prototype === null;
}

export function sanitizarDadosAuditoria(valor: unknown): unknown {
  return sanitizar(valor, new WeakSet<object>());
}

function sanitizar(valor: unknown, visitados: WeakSet<object>): unknown {
  if (
    valor === null ||
    valor === undefined ||
    typeof valor !== 'object' ||
    valor instanceof Date ||
    Prisma.Decimal.isDecimal(valor)
  ) {
    return valor;
  }

  if (!Array.isArray(valor) && !objetoSimples(valor)) {
    return valor;
  }

  if (visitados.has(valor)) return AUDITORIA_CIRCULAR;
  visitados.add(valor);

  if (Array.isArray(valor)) {
    const resultado = valor.map((item) => sanitizar(item, visitados));
    visitados.delete(valor);
    return resultado;
  }

  const resultado: Record<string, unknown> = {};
  for (const [chave, conteudo] of Object.entries(valor)) {
    resultado[chave] = CHAVES_SENSIVEIS.has(normalizarChave(chave))
      ? AUDITORIA_REDACTED
      : sanitizar(conteudo, visitados);
  }
  visitados.delete(valor);
  return resultado;
}

export function prepararJsonAuditoria(
  valor: unknown,
): Prisma.InputJsonValue | undefined {
  if (valor === undefined) return undefined;
  const convertido = converterParaJson(sanitizarDadosAuditoria(valor));
  return convertido === null ? undefined : convertido;
}

function converterParaJson(valor: unknown): Prisma.InputJsonValue | null {
  if (valor === null) return null;
  if (typeof valor === 'string' || typeof valor === 'boolean') return valor;
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : String(valor);
  }
  if (typeof valor === 'bigint') return valor.toString();
  if (valor instanceof Date) return valor.toISOString();
  if (Prisma.Decimal.isDecimal(valor)) return valor.toString();
  if (Array.isArray(valor)) return valor.map(converterParaJson);
  if (typeof valor === 'object' && objetoSimples(valor)) {
    const resultado: Record<string, Prisma.InputJsonValue | null> = {};
    for (const [chave, conteudo] of Object.entries(valor)) {
      if (conteudo !== undefined)
        resultado[chave] = converterParaJson(conteudo);
    }
    return resultado;
  }
  return '[Unsupported Object]';
}
