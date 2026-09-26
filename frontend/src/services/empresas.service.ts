import { api } from "./api";

export type Empresa = {
  id: string;
  nome: string;
  cnpj?: string | null;
  ativa: boolean;
};

export async function listarEmpresas(): Promise<Empresa[]> {
  const { data } = await api.get<{ success: boolean; data: Empresa[] }>(
    "/empresas",
  );
  return data.data;
}
