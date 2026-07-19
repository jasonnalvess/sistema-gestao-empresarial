"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/forms/FormDialog";

import { cancelarVenda } from "@/services/vendas.service";

type Props = {
  vendaId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CancelarVendaModal({
  vendaId,
  open,
  onOpenChange,
}: Props) {
  const queryClient = useQueryClient();

  const [processando, setProcessando] = useState(false);

  async function confirmar() {
    try {
      setProcessando(true);

      await cancelarVenda(vendaId, {});

      toast.success("Venda cancelada com sucesso.");

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["vendas"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["dashboard-vendas"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["venda", vendaId],
        }),
      ]);

      onOpenChange(false);
    } catch (error: any) {
      const mensagem = error.response?.data?.message;

      toast.error(
        Array.isArray(mensagem)
          ? mensagem.join(", ")
          : mensagem ?? "Erro ao cancelar venda."
      );
    } finally {
      setProcessando(false);
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Cancelar venda"
      trigger={<span className="hidden" />}
    >
      <div className="space-y-6">
        <div>
          <p className="text-sm text-slate-600">
            Deseja realmente cancelar esta venda?
          </p>

          <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4">
            <p className="font-medium text-red-900">
              Esta operação poderá:
            </p>

            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-800">
              <li>cancelar a venda;</li>
              <li>estornar o estoque (quando aplicável);</li>
              <li>cancelar as contas a receber vinculadas;</li>
              <li>registrar a operação no histórico.</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-5">
          <Button
            variant="outline"
            disabled={processando}
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>

          <Button
            variant="destructive"
            disabled={processando}
            onClick={confirmar}
          >
            {processando
              ? "Cancelando..."
              : "Confirmar cancelamento"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}
