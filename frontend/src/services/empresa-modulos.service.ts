import { api } from "./api";
import type { RespostaApi } from "./perfis.service";
import type { ModuloSistema } from "./modulos.service";

export type ModuloAtivoEmpresa = {
  chave: string;
};

export type ModulosAtivosDaEmpresaResponse = {
  modulos: ModuloAtivoEmpresa[];
};

export type EmpresaModulo = {
  id: string;
  empresaId: string;
  moduloId: string;
  ativo: boolean;
  modulo: ModuloSistema;
};

export async function listarModulosAtivosDaEmpresa(): Promise<ModulosAtivosDaEmpresaResponse> {
  const { data } = await api.get<RespostaApi<ModulosAtivosDaEmpresaResponse>>(
    "/empresa-modulos/me",
  );

  return data.data;
}

export async function listarModulosDaEmpresa(
  empresaId: string,
): Promise<EmpresaModulo[]> {
  const { data } = await api.get<RespostaApi<EmpresaModulo[]>>(
    `/empresa-modulos/empresa/${empresaId}`,
  );

  return data.data;
}

export type VincularEmpresaModuloInput = {
  empresaId: string;
  moduloId: string;
};

export async function vincularEmpresaModulo(
  dados: VincularEmpresaModuloInput,
): Promise<EmpresaModulo> {
  const { data } = await api.post<RespostaApi<EmpresaModulo>>(
    "/empresa-modulos",
    dados,
  );

  return data.data;
}

export async function ativarVinculoEmpresaModulo(
  id: string,
): Promise<EmpresaModulo> {
  const { data } = await api.patch<RespostaApi<EmpresaModulo>>(
    `/empresa-modulos/${id}/ativar`,
  );

  return data.data;
}

export async function desativarVinculoEmpresaModulo(
  id: string,
): Promise<EmpresaModulo> {
  const { data } = await api.patch<RespostaApi<EmpresaModulo>>(
    `/empresa-modulos/${id}/desativar`,
  );

  return data.data;
}
