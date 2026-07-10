import { api } from "./api";

export type Produto = {
  id: string;
  nome: string;
  descricao?: string | null;
  codigo?: string | null;
  codigoBarras?: string | null;
  ncm?: string | null;
  precoCusto: string;
  precoVenda: string;
  peso?: string | null;
  altura?: string | null;
  largura?: string | null;
  comprimento?: string | null;
  estoqueMinimo: string;
  estoqueMaximo?: string | null;
  ativo: boolean;
  empresaId: string;
  categoriaId?: string | null;
  marcaId?: string | null;
  unidadeMedidaId?: string | null;
  createdAt: string;
  updatedAt: string;

  categoria?: {
    id: string;
    nome: string;
  } | null;

  marca?: {
    id: string;
    nome: string;
  } | null;

  unidadeMedida?: {
    id: string;
    nome: string;
    sigla: string;
  } | null;

  estoque?: {
    id: string;
    quantidadeAtual: string;
    estoqueMinimo: string;
    estoqueMaximo?: string | null;
  } | null;
};

export type ProdutosResponse = {
  success: boolean;
  data: Produto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export async function listarProdutos(params?: {
  search?: string;
  ativo?: boolean;
  categoriaId?: string;
  marcaId?: string;
  unidadeMedidaId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: "asc" | "desc";
}) {
  const resposta = await api.get<ProdutosResponse>("/produtos", {
    params,
  });

  return resposta.data;
}

export type CriarProdutoInput = {
  nome: string;
  descricao?: string;
  codigo?: string;
  codigoBarras?: string;
  ncm?: string;
  precoCusto?: number;
  precoVenda: number;
  peso?: number;
  altura?: number;
  largura?: number;
  comprimento?: number;
  estoqueMinimo?: number;
  estoqueMaximo?: number;
  categoriaId?: string;
  marcaId?: string;
  unidadeMedidaId?: string;
};

export async function criarProduto(dados: CriarProdutoInput) {
  const resposta = await api.post("/produtos", dados);
  return resposta.data;
}

export type AtualizarProdutoInput = Partial<CriarProdutoInput>;

export async function atualizarProduto(id: string, dados: AtualizarProdutoInput) {
  const resposta = await api.patch(`/produtos/${id}`, dados);
  return resposta.data;
}

export async function ativarProduto(id: string) {
  const resposta = await api.patch(`/produtos/${id}/ativar`);
  return resposta.data;
}

export async function desativarProduto(id: string) {
  const resposta = await api.patch(`/produtos/${id}/desativar`);
  return resposta.data;
}

export type ProdutoDetalhado = Produto;

export async function buscarProdutoPorId(id: string) {
  const { data } = await api.get<{
    success: boolean;
    data: ProdutoDetalhado;
  }>(`/produtos/${id}`);

  return data.data;
}

// ===== NOVAS FUNÇÕES DE HISTÓRICO =====

export type ProdutoHistorico = {
  id: string;
  descricao: string;
  produtoId: string;
  usuarioId?: string | null;
  createdAt: string;
  usuario?: {
    id: string;
    nome: string;
    email: string;
    tipo: string;
  };
};

export async function listarProdutoHistorico(produtoId: string) {
  const { data } = await api.get<{
    success: boolean;
    data: ProdutoHistorico[];
  }>(`/produtos/${produtoId}/historico`);

  return data.data;
}

export async function adicionarProdutoHistorico(
  produtoId: string,
  descricao: string
) {
  const { data } = await api.post(
    `/produtos/${produtoId}/historico`,
    { descricao }
  );

  return data;
}
