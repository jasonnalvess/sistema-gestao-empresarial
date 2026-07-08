import { api } from "./api";

export type DashboardResumo = {
  empresas: number;
  usuarios: number;
  produtos: number;
  categorias: number;
  movimentacoesEstoque: number;
  auditoriaLogs: number;
};

export async function obterResumoDashboard() {
  const { data } = await api.get<{
    success: boolean;
    data: DashboardResumo;
  }>("/dashboard/resumo");

  return data.data;
}
