import type {
  FiltrosClienteInteracoes,
  FiltrosCrmEtapas,
  FiltrosCrmOportunidades,
} from "@/services/crm.service";

export const crmQueryKeys = {
  raiz: (empresaId: string) => ["crm", empresaId] as const,
  responsaveis: (empresaId: string) =>
    [...crmQueryKeys.raiz(empresaId), "responsaveis"] as const,
  etapas: (empresaId: string) =>
    [...crmQueryKeys.raiz(empresaId), "etapas"] as const,
  listaEtapas: (empresaId: string, filtros: FiltrosCrmEtapas = {}) =>
    [...crmQueryKeys.etapas(empresaId), "lista", filtros] as const,
  oportunidades: (empresaId: string) =>
    [...crmQueryKeys.raiz(empresaId), "oportunidades"] as const,
  listaOportunidades: (empresaId: string, filtros: FiltrosCrmOportunidades) =>
    [...crmQueryKeys.oportunidades(empresaId), "lista", filtros] as const,
  detalheOportunidade: (empresaId: string, oportunidadeId: string) =>
    [
      ...crmQueryKeys.oportunidades(empresaId),
      "detalhe",
      oportunidadeId,
    ] as const,
  interacoes: (empresaId: string) =>
    [...crmQueryKeys.raiz(empresaId), "interacoes"] as const,
  listaInteracoes: (empresaId: string, filtros: FiltrosClienteInteracoes) =>
    [...crmQueryKeys.interacoes(empresaId), "lista", filtros] as const,
} as const;
