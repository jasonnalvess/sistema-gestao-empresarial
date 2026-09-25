import { api } from "./api";
import type { RespostaApi } from "./perfis.service";

export type ModuloAtivoEmpresa = {
  chave: string;
};

export type ModulosAtivosDaEmpresaResponse = {
  modulos: ModuloAtivoEmpresa[];
};

export async function listarModulosAtivosDaEmpresa(): Promise<ModulosAtivosDaEmpresaResponse> {
  const { data } = await api.get<RespostaApi<ModulosAtivosDaEmpresaResponse>>(
    "/empresa-modulos/me",
  );

  return data.data;
}
