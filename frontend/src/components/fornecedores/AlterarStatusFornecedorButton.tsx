"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Power } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/actions/ConfirmDialog";

import {
  ativarFornecedor,
  desativarFornecedor,
  Fornecedor,
} from "@/services/fornecedores.service";

type Props = {
  fornecedor: Fornecedor;
};

export function AlterarStatusFornecedorButton({
  fornecedor,
}: Props) {
  const queryClient = useQueryClient();

  async function alterarStatus() {
    try {
      if (fornecedor.ativo) {
        await desativarFornecedor(fornecedor.id);
        toast.success("Fornecedor desativado com sucesso!");
      } else {
        await ativarFornecedor(fornecedor.id);
        toast.success("Fornecedor ativado com sucesso!");
      }

      queryClient.invalidateQueries({
        queryKey: ["fornecedores"],
      });
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          "Erro ao alterar status do fornecedor"
      );
    }
  }

  return (
    <ConfirmDialog
      title={
        fornecedor.ativo
          ? "Desativar fornecedor?"
          : "Ativar fornecedor?"
      }
      description={
        fornecedor.ativo
          ? `O fornecedor "${fornecedor.nomeFantasia || fornecedor.razaoSocial}" será desativado.`
          : `O fornecedor "${fornecedor.nomeFantasia || fornecedor.razaoSocial}" será ativado novamente.`
      }
      onConfirm={alterarStatus}
      trigger={
        <Button
          variant={fornecedor.ativo ? "destructive" : "outline"}
          size="sm"
        >
          <Power size={14} className="mr-2" />
          {fornecedor.ativo ? "Desativar" : "Ativar"}
        </Button>
      }
    />
  );
}
