import type {
  FiltrosPerfis,
  FiltrosPermissoes,
} from "@/services/perfis.service";

export const perfisQueryKeys = {
  raiz: (empresaId: string) => ["perfis", empresaId] as const,

  listas: (empresaId: string) =>
    [...perfisQueryKeys.raiz(empresaId), "lista"] as const,

  lista: (empresaId: string, filtros: FiltrosPerfis = {}) =>
    [...perfisQueryKeys.listas(empresaId), filtros] as const,

  detalhes: (empresaId: string) =>
    [...perfisQueryKeys.raiz(empresaId), "detalhe"] as const,

  detalhe: (empresaId: string, perfilId: string) =>
    [...perfisQueryKeys.detalhes(empresaId), perfilId] as const,

  permissoes: (empresaId: string) =>
    [...perfisQueryKeys.raiz(empresaId), "permissoes"] as const,

  permissoesLista: (empresaId: string, filtros: FiltrosPermissoes = {}) =>
    [...perfisQueryKeys.permissoes(empresaId), filtros] as const,

  permissoesDelegaveis: (empresaId: string) =>
    [...perfisQueryKeys.permissoes(empresaId), "delegaveis"] as const,

  globais: () => ["perfis", "globais"] as const,

  globaisLista: (filtros: FiltrosPerfis = {}) =>
    [...perfisQueryKeys.globais(), "lista", filtros] as const,

  globalDetalhe: (perfilId: string) =>
    [...perfisQueryKeys.globais(), "detalhe", perfilId] as const,
} as const;
