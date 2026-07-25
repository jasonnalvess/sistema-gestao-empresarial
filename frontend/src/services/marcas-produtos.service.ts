import { api } from "./api";

export type MarcaProduto = {
  id: string;
  nome: string;
  descricao?: string | null;
  ativo: boolean;
  empresaId: string;
  createdAt: string;
  updatedAt: string;
};

export async function listarMarcasProdutos(params?: {
  page?: number;
  limit?: number;
}) {
  const { data } = await api.get<{
    success: boolean;
    data: MarcaProduto[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>("/marcas-produtos", { params });

  return data;
}

export type CriarMarcaProdutoInput = {
  nome: string;
  descricao?: string;
};

export async function criarMarcaProduto(dados: CriarMarcaProdutoInput) {
  const { data } = await api.post("/marcas-produtos", dados);
  return data;
}

export type AtualizarMarcaProdutoInput = Partial<CriarMarcaProdutoInput>;

export async function atualizarMarcaProduto(
  id: string,
  dados: AtualizarMarcaProdutoInput
) {
  const { data } = await api.patch(`/marcas-produtos/${id}`, dados);
  return data;
}

export async function ativarMarcaProduto(id: string) {
  const { data } = await api.patch(`/marcas-produtos/${id}/ativar`);
  return data;
}

export async function desativarMarcaProduto(id: string) {
  const { data } = await api.patch(`/marcas-produtos/${id}/desativar`);
  return data;
}
