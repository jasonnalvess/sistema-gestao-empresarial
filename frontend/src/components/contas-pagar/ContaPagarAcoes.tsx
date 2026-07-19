"use client";

import { useQueryClient } from "@tanstack/react-query";
import { XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/actions/ConfirmDialog";

import {
  cancelarContaPagar,
  ContaPagarDetalhada,
} from "@/services/contas-pagar.service";

import { RegistrarPagamentoModal } from "./RegistrarPagamentoModal";

type Props = {
  conta: ContaPagarDetalhada;
};

export function ContaPagarAcoes({
  conta,
}: Props) {
  const queryClient = useQueryClient();

  async function atualizarConsultas() {
    await queryClient.invalidateQueries({
      queryKey: ["conta-pagar", conta.id],
    });

    await queryClient.invalidateQueries({
      queryKey: ["contas-pagar"],
    });
  }

  async function cancelar() {
    try {
      await cancelarContaPagar(conta.id);

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

  const aceitaPagamento = [
    "PENDENTE",
    "PARCIALMENTE_PAGA",
    "VENCIDA",
  ].includes(conta.status);

  const aceitaCancelamento =
    conta.status !== "PAGA" &&
    conta.status !== "CANCELADA" &&
    conta.pagamentos.length === 0;

  return (
    <div className="flex flex-wrap gap-2">
      {aceitaPagamento && (
        <RegistrarPagamentoModal
          conta={conta}
        />
      )}

      {aceitaCancelamento && (
        <ConfirmDialog
          title="Cancelar conta a pagar?"
          description="A conta ficará indisponível para pagamentos."
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
