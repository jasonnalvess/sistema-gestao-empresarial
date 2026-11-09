import type {
  StatusFuncionario,
  TipoVinculo,
  EstadoAcesso,
} from "@/services/funcionarios.service";
export const statusRotulos: Record<StatusFuncionario, string> = {
  ATIVO: "Ativo",
  FERIAS: "Férias",
  AFASTADO: "Afastado",
  LICENCA: "Licença",
  INATIVO: "Inativo",
  DESLIGADO: "Desligado",
};
export const vinculoRotulos: Record<TipoVinculo, string> = {
  CLT: "CLT",
  ESTAGIARIO: "Estagiário",
  APRENDIZ: "Aprendiz",
  TEMPORARIO: "Temporário",
  TERCEIRIZADO: "Terceirizado",
  PRESTADOR_SERVICO: "Prestador de serviço",
  SOCIO: "Sócio",
  OUTRO: "Outro",
};
export const acessoRotulos: Record<EstadoAcesso, string> = {
  SEM_USUARIO: "Sem acesso",
  USUARIO_ATIVO: "Acesso ativo",
  USUARIO_INATIVO: "Acesso inativo",
};
export const transicoes: Record<StatusFuncionario, StatusFuncionario[]> = {
  ATIVO: ["FERIAS", "AFASTADO", "LICENCA", "INATIVO", "DESLIGADO"],
  FERIAS: ["ATIVO", "DESLIGADO"],
  AFASTADO: ["ATIVO", "DESLIGADO"],
  LICENCA: ["ATIVO", "DESLIGADO"],
  INATIVO: ["ATIVO", "DESLIGADO"],
  DESLIGADO: [],
};
export const eventosRotulos: Record<string, string> = {
  CRIACAO: "Cadastro criado",
  EDICAO: "Cadastro editado",
  ALTERACAO_CARGO: "Cargo alterado",
  ALTERACAO_DEPARTAMENTO: "Departamento alterado",
  ALTERACAO_GESTOR: "Gestor alterado",
  RECLASSIFICACAO_STATUS: "Situação reclassificada",
  ALTERACAO_STATUS: "Situação alterada",
  CRIACAO_ACESSO: "Acesso criado",
  VINCULO_ACESSO: "Acesso vinculado",
  DESVINCULO_ACESSO: "Acesso desvinculado",
  INATIVACAO_ACESSO: "Acesso inativado",
  REATIVACAO_ACESSO: "Acesso reativado",
  REDEFINICAO_SENHA: "Senha redefinida",
};
export function dataCivil(data: string) {
  return new Date(data.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR");
}
export const selectClass =
  "h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-base md:text-sm";

export const rhDialogClass =
  "w-[calc(100%-2rem)] min-w-0 max-w-xl sm:max-w-xl max-h-[calc(100dvh-2rem)] overflow-y-auto [overflow-wrap:anywhere] [&_[data-slot=dialog-header]]:pr-8";
