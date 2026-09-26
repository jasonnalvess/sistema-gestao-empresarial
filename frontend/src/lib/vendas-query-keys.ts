import type {
  FiltrosDashboardVendas,
  FiltrosVendas,
} from "@/services/vendas.service";

export const vendasQueryKeys = {
  raiz: (empresaId: string) => ["vendas", empresaId] as const,
  listas: (empresaId: string) =>
    [...vendasQueryKeys.raiz(empresaId), "lista"] as const,
  lista: (empresaId: string, filtros: FiltrosVendas) =>
    [...vendasQueryKeys.listas(empresaId), filtros] as const,
  dashboards: (empresaId: string) =>
    [...vendasQueryKeys.raiz(empresaId), "dashboard"] as const,
  dashboard: (empresaId: string, filtros: FiltrosDashboardVendas = {}) =>
    [...vendasQueryKeys.dashboards(empresaId), filtros] as const,
  detalhes: (empresaId: string) =>
    [...vendasQueryKeys.raiz(empresaId), "detalhe"] as const,
  detalhe: (empresaId: string, vendaId: string) =>
    [...vendasQueryKeys.detalhes(empresaId), vendaId] as const,
  historico: (empresaId: string, vendaId: string) =>
    [...vendasQueryKeys.detalhe(empresaId, vendaId), "historico"] as const,
  clientesSelect: (empresaId: string) =>
    [...vendasQueryKeys.raiz(empresaId), "clientes-select"] as const,
} as const;
