export const usuariosQueryKeys = {
  perfis: (empresaId: string | null, usuarioId: string) =>
    ["usuarios", empresaId ?? "global", usuarioId, "perfis"] as const,
};
