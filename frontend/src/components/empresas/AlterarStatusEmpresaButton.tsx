"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Power } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/actions/ConfirmDialog";

import {
  type Empresa,
  ativarEmpresa,
  desativarEmpresa,
} from "@/services/empresas.service";
import { empresasQueryKeys } from "@/lib/empresas-query-keys";
import { obterMensagemErro } from "@/lib/api-error";

type Props = {
  empresa: Empresa;
};

export function AlterarStatusEmpresaButton({ empresa }: Props) {
  const queryClient = useQueryClient();

  async function alterarStatus() {
    try {
      if (empresa.ativa) {
        await desativarEmpresa(empresa.id);
        toast.success("Empresa desativada com sucesso!");
      } else {
        await ativarEmpresa(empresa.id);
        toast.success("Empresa ativada com sucesso!");
      }

      queryClient.invalidateQueries({
        queryKey: empresasQueryKeys.todas(),
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao alterar status da empresa"));
    }
  }

  return (
    <ConfirmDialog
      title={empresa.ativa ? "Desativar empresa?" : "Ativar empresa?"}
      description={
        empresa.ativa
          ? `A empresa "${empresa.nome}" será desativada e o acesso dos seus usuários será bloqueado até nova ativação.`
          : `A empresa "${empresa.nome}" será ativada novamente e seus usuários voltarão a ter acesso.`
      }
      onConfirm={alterarStatus}
      confirmText={empresa.ativa ? "Desativar" : "Ativar"}
      trigger={
        <Button variant={empresa.ativa ? "destructive" : "outline"} size="sm">
          <Power aria-hidden="true" />
          {empresa.ativa ? "Desativar" : "Ativar"}
        </Button>
      }
    />
  );
}
