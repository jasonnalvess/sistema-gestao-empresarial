import { api } from "./api";

export type PedidoCompraStatus =
  | "RASCUNHO"
  | "PENDENTE_APROVACAO"
  | "APROVADO"
  | "PARCIALMENTE_RECEBIDO"
  | "RECEBIDO"
  | "CANCELADO";

export type PedidoCompraItemStatus =
  | "PENDENTE"
  | "PARCIALMENTE_RECEBIDO"
  | "RECEBIDO"
  | "CANCELADO";

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
  const { data } =
    await api.get<ListarPedidosResponse>(
      "/pedidos-compra",
      {
        params,
      }
    );

  return data;
}

export async function buscarPedidoCompra(id: string) {
  const { data } = await api.get<{
    success: boolean;
    data: PedidoCompraDetalhado;
  }>(`/pedidos-compra/${id}`);

  return data.data;
}

export async function criarPedidoCompra(
  body: any,
) {
  const { data } =
    await api.post("/pedidos-compra", body);

  return data;
}

export async function atualizarPedidoCompra(
  id: string,
  body: any,
) {
  const { data } =
    await api.patch(
      `/pedidos-compra/${id}`,
      body,
    );

  return data;
}

export async function enviarParaAprovacao(
  id: string,
) {
  const { data } =
    await api.patch(
      `/pedidos-compra/${id}/enviar-aprovacao`,
    );

  return data;
}

export async function aprovarPedido(
  id: string,
) {
  const { data } =
    await api.patch(
      `/pedidos-compra/${id}/aprovar`,
    );

  return data;
}

export async function cancelarPedido(
  id: string,
) {
  const { data } =
    await api.patch(
      `/pedidos-compra/${id}/cancelar`,
    );

  return data;
}

export async function receberPedido(
  id: string,
  body: any,
) {
  const { data } =
    await api.patch(
      `/pedidos-compra/${id}/receber`,
      body,
    );

  return data;
}
