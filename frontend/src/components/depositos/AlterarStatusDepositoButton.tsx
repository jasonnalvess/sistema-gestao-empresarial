"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Power } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/actions/ConfirmDialog";

import {
  ativarDeposito,
  Deposito,
  desativarDeposito,
} from "@/services/depositos.service";

type Props = {
  deposito: Deposito;
};

export function AlterarStatusDepositoButton({ deposito }: Props) {
  const queryClient = useQueryClient();

  async function alterarStatus() {
    try {
      if (deposito.ativo) {
        await desativarDeposito(deposito.id);
        toast.success("Depósito desativado com sucesso!");
      } else {
        await ativarDeposito(deposito.id);
        toast.success("Depósito ativado com sucesso!");
      }

      queryClient.invalidateQueries({
        queryKey: ["depositos"],
      });
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Erro ao alterar status do depósito"
      );
    }
  }

  return (
    <ConfirmDialog
      title={deposito.ativo ? "Desativar depósito?" : "Ativar depósito?"}
      description={
        deposito.ativo
          ? `O depósito "${deposito.nome}" será desativado e não poderá receber novas movimentações.`
          : `O depósito "${deposito.nome}" será ativado novamente.`
      }
      onConfirm={alterarStatus}
      trigger={
        <Button
          variant={deposito.ativo ? "destructive" : "outline"}
          size="sm"
        >
          <Power size={14} className="mr-2" />
          {deposito.ativo ? "Desativar" : "Ativar"}
        </Button>
      }
    />
  );
}
