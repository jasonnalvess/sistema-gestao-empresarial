import { api } from "./api";

export type MovimentacaoEstoque = {
  id: string;
  tipo: "ENTRADA" | "SAIDA";
  quantidade: string;
  observacao?: string;
  createdAt: string;
  produto?: {
    id: string;
    nome: string;
    codigo?: string;
  };
};

export async function listarMovimentacoes(params?: {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: "asc" | "desc";
}) {
  const { data } = await api.get<{
    success: boolean;
    data: MovimentacaoEstoque[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>("/movimentacoes-estoque", {
    params,
  });

  return data;
}
export type CriarMovimentacaoInput = {
  produtoId: string;
  tipo: "ENTRADA" | "SAIDA";
  quantidade: number;
  observacao?: string;
};

export async function criarMovimentacao(dados: CriarMovimentacaoInput) {
  const resposta = await api.post("/movimentacoes-estoque", dados);
  return resposta.data;
}
