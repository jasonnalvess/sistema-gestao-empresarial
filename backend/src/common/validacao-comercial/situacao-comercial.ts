/**
 * Códigos públicos de bloqueio comercial.
 *
 * O frontend distingue os dois motivos oficiais da V3.6.4:
 * - VALIDADE_COMERCIAL_EXPIRADA: trial/validade comercial não vigente;
 * - EMPRESA_INATIVA: suspensão administrativa (`Empresa.ativa = false`).
 *
 * VALIDADE_COMERCIAL_INVALIDA é um código defensivo para dados comerciais
 * inconsistentes persistidos fora do fluxo da aplicação. A decisão é
 * fail-closed: dados inválidos nunca liberam operações empresariais.
 */
export const CODIGO_VALIDADE_COMERCIAL_EXPIRADA = 'VALIDADE_COMERCIAL_EXPIRADA';
export const CODIGO_VALIDADE_COMERCIAL_INVALIDA = 'VALIDADE_COMERCIAL_INVALIDA';
export const CODIGO_EMPRESA_INATIVA = 'EMPRESA_INATIVA';

/** Duração oficial do trial: 30 dias corridos (UTC). */
export const DIAS_TRIAL_PADRAO = 30;
/** Duração máxima aceita em uma regularização administrativa. */
export const DIAS_VALIDADE_MAXIMO = 3650;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

export type SituacaoComercial =
  | 'SEM_VALIDADE_LIMITADA'
  | 'VIGENTE'
  | 'NAO_INICIADA'
  | 'EXPIRADA'
  | 'INVALIDA';

export type PeriodoComercial = {
  validadeComercialInicio: Date | null;
  validadeComercialFim: Date | null;
};

export type AvaliacaoComercial = {
  situacao: SituacaoComercial;
  bloqueada: boolean;
  codigoBloqueio: string | null;
};

function instanteValido(valor: Date | null): valor is Date {
  return valor instanceof Date && Number.isFinite(valor.getTime());
}

/**
 * Avalia a validade comercial em UTC usando instantes (epoch), sem qualquer
 * dependência do timezone do processo. O intervalo é sempre `[inicio, fim)`:
 * `agora >= fim` está expirado e `agora < inicio` ainda não está vigente.
 *
 * Ambos os campos nulos representam empresa legada / sem validade limitada.
 * Qualquer inconsistência é tratada como bloqueio (fail-closed).
 */
export function avaliarSituacaoComercial(
  periodo: PeriodoComercial,
  agora: Date = new Date(),
): AvaliacaoComercial {
  const inicio = periodo.validadeComercialInicio;
  const fim = periodo.validadeComercialFim;

  if (inicio === null && fim === null) {
    return {
      situacao: 'SEM_VALIDADE_LIMITADA',
      bloqueada: false,
      codigoBloqueio: null,
    };
  }

  if (
    !instanteValido(inicio) ||
    !instanteValido(fim) ||
    fim.getTime() <= inicio.getTime() ||
    !instanteValido(agora)
  ) {
    return {
      situacao: 'INVALIDA',
      bloqueada: true,
      codigoBloqueio: CODIGO_VALIDADE_COMERCIAL_INVALIDA,
    };
  }

  const agoraMs = agora.getTime();
  if (agoraMs < inicio.getTime()) {
    return {
      situacao: 'NAO_INICIADA',
      bloqueada: true,
      codigoBloqueio: CODIGO_VALIDADE_COMERCIAL_EXPIRADA,
    };
  }

  if (agoraMs >= fim.getTime()) {
    return {
      situacao: 'EXPIRADA',
      bloqueada: true,
      codigoBloqueio: CODIGO_VALIDADE_COMERCIAL_EXPIRADA,
    };
  }

  return { situacao: 'VIGENTE', bloqueada: false, codigoBloqueio: null };
}

/**
 * Calcula a janela comercial de `dias` dias corridos a partir de `inicio`,
 * sempre em instantes UTC (soma de milissegundos, imune a horário de verão).
 */
export function calcularPeriodoComercial(
  inicio: Date,
  dias: number,
): PeriodoComercial {
  if (
    !instanteValido(inicio) ||
    !Number.isInteger(dias) ||
    dias < 1 ||
    dias > DIAS_VALIDADE_MAXIMO
  ) {
    throw new Error('Período comercial inválido.');
  }

  return {
    validadeComercialInicio: new Date(inicio.getTime()),
    validadeComercialFim: new Date(inicio.getTime() + dias * MS_POR_DIA),
  };
}

/**
 * O Prisma devolve `timestamp(3)` como Date em UTC. A conversão abaixo existe
 * apenas para auditoria (ISO-8601 UTC) e nunca usa formatação local.
 */
export function comoIsoUtc(valor: Date | null | undefined): string | null {
  return valor instanceof Date && Number.isFinite(valor.getTime())
    ? valor.toISOString()
    : null;
}
