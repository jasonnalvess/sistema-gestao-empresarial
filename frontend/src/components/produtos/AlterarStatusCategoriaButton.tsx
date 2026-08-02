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
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_CATEGORIAS_EDITAR } from "@/lib/auth";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";
import { obterMensagemErro } from "@/lib/api-error";

type Props = {
  categoria: CategoriaProduto;
};

export function AlterarStatusCategoriaButton({ categoria }: Props) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeEditar = temPermissao(PERMISSAO_CATEGORIAS_EDITAR);

  async function alterarStatus() {
    if (!podeEditar || !empresaEfetivaId || carregando) return;
    try {
      if (categoria.ativo) {
        await desativarCategoria(categoria.id);
        toast.success("Categoria desativada com sucesso!");
      } else {
        await ativarCategoria(categoria.id);
        toast.success("Categoria ativada com sucesso!");
      }

      queryClient.invalidateQueries({
        queryKey: estoqueQueryKeys.categorias(empresaEfetivaId),
      });

      queryClient.invalidateQueries({
        queryKey: estoqueQueryKeys.categoriasSelect(empresaEfetivaId),
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao alterar status da categoria"));
    }
  }

  if (!podeEditar || !empresaEfetivaId || carregando) return null;

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
