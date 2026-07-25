import { api } from "./api";

export type UnidadeMedida = {
  id: string;
  nome: string;
  sigla: string;
  ativo: boolean;
  empresaId: string;
  createdAt: string;
  updatedAt: string;
};

export async function listarUnidadesMedida(params?: {
  page?: number;
  limit?: number;
}) {
  const { data } = await api.get<{
    success: boolean;
    data: UnidadeMedida[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>("/unidades-medida", { params });

  return data;
}

export type CriarUnidadeMedidaInput = {
  nome: string;
  sigla: string;
};

export async function criarUnidadeMedida(dados: CriarUnidadeMedidaInput) {
  const { data } = await api.post("/unidades-medida", dados);
  return data;
}

export type AtualizarUnidadeMedidaInput = Partial<CriarUnidadeMedidaInput>;

export async function atualizarUnidadeMedida(
  id: string,
  dados: AtualizarUnidadeMedidaInput
) {
  const { data } = await api.patch(`/unidades-medida/${id}`, dados);
  return data;
}

export async function ativarUnidadeMedida(id: string) {
  const { data } = await api.patch(`/unidades-medida/${id}/ativar`);
  return data;
}

export async function desativarUnidadeMedida(id: string) {
  const { data } = await api.patch(`/unidades-medida/${id}/desativar`);
  return data;
}
