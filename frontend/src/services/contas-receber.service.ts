import axios from "axios";
import { api } from "./api";

export type StatusContaReceber =
  | "PENDENTE"
  | "PARCIALMENTE_RECEBIDA"
  | "RECEBIDA"
  | "VENCIDA"
  | "CANCELADA";

export type OrigemContaReceber =
  | "MANUAL"
  | "ORDEM_SERVICO"
  | "VENDA"
  | "OUTRA";

export type FormaRecebimento =
  | "DINHEIRO"
  | "PIX"
  | "BOLETO"
  | "TRANSFERENCIA"
  | "CARTAO_CREDITO"
  | "CARTAO_DEBITO"
  | "CHEQUE"
  | "OUTRA";

export type ContaReceber = {
  id: string;
  numero: number;

  descricao: string;
  documento?: string | null;
  observacao?: string | null;

  origem: OrigemContaReceber;
  status: StatusContaReceber;

  dataEmissao: string;
  dataCompetencia?: string | null;
  dataVencimento: string;
  dataRecebimento?: string | null;
  dataCancelamento?: string | null;

  parcelaAtual: number;
  totalParcelas: number;

  valorOriginal: string;
  valorDesconto: string;
  valorJuros: string;
  valorMulta: string;
  valorRecebido: string;
  valorAberto: string;

  empresaId: string;
  clienteId?: string | null;
  ordemServicoId?: string | null;

  cliente?: {
    id: string;
    nome: string;
    tipo: string;
    documento?: string | null;
    email?: string | null;
    celular?: string | null;
  } | null;

  ordemServico?: {
    id: string;
    numero: number;
    titulo: string;
    status: string;
  } | null;

  usuarioCriacao?: {
    id: string;
    nome: string;
    email: string;
    tipo: string;
  } | null;

  _count?: {
    recebimentos: number;
  };
};

export type RecebimentoContaReceber = {
  id: string;

  valor: string;
  desconto: string;
  juros: string;
  multa: string;

  formaRecebimento: FormaRecebimento;
  dataRecebimento: string;

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

export type ContaReceberHistorico = {
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

export type ContaReceberDetalhada =
  ContaReceber & {
    usuarioCancelamento?: {
      id: string;
      nome: string;
      email: string;
      tipo: string;
    } | null;

    recebimentos: RecebimentoContaReceber[];
    historicos: ContaReceberHistorico[];
  };

export type ContasReceberResponse = {
  success: boolean;
  data: ContaReceber[];

  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type ResumoContasReceber = {
  receber: {
    valorOriginal: number;
    valorRecebido: number;
    valorAberto: number;
    valorVencido: number;
  };
};

export type CriarContaReceberPayload = {
  descricao: string;
  documento?: string;
  observacao?: string;
  origem?: OrigemContaReceber;
  dataEmissao?: string;
  dataCompetencia?: string;
  dataVencimento: string;
  parcelaAtual?: number;
  totalParcelas?: number;
  valorOriginal: number;
  valorDesconto?: number;
  valorJuros?: number;
  valorMulta?: number;
  clienteId?: string;
  ordemServicoId?: string;
};
export type AtualizarContaReceberPayload = Partial<CriarContaReceberPayload>;
export type RegistrarRecebimentoContaReceberPayload = {
  valor: number;
  desconto?: number;
  juros?: number;
  multa?: number;
  formaRecebimento: FormaRecebimento;
  dataRecebimento?: string;
  caixaId?: string;
  documento?: string;
  observacao?: string;
};
export type GerarContaOrdemServicoPayload = {
  valorOriginal: number;
  dataVencimento: string;
  dataCompetencia?: string;
  documento?: string;
  observacao?: string;
};

export function obterMensagemErroContasReceber(
  erro: unknown,
  mensagemPadrao: string,
): string {
  if (axios.isAxiosError<{ message?: string }>(erro)) {
    return erro.response?.data?.message ?? mensagemPadrao;
  }
  return mensagemPadrao;
}

export const contasReceberQueryKeys = {
  listas: (empresaId: string) => ["contas-receber", empresaId] as const,
  detalhe: (empresaId: string, contaId: string) =>
    ["conta-receber", empresaId, contaId] as const,
  historico: (empresaId: string, contaId: string) =>
    ["conta-receber-historico", empresaId, contaId] as const,
  resumo: (empresaId: string) =>
    ["financeiro-resumo-contas-receber", empresaId] as const,
};

export async function listarContasReceber(
  params?: {
    search?: string;
    status?: StatusContaReceber;
    origem?: OrigemContaReceber;
    clienteId?: string;
    ordemServicoId?: string;
    vencimentoInicio?: string;
    vencimentoFim?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    order?: "asc" | "desc";
  }
) {
  const { data } =
    await api.get<ContasReceberResponse>(
      "/contas-receber",
      {
        params,
      }
    );

  return data;
}

export async function buscarResumoContasReceber(params?: {
  vencimentoInicio?: string;
  vencimentoFim?: string;
}) {
  const { data } = await api.get<{
    success: boolean;
    data: ResumoContasReceber;
  }>("/contas-receber/resumo", { params });

  return data.data;
}

export async function buscarContaReceber(
  id: string
) {
  const { data } = await api.get<{
    success: boolean;
    data: ContaReceberDetalhada;
  }>(`/contas-receber/${id}`);

  return data.data;
}

export async function criarContaReceber(
  body: CriarContaReceberPayload,
) {
  const { data } = await api.post(
    "/contas-receber",
    body
  );

  return data;
}

export async function atualizarContaReceber(
  id: string,
  body: AtualizarContaReceberPayload,
) {
  const { data } = await api.patch(
    `/contas-receber/${id}`,
    body
  );

  return data;
}

export async function registrarRecebimentoContaReceber(
  id: string,
  body: RegistrarRecebimentoContaReceberPayload,
) {
  const { data } = await api.post(
    `/contas-receber/${id}/recebimentos`,
    body
  );

  return data;
}

export async function cancelarContaReceber(
  id: string
) {
  const { data } = await api.patch(
    `/contas-receber/${id}/cancelar`
  );

  return data;
}

export async function gerarContaPorOrdemServico(
  ordemServicoId: string,
  body: GerarContaOrdemServicoPayload,
) {
  const { data } = await api.post(
    `/contas-receber/ordem-servico/${ordemServicoId}`,
    body
  );

  return data;
}

export async function adicionarHistoricoContaReceber(
  contaReceberId: string,
  descricao: string
) {
  const { data } = await api.post(
    `/contas-receber/${contaReceberId}/historico`,
    {
      descricao,
    }
  );

  return data;
}