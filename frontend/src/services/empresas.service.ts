import { api } from "./api";

export type Empresa = {
  id: string;
  nome: string;
  cnpj?: string | null;
  ativa: boolean;
  validadeComercialInicio?: string | null;
  validadeComercialFim?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export async function listarEmpresas(): Promise<Empresa[]> {
  const { data } = await api.get<{ success: boolean; data: Empresa[] }>(
    "/empresas",
  );
  return data.data;
}

export type CriarEmpresaInput = {
  nome: string;
  cnpj?: string;
};

export async function criarEmpresa(dados: CriarEmpresaInput): Promise<Empresa> {
  const { data } = await api.post<{ success: boolean; data: Empresa }>(
    "/empresas",
    dados,
  );
  return data.data;
}

export type AtualizarEmpresaInput = Partial<CriarEmpresaInput>;

export async function atualizarEmpresa(
  id: string,
  dados: AtualizarEmpresaInput,
): Promise<Empresa> {
  const { data } = await api.patch<{ success: boolean; data: Empresa }>(
    `/empresas/${id}`,
    dados,
  );
  return data.data;
}

export async function ativarEmpresa(id: string): Promise<Empresa> {
  const { data } = await api.patch<{ success: boolean; data: Empresa }>(
    `/empresas/${id}/ativar`,
  );
  return data.data;
}

export async function desativarEmpresa(id: string): Promise<Empresa> {
  const { data } = await api.patch<{ success: boolean; data: Empresa }>(
    `/empresas/${id}/desativar`,
  );
  return data.data;
}

export type RegularizarEmpresaInput = {
  diasValidade: number;
  motivo: string;
};

export async function regularizarEmpresa(
  id: string,
  dados: RegularizarEmpresaInput,
): Promise<Empresa> {
  const { data } = await api.post<{ success: boolean; data: Empresa }>(
    `/empresas/${id}/regularizar`,
    dados,
  );
  return data.data;
}
