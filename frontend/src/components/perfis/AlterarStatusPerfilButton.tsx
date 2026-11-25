"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Power, PowerOff } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/actions/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { obterMensagemErro } from "@/lib/api-error";
import {
  PERMISSAO_PERFIS_ATIVAR,
  PERMISSAO_PERFIS_INATIVAR,
} from "@/lib/auth";
import { perfisQueryKeys } from "@/lib/perfis-query-keys";
import {
  ativarPerfil,
  inativarPerfil,
  type Perfil,
} from "@/services/perfis.service";

type Props = {
  perfil: Perfil;
};

export function AlterarStatusPerfilButton({ perfil }: Props) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();

  const inativando = perfil.ativo;

  const podeAlterar = inativando
    ? temPermissao(PERMISSAO_PERFIS_INATIVAR)
    : temPermissao(PERMISSAO_PERFIS_ATIVAR);

  async function alterarStatus() {
    if (
      !podeAlterar ||
      !empresaEfetivaId ||
      carregando ||
      perfil.sistema
    ) {
      toast.error("Você não possui permissão para esta ação.");
      return;
    }

    try {
      if (inativando) {
        await inativarPerfil(perfil.id);
        toast.success("Perfil inativado com sucesso!");
      } else {
        await ativarPerfil(perfil.id);
        toast.success("Perfil ativado com sucesso!");
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: perfisQueryKeys.listas(empresaEfetivaId),
        }),

        queryClient.invalidateQueries({
          queryKey: perfisQueryKeys.detalhe(
            empresaEfetivaId,
            perfil.id,
          ),
        }),
      ]);
    } catch (error: unknown) {
      toast.error(
        obterMensagemErro(
          error,
          inativando
            ? "Erro ao inativar perfil."
            : "Erro ao ativar perfil.",
        ),
      );
    }
  }

  if (
    !podeAlterar ||
    !empresaEfetivaId ||
    carregando ||
    perfil.sistema
  ) {
    return null;
  }

  return (
    <ConfirmDialog
      title={inativando ? "Inativar perfil?" : "Ativar perfil?"}
      description={
        inativando
          ? `O perfil "${perfil.nome}" será inativado. Usuários vinculados poderão ter a autorização da sessão revogada e deixarão de receber as permissões deste perfil.`
          : `O perfil "${perfil.nome}" será ativado novamente. O sistema validará se você possui autorização para delegar as permissões configuradas nele.`
      }
      confirmText={inativando ? "Inativar perfil" : "Ativar perfil"}
      onConfirm={alterarStatus}
      trigger={
        <Button
          variant={inativando ? "destructive" : "outline"}
          size="sm"
        >
          {inativando ? (
            <PowerOff size={14} aria-hidden="true" />
          ) : (
            <Power size={14} aria-hidden="true" />
          )}

          {inativando ? "Inativar" : "Ativar"}
        </Button>
      }
    />
  );
}
