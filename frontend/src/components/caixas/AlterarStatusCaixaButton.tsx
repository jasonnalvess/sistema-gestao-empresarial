"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  Power,
  PowerOff,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/actions/ConfirmDialog";

import {
  atualizarCaixa,
  Caixa,
} from "@/services/caixas.service";

type Props = {
  caixa: Caixa;
};

export function AlterarStatusCaixaButton({
  caixa,
}: Props) {
  const queryClient = useQueryClient();

  const desativando = caixa.ativo;

  async function alterar() {
    try {
      await atualizarCaixa(caixa.id, {
        ativo: !caixa.ativo,
      });

      toast.success(
        desativando
          ? "Caixa inativado com sucesso!"
          : "Caixa ativado com sucesso!"
      );

      await queryClient.invalidateQueries({
        queryKey: ["caixa", caixa.id],
      });

      await queryClient.invalidateQueries({
        queryKey: ["caixas"],
      });
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          "Erro ao alterar situação do caixa"
      );
    }
  }

  return (
    <ConfirmDialog
      title={
        desativando
          ? "Inativar caixa?"
          : "Ativar caixa?"
      }
      description={
        desativando
          ? "O caixa inativo não poderá ser aberto nem receber movimentações."
          : "O caixa voltará a ficar disponível para abertura."
      }
      onConfirm={alterar}
      trigger={
        <Button
          variant={
            desativando
              ? "destructive"
              : "outline"
          }
        >
          {desativando ? (
            <PowerOff
              size={16}
              className="mr-2"
            />
          ) : (
            <Power
              size={16}
              className="mr-2"
            />
          )}

          {desativando ? "Inativar" : "Ativar"}
        </Button>
      }
    />
  );
}
