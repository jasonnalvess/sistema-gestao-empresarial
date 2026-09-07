"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Power } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  Produto,
  ativarProduto,
  desativarProduto,
} from "@/services/produtos.service";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_PRODUTOS_EDITAR } from "@/lib/auth";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";
import { obterMensagemErro } from "@/lib/api-error";

type Props = {
  produto: Produto;
};

export function AlterarStatusProdutoButton({ produto }: Props) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeEditar = temPermissao(PERMISSAO_PRODUTOS_EDITAR);

  async function alterarStatus() {
    if (!podeEditar || !empresaEfetivaId || carregando) return;
    try {
      if (produto.ativo) {
        await desativarProduto(produto.id);
        toast.success("Produto desativado com sucesso!");
      } else {
        await ativarProduto(produto.id);
        toast.success("Produto ativado com sucesso!");
      }

      queryClient.invalidateQueries({
        queryKey: estoqueQueryKeys.produtos(empresaEfetivaId),
      });
      queryClient.invalidateQueries({
        queryKey: estoqueQueryKeys.produtosDetalhes(empresaEfetivaId),
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao alterar status do produto"));
    }
  }

  if (!podeEditar || !empresaEfetivaId || carregando) return null;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={produto.ativo ? "destructive" : "outline"} size="sm">
          <Power aria-hidden="true" />
          {produto.ativo ? "Desativar" : "Ativar"}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {produto.ativo ? "Desativar produto?" : "Ativar produto?"}
          </AlertDialogTitle>

          <AlertDialogDescription>
            {produto.ativo
              ? `O produto "${produto.nome}" será desativado e deixará de aparecer como ativo.`
              : `O produto "${produto.nome}" será ativado novamente.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={alterarStatus}>
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
