"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Power } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/actions/ConfirmDialog";

import {
  MarcaProduto,
  ativarMarcaProduto,
  desativarMarcaProduto,
} from "@/services/marcas-produtos.service";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_MARCAS_EDITAR } from "@/lib/auth";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";
import { obterMensagemErro } from "@/lib/api-error";

type Props = {
  marca: MarcaProduto;
};

export function AlterarStatusMarcaProdutoButton({ marca }: Props) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeEditar = temPermissao(PERMISSAO_MARCAS_EDITAR);

  async function alterarStatus() {
    if (!podeEditar || !empresaEfetivaId || carregando) return;
    try {
      if (marca.ativo) {
        await desativarMarcaProduto(marca.id);
        toast.success("Marca desativada com sucesso!");
      } else {
        await ativarMarcaProduto(marca.id);
        toast.success("Marca ativada com sucesso!");
      }

      queryClient.invalidateQueries({
        queryKey: estoqueQueryKeys.marcas(empresaEfetivaId),
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao alterar status"));
    }
  }

  if (!podeEditar || !empresaEfetivaId || carregando) return null;

  return (
    <ConfirmDialog
      title={marca.ativo ? "Desativar marca?" : "Ativar marca?"}
      description={
        marca.ativo
          ? `A marca "${marca.nome}" será desativada.`
          : `A marca "${marca.nome}" será ativada novamente.`
      }
      onConfirm={alterarStatus}
      trigger={
        <Button variant={marca.ativo ? "destructive" : "outline"} size="sm">
          <Power aria-hidden="true" />
          {marca.ativo ? "Desativar" : "Ativar"}
        </Button>
      }
    />
  );
}
