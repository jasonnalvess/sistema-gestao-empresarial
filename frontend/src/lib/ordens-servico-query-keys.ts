import type { FiltrosOrdensServico } from "@/services/ordens-servico.service";

export const ordensServicoQueryKeys = {
  raiz: (empresaId: string) => ["ordens-servico", empresaId] as const,
  listas: (empresaId: string) =>
    [...ordensServicoQueryKeys.raiz(empresaId), "lista"] as const,
  lista: (empresaId: string, filtros: FiltrosOrdensServico) =>
    [...ordensServicoQueryKeys.listas(empresaId), filtros] as const,
  detalhe: (empresaId: string, id: string) =>
    [...ordensServicoQueryKeys.raiz(empresaId), "detalhe", id] as const,
  historico: (empresaId: string, id: string) =>
    [...ordensServicoQueryKeys.detalhe(empresaId, id), "historico"] as const,
};
