import { api } from "./api";

export type TipoMovimentacaoEstoque =
  | "ENTRADA"
  | "SAIDA"
  | "AJUSTE"
  | "INVENTARIO"
  | "TRANSFERENCIA_ENTRADA"
  | "TRANSFERENCIA_SAIDA";

export type MovimentacaoEstoque = {
  id: string;
  tipo: TipoMovimentacaoEstoque;
  quantidade: string;
  saldoAnterior?: string | null;
  saldoPosterior?: string | null;
  custoUnitario?: string | null;
  documentoReferencia?: string | null;
  observacao?: string | null;
  empresaId: string;
  produtoId: string;
  depositoId?: string | null;
  usuarioId?: string | null;
  createdAt: string;

  produto?: {
    id: string;
    nome: string;
    codigo?: string | null;
  };

  deposito?: {
    id: string;
    nome: string;
    codigo: string;
  } | null;

  usuario?: {
    id: string;
    nome: string;
    email: string;
    tipo: string;
  } | null;
};

export type MovimentacoesResponse = {
  success: boolean;
  data: MovimentacaoEstoque[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export async function listarMovimentacoes(params?: {
  search?: string;
  produtoId?: string;
  depositoId?: string;
  tipo?: TipoMovimentacaoEstoque;
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: "asc" | "desc";
}) {
  const { data } = await api.get<MovimentacoesResponse>(
    "/movimentacoes-estoque",
    {
      params,
    }
  );

  return data;
}

export type CriarMovimentacaoInput = {
  produtoId: string;
  depositoId: string;
  tipo: "ENTRADA" | "SAIDA" | "AJUSTE" | "INVENTARIO";
  quantidade: number;
  custoUnitario?: number;
  documentoReferencia?: string;
  observacao?: string;
};

export async function criarMovimentacao(
  dados: CriarMovimentacaoInput
) {
  const { data } = await api.post(
    "/movimentacoes-estoque",
    dados
  );

  return data;
}

export type CriarTransferenciaEstoqueInput = {
  produtoId: string;
  depositoOrigemId: string;
  depositoDestinoId: string;
  quantidade: number;
  documentoReferencia?: string;
  observacao?: string;
};

export async function criarTransferenciaEstoque(
  dados: CriarTransferenciaEstoqueInput
) {
  const { data } = await api.post(
    "/movimentacoes-estoque/transferencias",
    dados
  );

  return data;
}
