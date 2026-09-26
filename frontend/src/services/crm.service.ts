import { api } from "./api";
import type { RespostaApi } from "./perfis.service";

export type TipoEtapaCRM = "ABERTA" | "GANHA" | "PERDIDA";

export type TipoInteracaoCRM =
  "LIGACAO" | "EMAIL" | "MENSAGEM" | "REUNIAO" | "VISITA" | "NOTA" | "OUTRO";

export type RespostaPaginada<T> = {
  success: boolean;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type FiltrosPaginados = {
  page?: number;
  limit?: number;
};

export type CrmEtapa = {
  id: string;
  empresaId: string;
  nome: string;
  ordem: number;
  tipo: TipoEtapaCRM;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CrmResponsavel = {
  id: string;
  nome: string;
  email: string;
};

export type CrmClienteResumo = {
  id: string;
  nome: string;
};

export type CrmEtapaResumo = Pick<
  CrmEtapa,
  "id" | "nome" | "ordem" | "tipo" | "ativo"
>;

export type CrmResponsavelResumo = CrmResponsavel & {
  tipo: string;
};

export type CrmOportunidade = {
  id: string;
  empresaId: string;
  clienteId: string;
  etapaId: string;
  responsavelId: string;
  titulo: string;
  descricao: string | null;
  valorEstimado: string | null;
  previsaoFechamento: string | null;
  dataFechamento: string | null;
  motivoPerda: string | null;
  vendaId: string | null;
  versaoRegistro: number;
  createdAt: string;
  updatedAt: string;
  cliente: CrmClienteResumo;
  etapa: CrmEtapaResumo;
  responsavel: CrmResponsavelResumo;
};

export type ClienteInteracao = {
  id: string;
  empresaId: string;
  clienteId: string;
  oportunidadeId: string | null;
  agendaEventoId: string | null;
  responsavelId: string;
  tipo: TipoInteracaoCRM;
  assunto: string | null;
  descricao: string;
  dataHora: string;
  versaoRegistro: number;
  createdAt: string;
  updatedAt: string;
  responsavel: CrmResponsavelResumo;
  agendaEvento: { id: string; titulo: string } | null;
};

export type CriarClienteInteracaoPayload = {
  clienteId: string;
  oportunidadeId?: string;
  responsavelId: string;
  tipo: TipoInteracaoCRM;
  assunto?: string;
  descricao: string;
  dataHora: string;
};

export type AtualizarClienteInteracaoPayload = {
  responsavelId?: string;
  tipo?: TipoInteracaoCRM;
  assunto?: string | null;
  descricao?: string;
  dataHora?: string;
  versaoRegistro: number;
};

export type FiltrosCrmEtapas = FiltrosPaginados & {
  tipo?: TipoEtapaCRM;
  ativo?: boolean;
};

export type FiltrosCrmOportunidades = FiltrosPaginados & {
  clienteId?: string;
  etapaId?: string;
  responsavelId?: string;
  tipoEtapa?: TipoEtapaCRM;
  previsaoFechamentoInicial?: string;
  previsaoFechamentoFinal?: string;
};

export type FiltrosClienteInteracoes = FiltrosPaginados & {
  clienteId?: string;
  oportunidadeId?: string;
  agendaEventoId?: string;
  responsavelId?: string;
  tipo?: TipoInteracaoCRM;
  dataInicial?: string;
  dataFinal?: string;
};

export type CriarCrmEtapaPayload = {
  nome: string;
  ordem: number;
  tipo: TipoEtapaCRM;
  ativo?: boolean;
};

export type CriarCrmOportunidadePayload = {
  clienteId: string;
  etapaId: string;
  responsavelId: string;
  titulo: string;
  descricao?: string;
  valorEstimado?: number;
  previsaoFechamento?: string;
};

export type AtualizarCrmOportunidadePayload = {
  titulo?: string;
  descricao?: string | null;
  valorEstimado?: number;
  previsaoFechamento?: string;
  responsavelId?: string;
  versaoRegistro: number;
};

export type MovimentarCrmOportunidadePayload = {
  etapaId: string;
  versaoRegistro: number;
  motivoPerda?: string;
};

export type ReabrirCrmOportunidadePayload = {
  etapaId: string;
  versaoRegistro: number;
};

export type VincularVendaCrmOportunidadePayload = {
  vendaId: string;
  versaoRegistro: number;
};

export type DesvincularVendaCrmOportunidadePayload = {
  versaoRegistro: number;
};

export type AtualizarCrmEtapaPayload = {
  nome?: string;
  ordem?: number;
  ativo?: boolean;
};

export async function listarCrmEtapas(
  filtros: FiltrosCrmEtapas = {},
): Promise<RespostaPaginada<CrmEtapa>> {
  const { data } = await api.get<RespostaPaginada<CrmEtapa>>("/crm/etapas", {
    params: filtros,
  });

  return data;
}

export async function criarCrmEtapa(
  dados: CriarCrmEtapaPayload,
): Promise<CrmEtapa> {
  const { data } = await api.post<RespostaApi<CrmEtapa>>("/crm/etapas", dados);

  return data.data;
}

export async function atualizarCrmEtapa(
  id: string,
  dados: AtualizarCrmEtapaPayload,
): Promise<CrmEtapa> {
  const { data } = await api.patch<RespostaApi<CrmEtapa>>(
    `/crm/etapas/${id}`,
    dados,
  );

  return data.data;
}

export async function listarCrmOportunidades(
  filtros: FiltrosCrmOportunidades = {},
): Promise<RespostaPaginada<CrmOportunidade>> {
  const { data } = await api.get<RespostaPaginada<CrmOportunidade>>(
    "/crm/oportunidades",
    { params: filtros },
  );

  return data;
}

export async function criarCrmOportunidade(
  dados: CriarCrmOportunidadePayload,
): Promise<CrmOportunidade> {
  const { data } = await api.post<RespostaApi<CrmOportunidade>>(
    "/crm/oportunidades",
    dados,
  );

  return data.data;
}

export async function buscarCrmOportunidadePorId(
  id: string,
): Promise<CrmOportunidade> {
  const { data } = await api.get<RespostaApi<CrmOportunidade>>(
    "/crm/oportunidades/" + id,
  );

  return data.data;
}

export async function atualizarCrmOportunidade(
  id: string,
  dados: AtualizarCrmOportunidadePayload,
): Promise<CrmOportunidade> {
  const { data } = await api.patch<RespostaApi<CrmOportunidade>>(
    "/crm/oportunidades/" + id,
    dados,
  );

  return data.data;
}

export async function movimentarCrmOportunidade(
  id: string,
  dados: MovimentarCrmOportunidadePayload,
): Promise<CrmOportunidade> {
  const { data } = await api.patch<RespostaApi<CrmOportunidade>>(
    `/crm/oportunidades/${id}/movimentar`,
    dados,
  );

  return data.data;
}

export async function reabrirCrmOportunidade(
  id: string,
  dados: ReabrirCrmOportunidadePayload,
): Promise<CrmOportunidade> {
  const { data } = await api.patch<RespostaApi<CrmOportunidade>>(
    `/crm/oportunidades/${id}/reabrir`,
    dados,
  );

  return data.data;
}

export async function vincularVendaCrmOportunidade(
  id: string,
  dados: VincularVendaCrmOportunidadePayload,
): Promise<CrmOportunidade> {
  const { data } = await api.patch<RespostaApi<CrmOportunidade>>(
    "/crm/oportunidades/" + id + "/venda",
    dados,
  );

  return data.data;
}

export async function desvincularVendaCrmOportunidade(
  id: string,
  dados: DesvincularVendaCrmOportunidadePayload,
): Promise<CrmOportunidade> {
  const { data } = await api.patch<RespostaApi<CrmOportunidade>>(
    "/crm/oportunidades/" + id + "/venda/desvincular",
    dados,
  );

  return data.data;
}

export async function listarClienteInteracoes(
  filtros: FiltrosClienteInteracoes = {},
): Promise<RespostaPaginada<ClienteInteracao>> {
  const { data } = await api.get<RespostaPaginada<ClienteInteracao>>(
    "/crm/interacoes",
    { params: filtros },
  );

  return data;
}

export async function criarClienteInteracao(
  dados: CriarClienteInteracaoPayload,
): Promise<ClienteInteracao> {
  const { data } = await api.post<RespostaApi<ClienteInteracao>>(
    "/crm/interacoes",
    dados,
  );

  return data.data;
}

export async function atualizarClienteInteracao(
  id: string,
  dados: AtualizarClienteInteracaoPayload,
): Promise<ClienteInteracao> {
  const { data } = await api.patch<RespostaApi<ClienteInteracao>>(
    "/crm/interacoes/" + id,
    dados,
  );

  return data.data;
}

export async function listarCrmResponsaveis(): Promise<CrmResponsavel[]> {
  const { data } =
    await api.get<RespostaApi<CrmResponsavel[]>>("/crm/responsaveis");

  return data.data;
}
