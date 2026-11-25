import type {
  AuditoriaFiltros,
  AuditoriaFiltrosGlobais,
} from "@/services/auditoria.service";

export const auditoriaQueryKeys = {
  root: ["auditoria"] as const,
  empresa: (empresaId: string, filtros: AuditoriaFiltros) =>
    ["auditoria", "empresa", empresaId, filtros] as const,
  global: (filtros: AuditoriaFiltrosGlobais) =>
    ["auditoria", "global", filtros] as const,
};
