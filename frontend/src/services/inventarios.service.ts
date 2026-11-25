import { api } from "./api";

export type StatusInventarioEstoque = "ABERTO" | "EM_CONTAGEM" | "FINALIZADO" | "CANCELADO";
export type StatusItemInventario = "PENDENTE" | "CONTADO";

export type InventarioUsuario = { id: string; nome: string; email: string; tipo: string };
export type InventarioDeposito = {
  id: string; nome: string; codigo: string; descricao?: string | null;
  ativo: boolean; empresaId: string; createdAt: string; updatedAt: string;
};
export type InventarioProduto = {
  id: string; nome: string; codigo?: string | null;
  unidadeMedida?: { id: string; nome: string; sigla: string } | null;
};
export type InventarioItem = {
  id: string; quantidadeSistema: string; quantidadeContada?: string | null;
  diferenca?: string | null; observacao?: string | null; status: StatusItemInventario;
  inventarioId: string; produtoId: string; produto: InventarioProduto;
  createdAt: string; updatedAt: string;
};
export type InventarioEstoque = {
  id: string; numero: number; descricao?: string | null; observacao?: string | null;
  status: StatusInventarioEstoque; dataAbertura: string; dataConclusao?: string | null;
  empresaId: string; depositoId: string; deposito: InventarioDeposito;
  usuarioAberturaId?: string | null; usuarioAbertura?: InventarioUsuario | null;
  usuarioConclusaoId?: string | null; usuarioConclusao?: InventarioUsuario | null;
  itens?: InventarioItem[]; _count?: { itens: number }; createdAt: string; updatedAt: string;
};
export type InventariosResponse = {
  success: boolean; data: InventarioEstoque[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};
export type FiltrosInventarios = {
  search?: string; status?: StatusInventarioEstoque; depositoId?: string;
  page?: number; limit?: number;
  sortBy?: "numero" | "status" | "dataAbertura" | "dataConclusao" | "createdAt" | "updatedAt";
  order?: "asc" | "desc";
};
export type CriarInventarioInput = { depositoId: string; descricao?: string; observacao?: string };
export type AtualizarInventarioInput = { descricao?: string; observacao?: string };
export type ContarItemInventarioInput = { quantidadeContada: number; observacao?: string };
type RespostaUnica<T> = { success: boolean; data: T };

export async function listarInventarios(params?: FiltrosInventarios) {
  const { data } = await api.get<InventariosResponse>("/inventarios-estoque", { params });
  return data;
}
export async function buscarInventario(id: string) {
  const { data } = await api.get<RespostaUnica<InventarioEstoque>>(`/inventarios-estoque/${id}`);
  return data.data;
}
export async function criarInventario(dados: CriarInventarioInput) {
  const { data } = await api.post<RespostaUnica<InventarioEstoque>>("/inventarios-estoque", dados);
  return data.data;
}
export async function atualizarInventario(id: string, dados: AtualizarInventarioInput) {
  const { data } = await api.patch<RespostaUnica<InventarioEstoque>>(`/inventarios-estoque/${id}`, dados);
  return data.data;
}
export async function contarItemInventario(inventarioId: string, itemId: string, dados: ContarItemInventarioInput) {
  const { data } = await api.patch<RespostaUnica<InventarioItem>>(
    `/inventarios-estoque/${inventarioId}/itens/${itemId}/contagem`, dados,
  );
  return data.data;
}
export async function cancelarInventario(id: string) {
  const { data } = await api.patch<RespostaUnica<InventarioEstoque>>(`/inventarios-estoque/${id}/cancelar`);
  return data.data;
}
export async function finalizarInventario(id: string) {
  const { data } = await api.patch<RespostaUnica<InventarioEstoque>>(`/inventarios-estoque/${id}/finalizar`);
  return data.data;
}
