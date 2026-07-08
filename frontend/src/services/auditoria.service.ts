import { api } from "./api";

export type AuditoriaLog = {
  id: string;
  acao: string;
  entidade: string;
  entidadeId: string;
  dadosAntigos?: any;
  dadosNovos?: any;
  ip?: string;
  createdAt: string;
  usuario?: {
    id: string;
    nome: string;
    email: string;
    tipo: string;
  };
  empresa?: {
    id: string;
    nome: string;
    cnpj: string;
  };
};

export async function listarAuditoria(params?: {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: "asc" | "desc";
  acao?: string;
  entidade?: string;
}) {
  const { data } = await api.get<{
    success: boolean;
    data: AuditoriaLog[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>("/auditoria", {
    params,
  });

  return data;
}
