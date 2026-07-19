import { api } from "./api";

export type StatusVenda =
  | "RASCUNHO"
  | "PENDENTE"
  | "APROVADA"
  | "FATURADA"
  | "CONCLUIDA"
  | "CANCELADA";

export type CondicaoPagamentoVenda =
  | "AVISTA"
  | "APRAZO";

export type FormaPagamentoVenda =
  | "DINHEIRO"
  | "PIX"
  | "CARTAO_CREDITO"
  | "CARTAO_DEBITO"
  | "BOLETO"
  | "TRANSFERENCIA";

export interface Venda {
  id: string;
  numero: number;
  status: StatusVenda;

  dataVenda: string;

  valorProdutos: string;
  valorDesconto: string;
  valorFrete: string;
  valorOutros: string;
  valorTotal: string;

  condicaoPagamento: CondicaoPagamentoVenda;
  formaPagamento?: FormaPagamentoVenda;

  cliente?: {
    id: string;
    nome: string;
    documento?: string;
  };

  deposito?: {
    id: string;
    nome: string;
    codigo?: string;
  };

  _count?: {
    itens: number;
    contasReceber: number;
  };
}

export interface VendaDetalhada extends Venda {
  observacao?: string;
  observacaoInterna?: string;

  dataAprovacao?: string;
  dataFaturamento?: string;
  dataCancelamento?: string;
  dataConclusao?: string;

  itens: any[];

  historicos: any[];

  contasReceber: any[];
}

export interface DashboardProdutoMaisVendido {
  produtoId: string;
  nome: string;
  codigo: string | null;
  quantidadeVendida: number;
  valorVendido: number;
}

export interface DashboardVendaRecente {
  id: string;
  numero: number;
  status: StatusVenda;
  dataVenda: string;
  valorTotal: string;
  cliente: {
    id: string;
    nome: string;
  } | null;
  deposito: {
    id: string;
    nome: string;
  } | null;
}

export interface DashboardVendasResponse {
  periodo: {
    dataInicio: string | null;
    dataFim: string | null;
  };

  indicadores: {
    totalVendas: number;
    valorTotalVendido: number;
    ticketMedio: number;
    valorProdutos: number;
    valorDescontos: number;
    valorFretes: number;
    valorOutros: number;
  };

  vendasPorStatus: {
    rascunho: number;
    pendente: number;
    aprovada: number;
    faturada: number;
    concluida: number;
    cancelada: number;
  };

  financeiro: {
    quantidadeContas: number;
    valorContasReceber: number;
    valorRecebido: number;
    valorEmAberto: number;
    percentualRecebido: number;
  };

  produtosMaisVendidos: DashboardProdutoMaisVendido[];
  vendasRecentes: DashboardVendaRecente[];
}

export interface ListarVendasResponse {
  success: boolean;

  data: Venda[];

  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export async function listarVendas(params?: {
  search?: string;

  status?: StatusVenda;

  clienteId?: string;

  depositoId?: string;

  dataInicio?: string;

  dataFim?: string;

  page?: number;

  limit?: number;

  sortBy?: string;

  order?: "asc" | "desc";
}) {
  const { data } =
    await api.get<ListarVendasResponse>(
      "/vendas",
      {
        params,
      },
    );

  return data;
}

export async function buscarVenda(
  id: string,
) {
  const { data } =
    await api.get<{
      success: boolean;

      data: VendaDetalhada;
    }>(`/vendas/${id}`);

  return data.data;
}

export async function criarVenda(
  body: any,
) {
  const { data } =
    await api.post(
      "/vendas",
      body,
    );

  return data;
}

export async function atualizarVenda(
  id: string,
  body: any,
) {
  const { data } =
    await api.patch(
      `/vendas/${id}`,
      body,
    );

  return data;
}

export async function enviarParaAprovacao(
  id: string,
) {
  const { data } =
    await api.patch(
      `/vendas/${id}/enviar-aprovacao`,
    );

  return data;
}

export async function aprovarVenda(
  id: string,
) {
  const { data } =
    await api.patch(
      `/vendas/${id}/aprovar`,
    );

  return data;
}

export async function faturarVenda(
  id: string,
  body: any,
) {
  const { data } =
    await api.patch(
      `/vendas/${id}/faturar`,
      body,
    );

  return data;
}

export async function cancelarVenda(
  id: string,
  body: any,
) {
  const { data } =
    await api.patch(
      `/vendas/${id}/cancelar`,
      body,
    );

  return data;
}

export async function listarHistoricoVenda(
  id: string,
) {
  const { data } =
    await api.get(
      `/vendas/${id}/historico`,
    );

  return data;
}

export async function adicionarHistoricoVenda(
  id: string,
  body: {
    descricao: string;
  },
) {
  const { data } =
    await api.post(
      `/vendas/${id}/historico`,
      body,
    );

  return data;
}

export async function dashboardVendas(params?: {
  clienteId?: string;
  depositoId?: string;
  dataInicio?: string;
  dataFim?: string;
}): Promise<DashboardVendasResponse> {
  const response = await api.get<
    | DashboardVendasResponse
    | {
        data: DashboardVendasResponse;
      }
  >("/vendas/dashboard", {
    params,
  });

  const resultado = response.data;

  if (
    resultado &&
    typeof resultado === "object" &&
    "indicadores" in resultado
  ) {
    return resultado as DashboardVendasResponse;
  }

  if (
    resultado &&
    typeof resultado === "object" &&
    "data" in resultado &&
    resultado.data
  ) {
    return resultado.data;
  }

  throw new Error(
    "Formato inválido na resposta do dashboard de vendas.",
  );
}