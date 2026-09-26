import axios from "axios";
import { api } from "./api";

export type PedidoCompraStatus =
  | "RASCUNHO"
  | "PENDENTE_APROVACAO"
  | "APROVADO"
  | "PARCIALMENTE_RECEBIDO"
  | "RECEBIDO"
  | "CANCELADO";

export type PedidoCompraItemStatus =
  "PENDENTE" | "PARCIALMENTE_RECEBIDO" | "RECEBIDO" | "CANCELADO";

export type PedidoCompraItem = {
  id: string;
  quantidadeSolicitada: string;
  quantidadeRecebida: string;
  valorUnitario: string;
  valorDesconto: string;
  valorTotal: string;
  status: PedidoCompraItemStatus;
  produtoId: string;
  produto: {
    id: string;
    nome: string;
    codigo?: string | null;
    unidadeMedida?: {
      nome: string;
      sigla: string;
    } | null;
  };
};

export type PedidoCompraHistorico = {
  id: string;
  descricao: string;
  createdAt: string;
  usuario?: {
    id: string;
    nome: string;
    email: string;
    tipo: string;
  } | null;
};

export type PedidoCompraDetalhado = PedidoCompra & {
  dataAprovacao?: string | null;
  dataRecebimento?: string | null;
  observacao?: string | null;
  observacaoInterna?: string | null;

  valorProdutos: string;
  valorDesconto: string;
  valorFrete: string;
  valorOutros: string;

  usuarioCriacao?: {
    id: string;
    nome: string;
    email: string;
    tipo: string;
  } | null;

  usuarioAprovacao?: {
    id: string;
    nome: string;
    email: string;
    tipo: string;
  } | null;

  usuarioRecebimento?: {
    id: string;
    nome: string;
    email: string;
    tipo: string;
  } | null;

  itens: PedidoCompraItem[];
  historicos: PedidoCompraHistorico[];
};

export type PedidoCompra = {
  id: string;
  numero: number;
  status: PedidoCompraStatus;
  dataPedido: string;
  dataPrevistaEntrega?: string | null;
  valorTotal: string;

  fornecedor?: {
    id: string;
    razaoSocial: string;
    nomeFantasia?: string | null;
  };

  deposito?: {
    id: string;
    nome: string;
    codigo?: string;
  };
};

export type ListarPedidosResponse = {
  success: boolean;
  data: PedidoCompra[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type ItemPedidoCompraPayload = {
  produtoId: string;
  quantidadeSolicitada: number;
  valorUnitario: number;
  valorDesconto?: number;
};

export type CriarPedidoCompraPayload = {
  fornecedorId: string;
  depositoId: string;
  dataPrevistaEntrega?: string;
  observacao?: string;
  observacaoInterna?: string;
  valorDesconto?: number;
  valorFrete?: number;
  valorOutros?: number;
  itens: ItemPedidoCompraPayload[];
};

export type AtualizarPedidoCompraPayload = Partial<CriarPedidoCompraPayload>;

export type ReceberPedidoCompraPayload = {
  documentoReferencia?: string;
  observacao?: string;
  itens: Array<{
    itemId: string;
    quantidadeRecebida: number;
    custoUnitario?: number;
  }>;
};

export function obterMensagemErroPedidoCompra(
  erro: unknown,
  mensagemPadrao: string,
) {
  if (axios.isAxiosError<{ message?: string }>(erro)) {
    return erro.response?.data?.message ?? mensagemPadrao;
  }
  return mensagemPadrao;
}

export const pedidosCompraQueryKeys = {
  listas: (empresaId: string) => ["pedidos-compra", empresaId] as const,
  detalhe: (empresaId: string, pedidoId: string) =>
    ["pedido-compra", empresaId, pedidoId] as const,
  historico: (empresaId: string, pedidoId: string) =>
    ["pedido-compra-historico", empresaId, pedidoId] as const,
};

export async function listarPedidosCompra(params?: {
  search?: string;
  status?: PedidoCompraStatus;
  fornecedorId?: string;
  depositoId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: "asc" | "desc";
}) {
  const { data } = await api.get<ListarPedidosResponse>("/pedidos-compra", {
    params,
  });

  return data;
}

export async function buscarPedidoCompra(id: string) {
  const { data } = await api.get<{
    success: boolean;
    data: PedidoCompraDetalhado;
  }>(`/pedidos-compra/${id}`);

  return data.data;
}

export async function criarPedidoCompra(body: CriarPedidoCompraPayload) {
  const { data } = await api.post("/pedidos-compra", body);

  return data;
}

export async function atualizarPedidoCompra(
  id: string,
  body: AtualizarPedidoCompraPayload,
) {
  const { data } = await api.patch(`/pedidos-compra/${id}`, body);

  return data;
}

export async function enviarParaAprovacao(id: string) {
  const { data } = await api.patch(`/pedidos-compra/${id}/enviar-aprovacao`);

  return data;
}

export async function aprovarPedido(id: string) {
  const { data } = await api.patch(`/pedidos-compra/${id}/aprovar`);

  return data;
}

export async function cancelarPedido(id: string) {
  const { data } = await api.patch(`/pedidos-compra/${id}/cancelar`);

  return data;
}

export async function receberPedido(
  id: string,
  body: ReceberPedidoCompraPayload,
) {
  const { data } = await api.patch(`/pedidos-compra/${id}/receber`, body);

  return data;
}

export async function listarHistoricoPedidoCompra(id: string) {
  const { data } = await api.get<{
    success: boolean;
    data: PedidoCompraHistorico[];
  }>(`/pedidos-compra/${id}/historico`);

  return data.data;
}

export async function adicionarHistoricoPedidoCompra(
  id: string,
  descricao: string,
) {
  const { data } = await api.post(`/pedidos-compra/${id}/historico`, {
    descricao,
  });

  return data;
}
