import { api } from "./api";

export type OrdemServico = {
  id: string;
  numero: number;
  titulo: string;
  descricao?: string | null;
  status: string;
  prioridade: string;
  dataAbertura: string;
  dataPrevista?: string | null;
  dataConclusao?: string | null;
  observacao?: string | null;
  ativo: boolean;
  clienteId: string;
  responsavelId?: string | null;
  agendaEventoId?: string | null;
  createdAt: string;
  updatedAt: string;
  cliente?: {
    id: string;
    nome: string;
    email?: string | null;
    celular?: string | null;
    telefone?: string | null;
  };
  responsavel?: {
    id: string;
    nome: string;
    email: string;
    tipo: string;
  } | null;
};

export type FiltrosOrdensServico = {
  search?: string;
  status?: "ABERTA" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA";
  prioridade?: "BAIXA" | "NORMAL" | "ALTA" | "URGENTE";
  clienteId?: string;
  page?: number;
  limit?: number;
};

export async function listarOrdensServico(params?: FiltrosOrdensServico) {
  const { data } = await api.get<{
    success: boolean;
    data: OrdemServico[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>("/ordens-servico", { params });

  return data;
}

export type CriarOrdemServicoInput = {
  titulo: string;
  descricao?: string;
  clienteId: string;
  agendaEventoId?: string;
  responsavelId?: string;
  prioridade?: "BAIXA" | "NORMAL" | "ALTA" | "URGENTE";
  dataPrevista?: string;
  observacao?: string;
};

export async function criarOrdemServico(dados: CriarOrdemServicoInput) {
  const { data } = await api.post("/ordens-servico", dados);
  return data;
}

export type OrdemServicoDetalhada = OrdemServico & {
  agendaEvento?: {
    id: string;
    titulo: string;
    dataInicio: string;
    dataFim: string;
    status: string;
  } | null;
};

export async function buscarOrdemServicoPorId(id: string) {
  const { data } = await api.get<{
    success: boolean;
    data: OrdemServicoDetalhada;
  }>(`/ordens-servico/${id}`);

  return data.data;
}

export type OrdemServicoHistorico = {
  id: string;
  descricao: string;
  statusAnterior?: string | null;
  statusNovo?: string | null;
  ordemServicoId: string;
  usuarioId?: string | null;
  createdAt: string;
  usuario?: {
    id: string;
    nome: string;
    email: string;
    tipo: string;
  };
};

export async function listarOrdemServicoHistorico(ordemServicoId: string) {
  const { data } = await api.get<{
    success: boolean;
    data: OrdemServicoHistorico[];
  }>(`/ordens-servico/${ordemServicoId}/historico`);

  return data.data;
}

export async function adicionarOrdemServicoHistorico(
  ordemServicoId: string,
  descricao: string,
) {
  const { data } = await api.post(
    `/ordens-servico/${ordemServicoId}/historico`,
    { descricao },
  );

  return data;
}

export type AlterarStatusOrdemServicoInput = {
  status: "ABERTA" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA";
  descricao?: string;
};

export async function alterarStatusOrdemServico(
  id: string,
  dados: AlterarStatusOrdemServicoInput,
) {
  const { data } = await api.patch(`/ordens-servico/${id}/status`, dados);
  return data;
}
