"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Power } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/actions/ConfirmDialog";

import {
  MarcaProduto,
  ativarMarcaProduto,
  desativarMarcaProduto,
} from "@/services/marcas-produtos.service";

type Props = {
  marca: MarcaProduto;
};

export function AlterarStatusMarcaProdutoButton({ marca }: Props) {
  const queryClient = useQueryClient();

  async function alterarStatus() {
    try {
      if (marca.ativo) {
        await desativarMarcaProduto(marca.id);
        toast.success("Marca desativada com sucesso!");
      } else {
        await ativarMarcaProduto(marca.id);
        toast.success("Marca ativada com sucesso!");
      }

      queryClient.invalidateQueries({
        queryKey: ["marcas-produtos"],
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao alterar status");
    }
  }

  return (
    <ConfirmDialog
      title={marca.ativo ? "Desativar marca?" : "Ativar marca?"}
      description={
        marca.ativo
          ? `A marca "${marca.nome}" será desativada.`
          : `A marca "${marca.nome}" será ativada novamente.`
      }
      onConfirm={alterarStatus}
      trigger={
        <Button variant={marca.ativo ? "destructive" : "outline"} size="sm">
          <Power size={14} className="mr-2" />
          {marca.ativo ? "Desativar" : "Ativar"}
        </Button>
      }
    />
  );
}
