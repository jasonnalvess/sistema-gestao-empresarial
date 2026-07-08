import { api } from "./api";

export type EstoqueProduto = {
  id: string;
  quantidadeAtual: string;
  estoqueMinimo: string;
  estoqueMaximo?: string;
  produto?: {
    id: string;
    nome: string;
    codigo?: string;
  };
};

export async function listarEstoque(params?: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  order?: "asc" | "desc";
}) {
  const { data } = await api.get<{
    success: boolean;
    data: EstoqueProduto[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>("/estoque", {
    params,
  });

  return data;
}
