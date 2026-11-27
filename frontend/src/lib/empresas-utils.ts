export type SituacaoComercialInfo = {
  rotulo: string;
  bloqueada: boolean;
};

/**
 * Espelha a semântica de `avaliarSituacaoComercial` (V3.6.4) apenas para
 * exibição: intervalo `[inicio, fim)` em instantes UTC; ambos os campos
 * nulos representam empresa legada (sem validade limitada). A autoridade
 * do bloqueio operacional permanece no backend.
 */
export function situacaoComercialEmpresa(empresa: {
  validadeComercialInicio?: string | null;
  validadeComercialFim?: string | null;
}): SituacaoComercialInfo {
  const inicio = empresa.validadeComercialInicio ?? null;
  const fim = empresa.validadeComercialFim ?? null;

  if (inicio === null && fim === null) {
    return { rotulo: "Legada (sem validade limitada)", bloqueada: false };
  }

  const inicioMs = inicio === null ? NaN : Date.parse(inicio);
  const fimMs = fim === null ? NaN : Date.parse(fim);
  const agora = Date.now();

  if (Number.isNaN(inicioMs) || Number.isNaN(fimMs) || fimMs <= inicioMs) {
    return {
      rotulo: "Dados comerciais inválidos (bloqueada)",
      bloqueada: true,
    };
  }

  if (agora < inicioMs) {
    return { rotulo: "Validade ainda não iniciada", bloqueada: true };
  }

  if (agora >= fimMs) {
    return { rotulo: "Validade comercial expirada", bloqueada: true };
  }

  return { rotulo: "Vigente", bloqueada: false };
}

export function formatarCnpj(valor?: string | null): string {
  if (!valor) return "—";
  const digitos = valor.replace(/\D/g, "");
  if (digitos.length === 14) {
    return digitos.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      "$1.$2.$3/$4-$5",
    );
  }
  return valor;
}

export function formatarDataUtc(valor?: string | null): string {
  if (!valor) return "—";
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? "—" : data.toISOString().slice(0, 10);
}
