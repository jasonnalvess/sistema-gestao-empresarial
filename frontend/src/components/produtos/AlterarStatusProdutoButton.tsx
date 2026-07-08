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

type Props = {
  produto: Produto;
};

export function AlterarStatusProdutoButton({ produto }: Props) {
  const queryClient = useQueryClient();

  async function alterarStatus() {
    try {
      if (produto.ativo) {
        await desativarProduto(produto.id);
        toast.success("Produto desativado com sucesso!");
      } else {
        await ativarProduto(produto.id);
        toast.success("Produto ativado com sucesso!");
      }

      queryClient.invalidateQueries({
        queryKey: ["produtos"],
      });
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Erro ao alterar status do produto"
      );
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={produto.ativo ? "destructive" : "outline"} size="sm">
          <Power size={14} className="mr-2" />
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
