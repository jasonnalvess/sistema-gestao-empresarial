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
  CategoriaProduto,
  ativarCategoria,
  desativarCategoria,
} from "@/services/categorias.service";

type Props = {
  categoria: CategoriaProduto;
};

export function AlterarStatusCategoriaButton({ categoria }: Props) {
  const queryClient = useQueryClient();

  async function alterarStatus() {
    try {
      if (categoria.ativo) {
        await desativarCategoria(categoria.id);
        toast.success("Categoria desativada com sucesso!");
      } else {
        await ativarCategoria(categoria.id);
        toast.success("Categoria ativada com sucesso!");
      }

      queryClient.invalidateQueries({
        queryKey: ["categorias"],
      });

      queryClient.invalidateQueries({
        queryKey: ["categorias-produtos-select"],
      });
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Erro ao alterar status da categoria"
      );
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={categoria.ativo ? "destructive" : "outline"} size="sm">
          <Power size={14} className="mr-2" />
          {categoria.ativo ? "Desativar" : "Ativar"}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {categoria.ativo ? "Desativar categoria?" : "Ativar categoria?"}
          </AlertDialogTitle>

          <AlertDialogDescription>
            {categoria.ativo
              ? `A categoria "${categoria.nome}" será desativada.`
              : `A categoria "${categoria.nome}" será ativada novamente.`}
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
