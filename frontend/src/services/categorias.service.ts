import { api } from "./api";

export type CategoriaProduto = {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
};

export async function listarCategorias(params?: {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: "asc" | "desc";
}) {
  const { data } = await api.get<{
    success: boolean;
    data: CategoriaProduto[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>("/categorias-produtos", {
    params,
  });

  return data;
}

export type CriarCategoriaInput = {
  nome: string;
  descricao?: string;
};

export type AtualizarCategoriaInput = {
  nome?: string;
  descricao?: string;
};

export async function criarCategoria(dados: CriarCategoriaInput) {
  const resposta = await api.post("/categorias-produtos", dados);
  return resposta.data;
}

export async function atualizarCategoria(
  id: string,
  dados: AtualizarCategoriaInput
) {
  const resposta = await api.patch(`/categorias-produtos/${id}`, dados);
  return resposta.data;
}

export async function ativarCategoria(id: string) {
  const resposta = await api.patch(`/categorias-produtos/${id}/ativar`);
  return resposta.data;
}

export async function desativarCategoria(id: string) {
  const resposta = await api.patch(`/categorias-produtos/${id}/desativar`);
  return resposta.data;
}
