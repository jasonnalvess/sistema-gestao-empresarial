type DashboardFiltro = string | number | boolean | null | undefined;

export const dashboardQueryKeys = {
  root: (empresaId: string) => ["dashboard", empresaId] as const,
  resumo: (empresaId: string, ...filtros: DashboardFiltro[]) =>
    [...dashboardQueryKeys.root(empresaId), "resumo", ...filtros] as const,
  movimentacoes: (empresaId: string, ...filtros: DashboardFiltro[]) =>
    [...dashboardQueryKeys.root(empresaId), "movimentacoes", ...filtros] as const,
  estoqueBaixo: (empresaId: string, ...filtros: DashboardFiltro[]) =>
    [...dashboardQueryKeys.root(empresaId), "estoque-baixo", ...filtros] as const,
};
