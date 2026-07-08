import { api } from "./api";

export type AgendaEvento = {
  id: string;
  titulo: string;
  descricao?: string;
  dataInicio: string;
  dataFim: string;
  status: string;
  local?: string;
  clienteNome?: string;
  clienteContato?: string;
  ativo: boolean;
  clienteId?: string | null;
  cliente?: {
    id: string;
    nome: string;
    email?: string | null;
    celular?: string | null;
    telefone?: string | null;
  } | null;
};

export type CriarAgendaEventoInput = {
  titulo: string;
  descricao?: string;
  dataInicio: string;
  dataFim: string;
  local?: string;
  clienteNome?: string;
  clienteContato?: string;
  clienteId?: string;
};

export async function listarAgenda() {
  const { data } = await api.get<{
    success: boolean;
    data: AgendaEvento[];
  }>("/agenda");

  return data.data;
}

export async function criarAgendaEvento(dados: CriarAgendaEventoInput) {
  const { data } = await api.post("/agenda", dados);
  return data;
}

export type AtualizarAgendaEventoInput = {
  status?: "AGENDADO" | "EM_ANDAMENTO" | "CONCLUIDO" | "CANCELADO";
  titulo?: string;
  descricao?: string;
  dataInicio?: string;
  dataFim?: string;
  local?: string;
  clienteNome?: string;
  clienteContato?: string;
  clienteId?: string;
};

export async function atualizarAgendaEvento(
  id: string,
  dados: AtualizarAgendaEventoInput
) {
  const { data } = await api.patch(`/agenda/${id}`, dados);
  return data;
}

export type AgendaHistorico = {
  id: string;
  descricao: string;
  agendaEventoId: string;
  usuarioId?: string | null;
  createdAt: string;
  usuario?: {
    id: string;
    nome: string;
    email: string;
    tipo: string;
  };
};

export async function listarAgendaHistorico(eventoId: string) {
  const { data } = await api.get<{
    success: boolean;
    data: AgendaHistorico[];
  }>(`/agenda/${eventoId}/historico`);

  return data.data;
}

export async function adicionarAgendaHistorico(
  eventoId: string,
  descricao: string
) {
  const { data } = await api.post(`/agenda/${eventoId}/historico`, {
    descricao,
  });

  return data;
}
