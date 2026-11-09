import { api } from "./api";

export type AuditoriaAcao =
  | "CRIAR"
  | "ATUALIZAR"
  | "ATIVAR"
  | "DESATIVAR"
  | "EXCLUIR"
  | "LOGIN"
  | "ENTRADA_ESTOQUE"
  | "SAIDA_ESTOQUE"
  | "AJUSTE_ESTOQUE"
  | "INVENTARIO_ESTOQUE";

export type AuditoriaEntidade =
  | "EMPRESA"
  | "USUARIO"
  | "MODULO"
  | "EMPRESA_MODULO"
  | "CATEGORIA_PRODUTO"
  | "PRODUTO"
  | "ESTOQUE"
  | "MOVIMENTACAO_ESTOQUE";

export type AuditoriaUsuario = {
  id: string;
  nome: string;
  email: string;
  tipo: string;
  ativo: boolean;
  empresaId: string | null;
};

export type AuditoriaEmpresa = {
  id: string;
  nome: string;
  cnpj: string;
  ativa: boolean;
};

export type AuditoriaLog = {
  id: string;
  acao: AuditoriaAcao;
  entidade: AuditoriaEntidade;
  entidadeId: string | null;
  dadosAntigos: unknown | null;
  dadosNovos: unknown | null;
  ip: string | null;
  usuarioId: string | null;
  empresaId: string | null;
  createdAt: string;
  usuario: AuditoriaUsuario | null;
  empresa: AuditoriaEmpresa | null;
};

export type AuditoriaFiltros = {
  search?: string;
  acao?: AuditoriaAcao;
  entidade?: AuditoriaEntidade;
  usuarioId?: string;
  entidadeId?: string;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "acao" | "entidade";
  order?: "asc" | "desc";
};

export type AuditoriaFiltrosGlobais = AuditoriaFiltros & {
  empresaId?: string;
};

export type AuditoriaPaginacao = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type AuditoriaResposta = {
  success: boolean;
  data: AuditoriaLog[];
  meta: AuditoriaPaginacao;
};

export async function listarAuditoriaEmpresa(
  filtros: AuditoriaFiltros,
): Promise<AuditoriaResposta> {
  const { data } = await api.get<AuditoriaResposta>("/auditoria", {
    params: filtros,
  });

  return data;
}

export async function listarAuditoriaGlobal(
  filtros: AuditoriaFiltrosGlobais,
): Promise<AuditoriaResposta> {
  const { data } = await api.get<AuditoriaResposta>("/auditoria/global", {
    params: filtros,
  });

  return data;
}
