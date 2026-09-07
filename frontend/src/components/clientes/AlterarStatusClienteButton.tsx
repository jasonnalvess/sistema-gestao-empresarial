"use client";

import { obterMensagemErro } from "@/lib/api-error";
import { useQueryClient } from "@tanstack/react-query";
import { Power } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/actions/ConfirmDialog";

import { useAuth } from "@/contexts/AuthContext";
import { PERMISSAO_CLIENTES_EDITAR } from "@/lib/auth";
import {
  Cliente,
  ativarCliente,
  desativarCliente,
} from "@/services/clientes.service";

type Props = {
  cliente: Cliente;
};

export function AlterarStatusClienteButton({ cliente }: Props) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const podeEditarCliente = temPermissao(PERMISSAO_CLIENTES_EDITAR);

  async function alterarStatus() {
    if (!podeEditarCliente) {
      toast.error("Você não possui permissão para esta ação.");
      return;
    }

    try {
      if (cliente.ativo) {
        await desativarCliente(cliente.id);
        toast.success("Cliente desativado com sucesso!");
      } else {
        await ativarCliente(cliente.id);
        toast.success("Cliente ativado com sucesso!");
      }

      queryClient.invalidateQueries({
        queryKey: ["clientes"],
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao alterar status do cliente"));
    }
  }

  if (!podeEditarCliente) {
    return null;
  }

  return (
    <ConfirmDialog
      title={cliente.ativo ? "Desativar cliente?" : "Ativar cliente?"}
      description={
        cliente.ativo
          ? `O cliente "${cliente.nome}" será desativado.`
          : `O cliente "${cliente.nome}" será ativado novamente.`
      }
      onConfirm={alterarStatus}
      trigger={
        <Button variant={cliente.ativo ? "destructive" : "outline"} size="sm">
          <Power aria-hidden="true" />
          {cliente.ativo ? "Desativar" : "Ativar"}
        </Button>
      }
    />
  );
}
