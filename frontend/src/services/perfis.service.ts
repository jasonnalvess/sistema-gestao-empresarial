import { api } from "./api";

export type Perfil = {
  id: string;
  nome: string;
  chave: string;
  descricao?: string | null;
  sistema: boolean;
  escopo: "SISTEMA" | "EMPRESA";
  ativo: boolean;
  empresaId?: string | null;
};

export type Permissao = {
  id: string;
  nome: string;
  chave: string;
  descricao?: string | null;
  modulo: string;
  ativo: boolean;
};

export type PermissaoDoPerfil = Permissao & {
  permitido: boolean;
};

export type PerfilDetalhado = Perfil & {
  permissoes: PermissaoDoPerfil[];
};

export type FiltrosPerfis = {
  search?: string;
  ativo?: boolean;
  sistema?: boolean;
  page?: number;
  limit?: number;
};

export type FiltrosPermissoes = {
  search?: string;
  ativo?: boolean;
  modulo?: string;
  page?: number;
  limit?: number;
};

export type RespostaPaginada<T> = {
  success: boolean;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type RespostaApi<T> = {
  success: boolean;
  data: T;
};

export type CriarPerfilPayload = {
  nome: string;
  chave: string;
  descricao?: string;
};

export type EditarPerfilPayload = {
  nome?: string;
  descricao?: string | null;
};

export type ConfigurarPermissoesPayload = {
  permissoes: Array<{
    permissaoId: string;
    permitido: boolean;
  }>;
};

export async function listarPerfis(params?: FiltrosPerfis) {
  const { data } = await api.get<RespostaPaginada<Perfil>>("/perfis", {
    params,
  });

  return data;
}

export async function buscarPerfil(id: string) {
  const { data } = await api.get<RespostaApi<PerfilDetalhado>>(`/perfis/${id}`);

  return data.data;
}

export async function listarPerfisGlobais(params?: FiltrosPerfis) {
  const { data } = await api.get<RespostaPaginada<Perfil>>("/perfis/globais", {
    params,
  });

  return data;
}

export async function buscarPerfilGlobal(id: string) {
  const { data } = await api.get<RespostaApi<PerfilDetalhado>>(
    `/perfis/globais/${id}`,
  );

  return data.data;
}

export async function criarPerfil(body: CriarPerfilPayload) {
  const { data } = await api.post<RespostaApi<Perfil>>("/perfis", body);

  return data;
}

export async function editarPerfil(id: string, body: EditarPerfilPayload) {
  const { data } = await api.patch<RespostaApi<Perfil>>(`/perfis/${id}`, body);

  return data;
}

export async function ativarPerfil(id: string) {
  const { data } = await api.patch<RespostaApi<Perfil>>(`/perfis/${id}/ativar`);

  return data;
}

export async function inativarPerfil(id: string) {
  const { data } = await api.patch<RespostaApi<Perfil>>(
    `/perfis/${id}/inativar`,
  );

  return data;
}

export async function configurarPermissoesPerfil(
  id: string,
  body: ConfigurarPermissoesPayload,
) {
  const { data } = await api.put<RespostaApi<PerfilDetalhado>>(
    `/perfis/${id}/permissoes`,
    body,
  );

  return data;
}

export async function listarPermissoesDelegaveis() {
  const { data } = await api.get<RespostaPaginada<Permissao>>(
    "/permissoes/delegaveis",
  );

  return data;
}

export async function listarPermissoes(params?: FiltrosPermissoes) {
  const { data } = await api.get<RespostaPaginada<Permissao>>("/permissoes", {
    params,
  });

  return data;
}
