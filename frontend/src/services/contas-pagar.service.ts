import { api } from "./api";

export type StatusContaPagar =
  | "PENDENTE"
  | "PARCIALMENTE_PAGA"
  | "PAGA"
  | "VENCIDA"
  | "CANCELADA";

export type OrigemContaPagar =
  | "MANUAL"
  | "PEDIDO_COMPRA"
  | "OUTRA";

export type FormaPagamento =
  | "DINHEIRO"
  | "PIX"
  | "BOLETO"
  | "TRANSFERENCIA"
  | "CARTAO_CREDITO"
  | "CARTAO_DEBITO"
  | "CHEQUE"
  | "OUTRA";

export type ContaPagar = {
  id: string;
  numero: number;
  descricao: string;
  documento?: string | null;
  observacao?: string | null;
  origem: OrigemContaPagar;
  status: StatusContaPagar;

  dataEmissao: string;
  dataCompetencia?: string | null;
  dataVencimento: string;
  dataPagamento?: string | null;
  dataCancelamento?: string | null;

  parcelaAtual: number;
  totalParcelas: number;

  valorOriginal: string;
  valorDesconto: string;
  valorJuros: string;
  valorMulta: string;
  valorPago: string;
  valorAberto: string;

  fornecedorId?: string | null;
  pedidoCompraId?: string | null;

  fornecedor?: {
    id: string;
    razaoSocial: string;
    nomeFantasia?: string | null;
    documento: string;
  } | null;

  pedidoCompra?: {
    id: string;
    numero: number;
    status: string;
  } | null;

  usuarioCriacao?: {
    id: string;
    nome: string;
    email: string;
    tipo: string;
  } | null;

  _count?: {
    pagamentos: number;
  };
};

export type PagamentoContaPagar = {
  id: string;
  valor: string;
  desconto: string;
  juros: string;
  multa: string;
  formaPagamento: FormaPagamento;
  dataPagamento: string;
  documento?: string | null;
  observacao?: string | null;
  createdAt: string;

  usuario?: {
    id: string;
    nome: string;
    email: string;
    tipo: string;
  } | null;

  movimentacaoCaixa?: {
    id: string;
    caixa: {
      id: string;
      nome: string;
      codigo: string;
    };
  } | null;
};

export type ContaPagarHistorico = {
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

export type ContaPagarDetalhada = ContaPagar & {
  usuarioCancelamento?: {
    id: string;
    nome: string;
    email: string;
    tipo: string;
  } | null;

  pagamentos: PagamentoContaPagar[];
  historicos: ContaPagarHistorico[];
};

export type ContasPagarResponse = {
  success: boolean;
  data: ContaPagar[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export async function listarContasPagar(params?: {
  search?: string;
  status?: StatusContaPagar;
  origem?: OrigemContaPagar;
  fornecedorId?: string;
  pedidoCompraId?: string;
  vencimentoInicio?: string;
  vencimentoFim?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: "asc" | "desc";
}) {
  const { data } = await api.get<ContasPagarResponse>(
    "/contas-pagar",
    {
      params,
    }
  );

  return data;
}

export async function buscarContaPagar(id: string) {
  const { data } = await api.get<{
    success: boolean;
    data: ContaPagarDetalhada;
  }>(`/contas-pagar/${id}`);

  return data.data;
}

export async function criarContaPagar(body: any) {
  const { data } = await api.post(
    "/contas-pagar",
    body
  );

  return data;
}

export async function atualizarContaPagar(
  id: string,
  body: any
) {
  const { data } = await api.patch(
    `/contas-pagar/${id}`,
    body
  );

  return data;
}

export async function registrarPagamentoContaPagar(
  id: string,
  body: any
) {
  const { data } = await api.post(
    `/contas-pagar/${id}/pagamentos`,
    body
  );

  return data;
}

export async function cancelarContaPagar(id: string) {
  const { data } = await api.patch(
    `/contas-pagar/${id}/cancelar`
  );

  return data;
}

export async function gerarContaPorPedido(
  pedidoCompraId: string,
  body: any
) {
  const { data } = await api.post(
    `/contas-pagar/pedido-compra/${pedidoCompraId}`,
    body
  );

  return data;
}