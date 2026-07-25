import { api } from "./api";

export type Deposito = {
  id: string;
  nome: string;
  codigo: string;
  descricao?: string | null;
  endereco?: string | null;
  ativo: boolean;
  empresaId: string;
  createdAt: string;
  updatedAt: string;
};

export type DepositosResponse = {
  success: boolean;
  data: Deposito[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export async function listarDepositos(params?: {
  search?: string;
  ativo?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: "asc" | "desc";
}) {
  const { data } = await api.get<DepositosResponse>("/depositos", {
    params,
  });

  return data;
}

export type CriarDepositoInput = {
  nome: string;
  codigo: string;
  descricao?: string;
  endereco?: string;
};

export async function criarDeposito(dados: CriarDepositoInput) {
  const { data } = await api.post("/depositos", dados);
  return data;
}

export type AtualizarDepositoInput = Partial<CriarDepositoInput>;

export async function atualizarDeposito(
  id: string,
  dados: AtualizarDepositoInput
) {
  const { data } = await api.patch(`/depositos/${id}`, dados);
  return data;
}

export async function ativarDeposito(id: string) {
  const { data } = await api.patch(`/depositos/${id}/ativar`);
  return data;
}

export async function desativarDeposito(id: string) {
  const { data } = await api.patch(`/depositos/${id}/desativar`);
  return data;
}
