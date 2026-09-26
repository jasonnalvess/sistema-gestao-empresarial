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
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_DEPOSITOS_EDITAR } from "@/lib/auth";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";
import { obterMensagemErro } from "@/lib/api-error";

type Props = {
  deposito: Deposito;
};

export function AlterarStatusDepositoButton({ deposito }: Props) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeEditar = temPermissao(PERMISSAO_DEPOSITOS_EDITAR);

  async function alterarStatus() {
    if (!podeEditar || !empresaEfetivaId || carregando) return;
    try {
      if (deposito.ativo) {
        await desativarDeposito(deposito.id);
        toast.success("Depósito desativado com sucesso!");
      } else {
        await ativarDeposito(deposito.id);
        toast.success("Depósito ativado com sucesso!");
      }

      queryClient.invalidateQueries({
        queryKey: estoqueQueryKeys.depositos(empresaEfetivaId),
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao alterar status do depósito"));
    }
  }

  if (!podeEditar || !empresaEfetivaId || carregando) return null;

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
          <Power aria-hidden="true" />
          {deposito.ativo ? "Desativar" : "Ativar"}
        </Button>
      }
    />
  );
}
