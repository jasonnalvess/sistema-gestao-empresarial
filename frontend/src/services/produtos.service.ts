import { api } from "./api";

export type Produto = {
  id: string;
  nome: string;
  descricao?: string;
  codigo?: string;
  precoVenda: string;
  ativo: boolean;
  empresaId: string;
  categoriaId?: string;
  createdAt: string;
  updatedAt: string;
  categoria?: {
    id: string;
    nome: string;
  };
};

export type ProdutosResponse = {
  success: boolean;
  data: Produto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export async function listarProdutos(params?: {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: "asc" | "desc";
}) {
  const resposta = await api.get<ProdutosResponse>("/produtos", {
    params,
  });

  return resposta.data;
}

export type CriarProdutoInput = {
  nome: string;
  descricao?: string;
  codigo?: string;
  precoVenda: number;
  categoriaId?: string;
};

export async function criarProduto(dados: CriarProdutoInput) {
  const resposta = await api.post("/produtos", dados);
  return resposta.data;
}

export type AtualizarProdutoInput = {
  nome?: string;
  descricao?: string;
  codigo?: string;
  precoVenda?: number;
  categoriaId?: string;
};

export async function atualizarProduto(id: string, dados: AtualizarProdutoInput) {
  const resposta = await api.patch(`/produtos/${id}`, dados);
  return resposta.data;
}

export async function ativarProduto(id: string) {
  const resposta = await api.patch(`/produtos/${id}/ativar`);
  return resposta.data;
}

export async function desativarProduto(id: string) {
  const resposta = await api.patch(`/produtos/${id}/desativar`);
  return resposta.data;
}
