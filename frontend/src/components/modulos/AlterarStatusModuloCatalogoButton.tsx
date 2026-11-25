"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Power } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/actions/ConfirmDialog";

import {
  type ModuloSistema,
  ativarModulo,
  desativarModulo,
} from "@/services/modulos.service";
import { modulosQueryKeys } from "@/lib/modulos-query-keys";
import { obterMensagemErro } from "@/lib/api-error";

type Props = {
  modulo: ModuloSistema;
};

export function AlterarStatusModuloCatalogoButton({ modulo }: Props) {
  const queryClient = useQueryClient();

  async function alterarStatus() {
    try {
      if (modulo.ativo) {
        await desativarModulo(modulo.id);
        toast.success(`Módulo "${modulo.nome}" desativado no catálogo!`);
      } else {
        await ativarModulo(modulo.id);
        toast.success(`Módulo "${modulo.nome}" ativado no catálogo!`);
      }

      queryClient.invalidateQueries({
        queryKey: modulosQueryKeys.catalogo(),
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao alterar status do módulo"));
    }
  }

  return (
    <ConfirmDialog
      title={modulo.ativo ? "Desativar módulo no catálogo?" : "Ativar módulo no catálogo?"}
      description={
        modulo.ativo
          ? `O módulo "${modulo.nome}" será desativado no catálogo global e deixará de ser considerado ativo para todas as empresas.`
          : `O módulo "${modulo.nome}" voltará a ficar ativo no catálogo global.`
      }
      onConfirm={alterarStatus}
      confirmText={modulo.ativo ? "Desativar" : "Ativar"}
      trigger={
        <Button variant={modulo.ativo ? "destructive" : "outline"} size="sm">
          <Power aria-hidden="true" />
          {modulo.ativo ? "Desativar" : "Ativar"}
        </Button>
      }
    />
  );
}
