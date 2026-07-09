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

type Props = {
  unidade: UnidadeMedida;
};

export function AlterarStatusUnidadeMedidaButton({ unidade }: Props) {
  const queryClient = useQueryClient();

  async function alterarStatus() {
    try {
      if (unidade.ativo) {
        await desativarUnidadeMedida(unidade.id);
        toast.success("Unidade desativada com sucesso!");
      } else {
        await ativarUnidadeMedida(unidade.id);
        toast.success("Unidade ativada com sucesso!");
      }

      queryClient.invalidateQueries({
        queryKey: ["unidades-medida"],
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao alterar status");
    }
  }

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
          <Power size={14} className="mr-2" />
          {unidade.ativo ? "Desativar" : "Ativar"}
        </Button>
      }
    />
  );
}
