export type FiltrosResumoFinanceiro = {
  vencimentoInicio?: string;
  vencimentoFim?: string;
};

export const financeiroQueryKeys = {
  raiz: (empresaId: string) => ["financeiro", empresaId] as const,
  resumo: (empresaId: string, filtros: FiltrosResumoFinanceiro = {}) =>
    [...financeiroQueryKeys.raiz(empresaId), "resumo-geral", filtros] as const,
};
