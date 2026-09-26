import axios from "axios";
import { api } from "./api";

export type StatusContaPagar =
  "PENDENTE" | "PARCIALMENTE_PAGA" | "PAGA" | "VENCIDA" | "CANCELADA";

export type OrigemContaPagar = "MANUAL" | "PEDIDO_COMPRA" | "OUTRA";

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

export type CriarContaPagarPayload = {
  descricao: string;
  documento?: string;
  observacao?: string;
  origem?: OrigemContaPagar;
  dataEmissao?: string;
  dataCompetencia?: string;
  dataVencimento: string;
  parcelaAtual?: number;
  totalParcelas?: number;
  valorOriginal: number;
  valorDesconto?: number;
  valorJuros?: number;
  valorMulta?: number;
  fornecedorId?: string;
  pedidoCompraId?: string;
};
export type AtualizarContaPagarPayload = Partial<CriarContaPagarPayload>;
export type RegistrarPagamentoContaPagarPayload = {
  valor: number;
  desconto?: number;
  juros?: number;
  multa?: number;
  formaPagamento: FormaPagamento;
  dataPagamento?: string;
  caixaId?: string;
  documento?: string;
  observacao?: string;
};
export type GerarContaPedidoCompraPayload = {
  dataVencimento: string;
  dataCompetencia?: string;
  documento?: string;
  observacao?: string;
};

export function obterMensagemErroContasPagar(
  erro: unknown,
  mensagemPadrao: string,
): string {
  if (axios.isAxiosError<{ message?: string }>(erro)) {
    return erro.response?.data?.message ?? mensagemPadrao;
  }
  return mensagemPadrao;
}

export const contasPagarQueryKeys = {
  listas: (empresaId: string) => ["contas-pagar", empresaId] as const,
  detalhe: (empresaId: string, contaId: string) =>
    ["conta-pagar", empresaId, contaId] as const,
  historico: (empresaId: string, contaId: string) =>
    ["conta-pagar-historico", empresaId, contaId] as const,
  resumo: (empresaId: string) =>
    ["financeiro-resumo-contas-pagar", empresaId] as const,
};

export type ResumoContasPagar = {
  pagar: {
    valorOriginal: number;
    valorPago: number;
    valorAberto: number;
    valorVencido: number;
  };
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
  const { data } = await api.get<ContasPagarResponse>("/contas-pagar", {
    params,
  });

  return data;
}

export async function buscarResumoContasPagar(params?: {
  vencimentoInicio?: string;
  vencimentoFim?: string;
}) {
  const { data } = await api.get<{
    success: boolean;
    data: ResumoContasPagar;
  }>("/contas-pagar/resumo", { params });

  return data.data;
}

export async function buscarContaPagar(id: string) {
  const { data } = await api.get<{
    success: boolean;
    data: ContaPagarDetalhada;
  }>(`/contas-pagar/${id}`);

  return data.data;
}

export async function criarContaPagar(body: CriarContaPagarPayload) {
  const { data } = await api.post("/contas-pagar", body);

  return data;
}

export async function atualizarContaPagar(
  id: string,
  body: AtualizarContaPagarPayload,
) {
  const { data } = await api.patch(`/contas-pagar/${id}`, body);

  return data;
}

export async function registrarPagamentoContaPagar(
  id: string,
  body: RegistrarPagamentoContaPagarPayload,
) {
  const { data } = await api.post(`/contas-pagar/${id}/pagamentos`, body);

  return data;
}

export async function cancelarContaPagar(id: string) {
  const { data } = await api.patch(`/contas-pagar/${id}/cancelar`);

  return data;
}

export async function gerarContaPorPedido(
  pedidoCompraId: string,
  body: GerarContaPedidoCompraPayload,
) {
  const { data } = await api.post(
    `/contas-pagar/pedido-compra/${pedidoCompraId}`,
    body,
  );

  return data;
}
