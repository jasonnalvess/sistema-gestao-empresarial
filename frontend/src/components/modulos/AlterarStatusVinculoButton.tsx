"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Power } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/actions/ConfirmDialog";

import {
  type EmpresaModulo,
  ativarVinculoEmpresaModulo,
  desativarVinculoEmpresaModulo,
} from "@/services/empresa-modulos.service";
import { empresaModulosQueryKeys } from "@/lib/empresa-modulos-query-keys";
import { obterMensagemErro } from "@/lib/api-error";

type Props = {
  vinculo: EmpresaModulo;
};

export function AlterarStatusVinculoButton({ vinculo }: Props) {
  const queryClient = useQueryClient();
  const empresaId = vinculo.empresaId;

  async function alterarStatus() {
    try {
      if (vinculo.ativo) {
        await desativarVinculoEmpresaModulo(vinculo.id);
        toast.success(
          `Módulo "${vinculo.modulo.nome}" desativado para a empresa!`,
        );
      } else {
        await ativarVinculoEmpresaModulo(vinculo.id);
        toast.success(
          `Módulo "${vinculo.modulo.nome}" ativado para a empresa!`,
        );
      }

      queryClient.invalidateQueries({
        queryKey: empresaModulosQueryKeys.porEmpresa(empresaId),
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao alterar vínculo do módulo"));
    }
  }

  return (
    <ConfirmDialog
      title={vinculo.ativo ? "Desativar vínculo do módulo?" : "Ativar vínculo do módulo?"}
      description={
        vinculo.ativo
          ? `Os usuários da empresa deixarão de acessar o módulo "${vinculo.modulo.nome}" enquanto o vínculo estiver desativado.`
          : `Os usuários da empresa voltarão a acessar o módulo "${vinculo.modulo.nome}", conforme suas permissões.`
      }
      onConfirm={alterarStatus}
      confirmText={vinculo.ativo ? "Desativar" : "Ativar"}
      trigger={
        <Button variant={vinculo.ativo ? "destructive" : "outline"} size="sm">
          <Power aria-hidden="true" />
          {vinculo.ativo ? "Desativar" : "Ativar"}
        </Button>
      }
    />
  );
}
