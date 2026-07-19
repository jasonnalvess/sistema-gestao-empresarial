import { api } from "./api";

export type StatusCaixa =
  | "ABERTO"
  | "FECHADO"
  | "INATIVO";

export type TipoMovimentacaoCaixa =
  | "ENTRADA"
  | "SAIDA";

export type OrigemMovimentacaoCaixa =
  | "MANUAL"
  | "CONTA_PAGAR"
  | "CONTA_RECEBER"
  | "VENDA"
  | "AJUSTE"
  | "OUTRA";

export type Caixa = {
  id: string;
  nome: string;
  codigo: string;
  descricao?: string | null;
  ativo: boolean;
  status: StatusCaixa;
  saldoAtual: string;
  empresaId: string;
  createdAt: string;
  updatedAt: string;

  usuarioCriacao?: {
    id: string;
    nome: string;
    email: string;
    tipo: string;
  } | null;

  aberturas?: AberturaCaixa[];
  movimentacoes?: MovimentacaoCaixa[];
};

export type AberturaCaixa = {
  id: string;
  dataAbertura: string;
  dataFechamento?: string | null;

  saldoInicial: string;
  saldoSistema?: string | null;
  saldoInformado?: string | null;
  diferenca?: string | null;

  observacaoAbertura?: string | null;
  observacaoFechamento?: string | null;

  aberto: boolean;

  usuarioAbertura?: {
    id: string;
    nome: string;
    email: string;
    tipo: string;
  } | null;

  usuarioFechamento?: {
    id: string;
    nome: string;
    email: string;
    tipo: string;
  } | null;

  _count?: {
    movimentacoes: number;
  };
};

export type MovimentacaoCaixa = {
  id: string;

  tipo: TipoMovimentacaoCaixa;
  origem: OrigemMovimentacaoCaixa;

  descricao: string;
  documento?: string | null;
  observacao?: string | null;

  valor: string;
  saldoAnterior: string;
  saldoPosterior: string;

  dataMovimentacao: string;

  caixaId: string;
  aberturaCaixaId: string;

  caixa?: {
    id: string;
    nome: string;
    codigo: string;
    status: StatusCaixa;
    saldoAtual: string;
  };

  usuario?: {
    id: string;
    nome: string;
    email: string;
    tipo: string;
  } | null;

  pagamentoContaPagar?: {
    id: string;

    contaPagar?: {
      id: string;
      numero: number;
      descricao: string;
    };
  } | null;

  recebimentoContaReceber?: {
    id: string;

    contaReceber?: {
      id: string;
      numero: number;
      descricao: string;
    };
  } | null;
};

export type CaixasResponse = {
  success: boolean;
  data: Caixa[];

  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type MovimentacoesCaixaResponse = {
  success: boolean;
  data: MovimentacaoCaixa[];

  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type ResumoCaixas = {
  filtros: {
    search: string | null;
    caixaId: string | null;
    tipo: TipoMovimentacaoCaixa | null;
    origem: OrigemMovimentacaoCaixa | null;
    dataInicio: string | null;
    dataFim: string | null;
  };

  caixas: {
    total: number;
    abertos: number;
    fechados: number;
    inativos: number;
    saldoTotal: number;
  };

  movimentacoes: {
    entradas: number;
    saidas: number;
    resultado: number;
    quantidadeEntradas: number;
    quantidadeSaidas: number;
    quantidadeTotal: number;
  };
};

export async function listarCaixas(params?: {
  search?: string;
  status?: StatusCaixa;
  ativo?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: "asc" | "desc";
}) {
  const { data } = await api.get<CaixasResponse>(
    "/caixas",
    {
      params,
    }
  );

  return data;
}

export async function listarCaixasAbertos() {
  return listarCaixas({
    status: "ABERTO",
    ativo: true,
    page: 1,
    limit: 100,
  });
}

export async function buscarCaixa(id: string) {
  const { data } = await api.get<{
    success: boolean;
    data: Caixa;
  }>(`/caixas/${id}`);

  return data.data;
}

export async function criarCaixa(body: {
  nome: string;
  codigo: string;
  descricao?: string;
}) {
  const { data } = await api.post(
    "/caixas",
    body
  );

  return data;
}

export async function atualizarCaixa(
  id: string,
  body: {
    nome?: string;
    codigo?: string;
    descricao?: string;
    ativo?: boolean;
  }
) {
  const { data } = await api.patch(
    `/caixas/${id}`,
    body
  );

  return data;
}

export async function abrirCaixa(
  id: string,
  body: {
    saldoInicial: number;
    observacao?: string;
  }
) {
  const { data } = await api.post(
    `/caixas/${id}/abrir`,
    body
  );

  return data;
}

export async function fecharCaixa(
  id: string,
  body: {
    saldoInformado: number;
    observacao?: string;
  }
) {
  const { data } = await api.post(
    `/caixas/${id}/fechar`,
    body
  );

  return data;
}

export async function criarMovimentacaoCaixa(
  caixaId: string,
  body: {
    tipo: TipoMovimentacaoCaixa;
    origem?: OrigemMovimentacaoCaixa;
    descricao: string;
    valor: number;
    documento?: string;
    observacao?: string;
    dataMovimentacao?: string;
  }
) {
  const { data } = await api.post(
    `/caixas/${caixaId}/movimentacoes`,
    body
  );

  return data;
}

export async function listarMovimentacoesCaixa(
  params?: {
    search?: string;
    caixaId?: string;
    aberturaCaixaId?: string;
    tipo?: TipoMovimentacaoCaixa;
    origem?: OrigemMovimentacaoCaixa;
    dataInicio?: string;
    dataFim?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    order?: "asc" | "desc";
  }
) {
  const { data } =
    await api.get<MovimentacoesCaixaResponse>(
      "/caixas/movimentacoes/listar",
      {
        params,
      }
    );

  return data;
}

export async function buscarResumoCaixas(params?: {
  search?: string;
  caixaId?: string;
  tipo?: TipoMovimentacaoCaixa;
  origem?: OrigemMovimentacaoCaixa;
  dataInicio?: string;
  dataFim?: string;
}) {
  const { data } = await api.get<{
    success: boolean;
    data: ResumoCaixas;
  }>("/caixas/resumo/geral", {
    params,
  });

  return data.data;
}