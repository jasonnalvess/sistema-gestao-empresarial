"use client";

import { useQueryClient } from "@tanstack/react-query";
import { XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/actions/ConfirmDialog";

import {
  cancelarContaReceber,
  ContaReceberDetalhada,
} from "@/services/contas-receber.service";

import { RegistrarRecebimentoModal } from "./RegistrarRecebimentoModal";

type Props = {
  conta: ContaReceberDetalhada;
};

export function ContaReceberAcoes({
  conta,
}: Props) {
  const queryClient = useQueryClient();

  async function atualizarConsultas() {
    await queryClient.invalidateQueries({
      queryKey: ["conta-receber", conta.id],
    });

    await queryClient.invalidateQueries({
      queryKey: ["contas-receber"],
    });
  }

  async function cancelar() {
    try {
      await cancelarContaReceber(conta.id);

      toast.success(
        "Conta cancelada com sucesso!"
      );

      await atualizarConsultas();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          "Erro ao cancelar conta"
      );
    }
  }

  const aceitaRecebimento = [
    "PENDENTE",
    "PARCIALMENTE_RECEBIDA",
    "VENCIDA",
  ].includes(conta.status);

  const aceitaCancelamento =
    conta.status !== "RECEBIDA" &&
    conta.status !== "CANCELADA" &&
    conta.recebimentos.length === 0;

  return (
    <div className="flex flex-wrap gap-2">
      {aceitaRecebimento && (
        <RegistrarRecebimentoModal
          conta={conta}
        />
      )}

      {aceitaCancelamento && (
        <ConfirmDialog
          title="Cancelar conta a receber?"
          description="A conta ficará indisponível para novos recebimentos."
          onConfirm={cancelar}
          trigger={
            <Button variant="destructive">
              <XCircle
                size={16}
                className="mr-2"
              />
              Cancelar conta
            </Button>
          }
        />
      )}
    </div>
  );
}
