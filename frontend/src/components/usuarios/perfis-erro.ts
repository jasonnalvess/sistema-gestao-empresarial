import { isAxiosError } from "axios";
import { obterMensagemErro } from "@/lib/api-error";

export function mensagemErroPerfis(error: unknown): string {
  const status = isAxiosError(error) ? error.response?.status : undefined;
  if (status === 409)
    return "Conflito de alteração. Os perfis serão recarregados; revise o estado atualizado antes de salvar novamente.";
  if (status === 403) return "Operação não autorizada para estes perfis.";
  if (status === 404)
    return "Usuário ou perfil não encontrado ou indisponível.";
  if (status === 401) return "Sessão expirada. Entre novamente.";
  return obterMensagemErro(
    error,
    "Não foi possível atualizar os perfis. Revise a seleção e tente novamente.",
  );
}
