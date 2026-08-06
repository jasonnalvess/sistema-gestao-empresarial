"use client";

import { obterMensagemErro } from "@/lib/api-error";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Power } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/actions/ConfirmDialog";

import {
  Usuario,
  ativarUsuario,
  desativarUsuario,
} from "@/services/usuarios.service";

type Props = {
  usuario: Usuario;
};

export function AlterarStatusUsuarioButton({ usuario }: Props) {
  const queryClient = useQueryClient();

  async function alterarStatus() {
    try {
      if (usuario.ativo) {
        await desativarUsuario(usuario.id);
        toast.success("Usuário desativado com sucesso!");
      } else {
        await ativarUsuario(usuario.id);
        toast.success("Usuário ativado com sucesso!");
      }

      queryClient.invalidateQueries({
        queryKey: ["usuarios"],
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao alterar status do usuário"));
    }
  }

  return (
    <ConfirmDialog
      title={usuario.ativo ? "Desativar usuário?" : "Ativar usuário?"}
      description={
        usuario.ativo
          ? `O usuário "${usuario.nome}" será desativado.`
          : `O usuário "${usuario.nome}" será ativado novamente.`
      }
      onConfirm={alterarStatus}
      trigger={
        <Button variant={usuario.ativo ? "destructive" : "outline"} size="sm">
          <Power size={14} className="mr-2" />
          {usuario.ativo ? "Desativar" : "Ativar"}
        </Button>
      }
    />
  );
}
