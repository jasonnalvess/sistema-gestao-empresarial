"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Power, PowerOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/actions/ConfirmDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_CAIXA_EDITAR } from "@/lib/auth";
import { caixasQueryKeys } from "@/lib/caixas-query-keys";
import { obterMensagemErro } from "@/lib/api-error";

import { atualizarCaixa, Caixa } from "@/services/caixas.service";

type Props = {
  caixa: Caixa;
};

export function AlterarStatusCaixaButton({ caixa }: Props) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeEditar = temPermissao(PERMISSAO_CAIXA_EDITAR);

  const desativando = caixa.ativo;

  async function alterar() {
    if (!podeEditar || !empresaEfetivaId || carregando) {
      toast.error("Você não possui permissão para esta ação.");
      return;
    }
    try {
      await atualizarCaixa(caixa.id, {
        ativo: !caixa.ativo,
      });

      toast.success(
        desativando
          ? "Caixa inativado com sucesso!"
          : "Caixa ativado com sucesso!",
      );

      await queryClient.invalidateQueries({
        queryKey: caixasQueryKeys.detalhe(empresaEfetivaId, caixa.id),
      });

      await queryClient.invalidateQueries({
        queryKey: caixasQueryKeys.listas(empresaEfetivaId),
      });
      await queryClient.invalidateQueries({
        queryKey: caixasQueryKeys.resumo(empresaEfetivaId),
      });
      await queryClient.invalidateQueries({
        queryKey: caixasQueryKeys.selects(empresaEfetivaId),
      });
    } catch (error: unknown) {
      toast.error(
        obterMensagemErro(error, "Erro ao alterar situação do caixa"),
      );
    }
  }

  if (!podeEditar || !empresaEfetivaId || carregando) return null;

  return (
    <ConfirmDialog
      title={desativando ? "Inativar caixa?" : "Ativar caixa?"}
      description={
        desativando
          ? "O caixa inativo não poderá ser aberto nem receber movimentações."
          : "O caixa voltará a ficar disponível para abertura."
      }
      onConfirm={alterar}
      trigger={
        <Button variant={desativando ? "destructive" : "outline"}>
          {desativando ? (
            <PowerOff size={16} className="mr-2" />
          ) : (
            <Power size={16} className="mr-2" />
          )}

          {desativando ? "Inativar" : "Ativar"}
        </Button>
      }
    />
  );
}
