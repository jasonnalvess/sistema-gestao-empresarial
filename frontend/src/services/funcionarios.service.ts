import { api } from "./api";
import type { RespostaApi, RespostaPaginada } from "./perfis.service";
export type StatusFuncionario =
  | "ATIVO"
  | "FERIAS"
  | "AFASTADO"
  | "LICENCA"
  | "INATIVO"
  | "DESLIGADO";
export type TipoVinculo =
  | "CLT"
  | "ESTAGIARIO"
  | "APRENDIZ"
  | "TEMPORARIO"
  | "TERCEIRIZADO"
  | "PRESTADOR_SERVICO"
  | "SOCIO"
  | "OUTRO";
export type EstadoAcesso = "SEM_USUARIO" | "USUARIO_ATIVO" | "USUARIO_INATIVO";
export type EstruturaTipo = "cargos" | "departamentos";
export type Estrutura = {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
};
export type DadosProfissionais = {
  nome: string;
  nomePreferido?: string | null;
  matricula: string;
  dataAdmissao: string;
  tipoVinculo: TipoVinculo;
  emailCorporativo?: string | null;
  telefoneCorporativo?: string | null;
  cargoId?: string | null;
  departamentoId?: string | null;
  gestorId?: string | null;
};
// Contrato público operacional: a identidade de acesso não é exposta.
export type Funcionario = DadosProfissionais & {
  id: string;
  status: StatusFuncionario;
  estadoAcesso: EstadoAcesso;
  versaoRegistro: number;
  cargo: Pick<Estrutura, "id" | "nome" | "ativo"> | null;
  departamento: Pick<Estrutura, "id" | "nome" | "ativo"> | null;
  gestor: {
    id: string;
    nome: string;
    nomePreferido: string | null;
    matricula: string;
    status: StatusFuncionario;
  } | null;
  createdAt: string;
  updatedAt: string;
};
export type DadosPessoais = {
  cpf: string | null;
  emailPessoal: string | null;
  telefonePessoal: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
};
export type HistoricoFuncionario = {
  id: string;
  funcionarioId: string;
  tipo: string;
  statusAnterior: StatusFuncionario | null;
  statusNovo: StatusFuncionario | null;
  acessoAnterior: EstadoAcesso | null;
  acessoNovo: EstadoAcesso | null;
  origem: string;
  createdAt: string;
  operacaoId: string | null;
  atorUsuario: { id: string; nome: string; email: string; tipo: string } | null;
};
export type FiltrosFuncionarios = {
  search?: string;
  status?: StatusFuncionario;
  tipoVinculo?: TipoVinculo;
  cargoId?: string;
  departamentoId?: string;
  gestorId?: string;
  acesso?: EstadoAcesso;
  page?: number;
  limit?: number;
};
export type FiltrosEstrutura = {
  search?: string;
  ativo?: boolean;
  page?: number;
  limit?: number;
};
export type SituacaoPayload = {
  versaoRegistro: number;
  status: StatusFuncionario;
  acaoAcesso?: "PRESERVAR" | "SUSPENDER";
  dataDesligamento?: string;
};
export async function listarFuncionarios(
  params: FiltrosFuncionarios,
  signal?: AbortSignal,
) {
  return (
    await api.get<RespostaPaginada<Funcionario>>("/funcionarios", {
      params,
      signal,
    })
  ).data;
}
export async function buscarFuncionario(id: string, signal?: AbortSignal) {
  return (
    await api.get<RespostaApi<Funcionario>>(`/funcionarios/${id}`, { signal })
  ).data.data;
}
export async function criarFuncionario(body: DadosProfissionais) {
  return (await api.post<RespostaApi<Funcionario>>("/funcionarios", body)).data
    .data;
}
export async function editarFuncionario(
  id: string,
  body: Partial<DadosProfissionais> & { versaoRegistro: number },
) {
  return (
    await api.patch<RespostaApi<Funcionario>>(`/funcionarios/${id}`, body)
  ).data.data;
}
export async function buscarDadosPessoais(id: string, signal?: AbortSignal) {
  return (
    await api.get<RespostaApi<DadosPessoais & { funcionarioId: string }>>(
      `/funcionarios/${id}/dados-pessoais`,
      { signal },
    )
  ).data.data;
}
export async function editarDadosPessoais(
  id: string,
  body: Partial<DadosPessoais> & { versaoRegistro: number },
) {
  return (
    await api.patch<
      RespostaApi<
        DadosPessoais & { funcionarioId: string; versaoRegistro: number }
      >
    >(`/funcionarios/${id}/dados-pessoais`, body)
  ).data.data;
}
export async function alterarSituacao(id: string, body: SituacaoPayload) {
  return (
    await api.patch<RespostaApi<Funcionario>>(
      `/funcionarios/${id}/situacao`,
      body,
    )
  ).data.data;
}
export async function listarHistorico(
  id: string,
  page: number,
  signal?: AbortSignal,
) {
  return (
    await api.get<RespostaPaginada<HistoricoFuncionario>>(
      `/funcionarios/${id}/historico`,
      { params: { page, limit: 10 }, signal },
    )
  ).data;
}
export async function criarAcesso(
  id: string,
  body: {
    versaoRegistro: number;
    email: string;
    senhaInicial: string;
    perfilId: string;
  },
) {
  return (
    await api.post<RespostaApi<Funcionario>>(`/funcionarios/${id}/acesso`, body)
  ).data.data;
}
export async function vincularAcesso(
  id: string,
  body: { versaoRegistro: number; usuarioId: string },
) {
  return (
    await api.post<RespostaApi<Funcionario>>(
      `/funcionarios/${id}/acesso/vincular`,
      body,
    )
  ).data.data;
}
export async function desvincularAcesso(id: string, versaoRegistro: number) {
  return (
    await api.post<RespostaApi<Funcionario>>(
      `/funcionarios/${id}/acesso/desvincular`,
      { versaoRegistro },
    )
  ).data.data;
}
export async function listarEstrutura(
  tipo: EstruturaTipo,
  params: FiltrosEstrutura,
  signal?: AbortSignal,
) {
  return (
    await api.get<RespostaPaginada<Estrutura>>(`/${tipo}`, { params, signal })
  ).data;
}
export async function buscarEstrutura(
  tipo: EstruturaTipo,
  id: string,
  signal?: AbortSignal,
) {
  return (await api.get<RespostaApi<Estrutura>>(`/${tipo}/${id}`, { signal }))
    .data.data;
}
export async function salvarEstrutura(
  tipo: EstruturaTipo,
  body: { nome: string; descricao: string | null },
  id?: string,
) {
  return id
    ? (await api.patch<RespostaApi<Estrutura>>(`/${tipo}/${id}`, body)).data
        .data
    : (await api.post<RespostaApi<Estrutura>>(`/${tipo}`, body)).data.data;
}
export async function alterarStatusEstrutura(
  tipo: EstruturaTipo,
  id: string,
  ativo: boolean,
) {
  return (
    await api.patch<RespostaApi<Estrutura>>(
      `/${tipo}/${id}/${ativo ? "ativar" : "inativar"}`,
    )
  ).data.data;
}
