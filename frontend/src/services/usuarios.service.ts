import { api } from "./api";

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  tipo: string;
  ativo: boolean;
  empresaId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function listarUsuarios(params?: {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: "asc" | "desc";
}) {
  const { data } = await api.get<{
    success: boolean;
    data: Usuario[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>("/usuarios", {
    params,
  });

  return data;
}
export type CriarUsuarioInput = {
  nome: string;
  email: string;
  senha: string;
  tipo: "SUPER_ADMIN" | "ADMIN_EMPRESA" | "USUARIO_EMPRESA";
  empresaId?: string;
};

export async function criarUsuario(dados: CriarUsuarioInput) {
  const { data } = await api.post("/usuarios", dados);
  return data;
}
export type AtualizarUsuarioInput = {
  nome?: string;
  email?: string;
  tipo?: "SUPER_ADMIN" | "ADMIN_EMPRESA" | "USUARIO_EMPRESA";
};

export async function atualizarUsuario(
  id: string,
  dados: AtualizarUsuarioInput
) {
  const { data } = await api.patch(`/usuarios/${id}`, dados);
  return data;
}

export async function ativarUsuario(id: string) {
  const { data } = await api.patch(`/usuarios/${id}/ativar`);
  return data;
}

export async function desativarUsuario(id: string) {
  const { data } = await api.patch(`/usuarios/${id}/desativar`);
  return data;
}
