export const EMPRESA_ID_HEADER = "X-Empresa-Id";
export const EMPRESA_SELECIONADA_STORAGE_KEY = "empresaSelecionadaId";

export function lerEmpresaSelecionadaId(): string | null {
  if (typeof window === "undefined") return null;
  const valor = localStorage.getItem(EMPRESA_SELECIONADA_STORAGE_KEY)?.trim();
  return valor || null;
}
