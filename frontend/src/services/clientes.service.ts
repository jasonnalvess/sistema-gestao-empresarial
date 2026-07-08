import { api } from "./api";

export type Cliente = {
  id: string;
  nome: string;
  tipo: "PF" | "PJ";
  documento?: string | null;
  email?: string | null;
  telefone?: string | null;
  celular?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  observacao?: string | null;
  ativo: boolean;
  empresaId: string;
  createdAt: string;
  updatedAt: string;
};

export async function listarClientes(params?: {
  search?: string;
  tipo?: "PF" | "PJ";
  ativo?: "true" | "false";
  page?: number;
  limit?: number;
}) {
  const { data } = await api.get<{
    success: boolean;
    data: Cliente[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>("/clientes", { params });

  return data;
}

export type CriarClienteInput = {
  nome: string;
  tipo?: "PF" | "PJ";
  documento?: string;
  email?: string;
  telefone?: string;
  celular?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  observacao?: string;
};

export async function criarCliente(dados: CriarClienteInput) {
  const { data } = await api.post("/clientes", dados);
  return data;
}

export type AtualizarClienteInput = Partial<CriarClienteInput>;

export async function atualizarCliente(
  id: string,
  dados: AtualizarClienteInput
) {
  const { data } = await api.patch(`/clientes/${id}`, dados);
  return data;
}

export async function ativarCliente(id: string) {
  const { data } = await api.patch(`/clientes/${id}/ativar`);
  return data;
}

export async function desativarCliente(id: string) {
  const { data } = await api.patch(`/clientes/${id}/desativar`);
  return data;
}

export type ClienteDetalhado = Cliente & {
  agendaEventos?: {
    id: string;
    titulo: string;
    descricao?: string | null;
    dataInicio: string;
    dataFim: string;
    status: string;
    local?: string | null;
    createdAt: string;
  }[];
  ordensServico?: {
    id: string;
    numero: number;
    titulo: string;
    descricao?: string | null;
    status: string;
    prioridade: string;
    dataAbertura: string;
    dataPrevista?: string | null;
    dataConclusao?: string | null;
    createdAt: string;
  }[];
};

export async function buscarClientePorId(id: string) {
  const { data } = await api.get<{
    success: boolean;
    data: ClienteDetalhado;
  }>(`/clientes/${id}`);

  return data.data;
}

export type ClienteHistorico = {
  id: string;
  descricao: string;
  clienteId: string;
  usuarioId?: string | null;
  createdAt: string;
  usuario?: {
    id: string;
    nome: string;
    email: string;
    tipo: string;
  };
};

export async function listarClienteHistorico(clienteId: string) {
  const { data } = await api.get<{
    success: boolean;
    data: ClienteHistorico[];
  }>(`/clientes/${clienteId}/historico`);

  return data.data;
}

export async function adicionarClienteHistorico(
  clienteId: string,
  descricao: string
) {
  const { data } = await api.post(`/clientes/${clienteId}/historico`, {
    descricao,
  });

  return data;
}
