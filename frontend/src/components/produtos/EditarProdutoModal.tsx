"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  atualizarProduto,
  Produto,
} from "@/services/produtos.service";
import { listarCategorias } from "@/services/categorias.service";

type Props = {
  produto: Produto;
};

export function EditarProdutoModal({ produto }: Props) {
  const queryClient = useQueryClient();

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState(produto.nome);
  const [descricao, setDescricao] = useState(produto.descricao ?? "");
  const [codigo, setCodigo] = useState(produto.codigo ?? "");
  const [precoVenda, setPrecoVenda] = useState(produto.precoVenda);
  const [categoriaId, setCategoriaId] = useState(produto.categoriaId ?? "");

  const { data: categoriasResponse } = useQuery({
    queryKey: ["categorias-produtos-select"],
    queryFn: () =>
      listarCategorias({
        page: 1,
        limit: 100,
        sortBy: "nome",
        order: "asc",
      }),
  });

  async function salvar() {
    try {
      setSalvando(true);

      await atualizarProduto(produto.id, {
        nome,
        descricao: descricao || undefined,
        codigo: codigo || undefined,
        precoVenda: Number(precoVenda),
        categoriaId: categoriaId || undefined,
      });

      toast.success("Produto atualizado com sucesso!");

      setAberto(false);

      queryClient.invalidateQueries({
        queryKey: ["produtos"],
      });
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Erro ao atualizar produto"
      );
    } finally {
      setSalvando(false);
    }
  }

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
          <DialogTitle>Editar produto</DialogTitle>
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

          <div>
            <label className="text-sm font-medium text-slate-700">Código</label>
            <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Preço de venda
            </label>
            <Input
              type="number"
              step="0.01"
              value={precoVenda}
              onChange={(e) => setPrecoVenda(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Categoria
            </label>

            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Sem categoria</option>

              {categoriasResponse?.data.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nome}
                </option>
              ))}
            </select>
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
