import { api } from "./api";

export type Fornecedor = {
  id: string;
  razaoSocial: string;
  nomeFantasia?: string | null;
  documento: string;
  inscricaoEstadual?: string | null;
  inscricaoMunicipal?: string | null;
  email?: string | null;
  telefone?: string | null;
  celular?: string | null;
  contato?: string | null;
  cep?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  observacao?: string | null;
  ativo: boolean;
  empresaId: string;
  createdAt: string;
  updatedAt: string;
};

export type FornecedoresResponse = {
  success: boolean;
  data: Fornecedor[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type ListarFornecedoresParams = {
  search?: string;
  ativo?: boolean;
  cidade?: string;
  estado?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: "asc" | "desc";
};

export async function listarFornecedores(
  params?: ListarFornecedoresParams
) {
  const { data } = await api.get<FornecedoresResponse>(
    "/fornecedores",
    { params }
  );

  return data;
}

export type CriarFornecedorInput = {
  razaoSocial: string;
  nomeFantasia?: string;
  documento: string;
  inscricaoEstadual?: string;
  inscricaoMunicipal?: string;
  email?: string;
  telefone?: string;
  celular?: string;
  contato?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  observacao?: string;
};

export type AtualizarFornecedorInput =
  Partial<CriarFornecedorInput>;

export async function criarFornecedor(
  dados: CriarFornecedorInput
) {
  const { data } = await api.post("/fornecedores", dados);
  return data;
}

export async function atualizarFornecedor(
  id: string,
  dados: AtualizarFornecedorInput
) {
  const { data } = await api.patch(
    `/fornecedores/${id}`,
    dados
  );

  return data;
}

export async function buscarFornecedorPorId(id: string) {
  const { data } = await api.get<{
    success: boolean;
    data: Fornecedor;
  }>(`/fornecedores/${id}`);

  return data.data;
}

export async function ativarFornecedor(id: string) {
  const { data } = await api.patch(
    `/fornecedores/${id}/ativar`
  );

  return data;
}

export async function desativarFornecedor(id: string) {
  const { data } = await api.patch(
    `/fornecedores/${id}/desativar`
  );

  return data;
}

export type FornecedorHistorico = {
  id: string;
  descricao: string;
  fornecedorId: string;
  usuarioId?: string | null;
  createdAt: string;
  usuario?: {
    id: string;
    nome: string;
    email: string;
    tipo: string;
  } | null;
};

export async function listarFornecedorHistorico(
  fornecedorId: string
) {
  const { data } = await api.get<{
    success: boolean;
    data: FornecedorHistorico[];
  }>(`/fornecedores/${fornecedorId}/historico`);

  return data.data;
}

export async function adicionarFornecedorHistorico(
  fornecedorId: string,
  descricao: string
) {
  const { data } = await api.post(
    `/fornecedores/${fornecedorId}/historico`,
    { descricao }
  );

  return data;
}
