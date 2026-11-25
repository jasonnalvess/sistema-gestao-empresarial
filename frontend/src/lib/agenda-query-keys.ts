export type AgendaFiltros = {
  busca?: string;
  status?: string;
  periodo?: string;
  clienteId?: string;
};

export const agendaQueryKeys = {
  raiz: (empresaId: string) => ["agenda", empresaId] as const,
  listas: (empresaId: string) =>
    [...agendaQueryKeys.raiz(empresaId), "lista"] as const,
  lista: (empresaId: string, filtros: AgendaFiltros = {}) =>
    [...agendaQueryKeys.listas(empresaId), filtros] as const,
  detalhe: (empresaId: string, id: string) =>
    [...agendaQueryKeys.raiz(empresaId), "detalhe", id] as const,
  historico: (empresaId: string, id: string) =>
    [...agendaQueryKeys.detalhe(empresaId, id), "historico"] as const,
};
