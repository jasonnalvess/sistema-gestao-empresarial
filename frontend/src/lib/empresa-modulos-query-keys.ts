export const empresaModulosQueryKeys = {
  raiz: (empresaId: string) => ["empresa-modulos", empresaId] as const,
  ativos: (empresaId: string) =>
    [...empresaModulosQueryKeys.raiz(empresaId), "ativos"] as const,
  porEmpresa: (empresaId: string) =>
    [...empresaModulosQueryKeys.raiz(empresaId), "por-empresa"] as const,
} as const;
