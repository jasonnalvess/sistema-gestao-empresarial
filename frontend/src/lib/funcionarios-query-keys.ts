import type {
  FiltrosFuncionarios,
  FiltrosEstrutura,
  EstruturaTipo,
} from "@/services/funcionarios.service";
export const funcionariosQueryKeys = {
  raiz: (empresa: string) => ["funcionarios", empresa] as const,
  lista: (empresa: string, filtros: FiltrosFuncionarios) =>
    [...funcionariosQueryKeys.raiz(empresa), "listas", filtros] as const,
  detalhe: (empresa: string, id: string) =>
    [...funcionariosQueryKeys.raiz(empresa), "detalhe", id] as const,
  pessoais: (empresa: string, id: string) =>
    [...funcionariosQueryKeys.raiz(empresa), "pessoais", id] as const,
  historico: (empresa: string, id: string, page: number) =>
    [...funcionariosQueryKeys.raiz(empresa), "historico", id, page] as const,
  estrutura: (
    empresa: string,
    tipo: EstruturaTipo,
    filtros: FiltrosEstrutura,
  ) =>
    [...funcionariosQueryKeys.raiz(empresa), tipo, "lista", filtros] as const,
  estruturaDetalhe: (empresa: string, tipo: EstruturaTipo, id: string) =>
    [...funcionariosQueryKeys.raiz(empresa), tipo, "detalhe", id] as const,
  seletor: (
    empresa: string,
    tipo: string,
    search: string,
    page: number,
    apenasAtivos: boolean,
  ) =>
    [
      ...funcionariosQueryKeys.raiz(empresa),
      "seletores",
      tipo,
      search,
      page,
      apenasAtivos,
    ] as const,
};
