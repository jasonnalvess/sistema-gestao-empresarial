import { api } from "./api";

export type ModuloSistema = {
  id: string;
  nome: string;
  chave: string;
  descricao?: string | null;
  ativo: boolean;
};

export async function listarModulos(): Promise<ModuloSistema[]> {
  const { data } = await api.get<{ success: boolean; data: ModuloSistema[] }>(
    "/modulos",
  );
  return data.data;
}

export async function ativarModulo(id: string): Promise<ModuloSistema> {
  const { data } = await api.patch<{ success: boolean; data: ModuloSistema }>(
    `/modulos/${id}/ativar`,
  );
  return data.data;
}

export async function desativarModulo(id: string): Promise<ModuloSistema> {
  const { data } = await api.patch<{ success: boolean; data: ModuloSistema }>(
    `/modulos/${id}/desativar`,
  );
  return data.data;
}
