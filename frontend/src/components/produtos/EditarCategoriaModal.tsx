"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  CategoriaProduto,
  atualizarCategoria,
} from "@/services/categorias.service";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_CATEGORIAS_EDITAR } from "@/lib/auth";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";
import { obterMensagemErro } from "@/lib/api-error";

type Props = {
  categoria: CategoriaProduto;
};

export function EditarCategoriaModal({ categoria }: Props) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeEditar = temPermissao(PERMISSAO_CATEGORIAS_EDITAR);

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [nome, setNome] = useState(categoria.nome);
  const [descricao, setDescricao] = useState(categoria.descricao ?? "");

  async function salvar() {
    if (!podeEditar || !empresaEfetivaId || carregando) return;
    try {
      setSalvando(true);

      await atualizarCategoria(categoria.id, {
        nome,
        descricao: descricao || undefined,
      });

      toast.success("Categoria atualizada com sucesso!");

      setAberto(false);

      queryClient.invalidateQueries({
        queryKey: estoqueQueryKeys.categorias(empresaEfetivaId),
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao atualizar categoria"));
    } finally {
      setSalvando(false);
    }
  }

  if (!podeEditar || !empresaEfetivaId || carregando) return null;

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil size={14} className="mr-2" />
          Editar
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar categoria</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Nome</label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Descrição
            </label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setAberto(false)}
              disabled={salvando}
            >
              Cancelar
            </Button>

            <Button onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
