"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Power } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/actions/ConfirmDialog";

import {
  UnidadeMedida,
  ativarUnidadeMedida,
  desativarUnidadeMedida,
} from "@/services/unidades-medida.service";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_UNIDADES_EDITAR } from "@/lib/auth";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";
import { obterMensagemErro } from "@/lib/api-error";

type Props = {
  unidade: UnidadeMedida;
};

export function AlterarStatusUnidadeMedidaButton({ unidade }: Props) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeEditar = temPermissao(PERMISSAO_UNIDADES_EDITAR);

  async function alterarStatus() {
    if (!podeEditar || !empresaEfetivaId || carregando) return;
    try {
      if (unidade.ativo) {
        await desativarUnidadeMedida(unidade.id);
        toast.success("Unidade desativada com sucesso!");
      } else {
        await ativarUnidadeMedida(unidade.id);
        toast.success("Unidade ativada com sucesso!");
      }

      queryClient.invalidateQueries({
        queryKey: estoqueQueryKeys.unidades(empresaEfetivaId),
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao alterar status"));
    }
  }

  if (!podeEditar || !empresaEfetivaId || carregando) return null;

  return (
    <ConfirmDialog
      title={unidade.ativo ? "Desativar unidade?" : "Ativar unidade?"}
      description={
        unidade.ativo
          ? `A unidade "${unidade.nome}" será desativada.`
          : `A unidade "${unidade.nome}" será ativada novamente.`
      }
      onConfirm={alterarStatus}
      trigger={
        <Button variant={unidade.ativo ? "destructive" : "outline"} size="sm">
          <Power aria-hidden="true" />
          {unidade.ativo ? "Desativar" : "Ativar"}
        </Button>
      }
    />
  );
}
