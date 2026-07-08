"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";

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

import { criarProduto } from "@/services/produtos.service";
import { listarCategorias } from "@/services/categorias.service";

export function NovoProdutoModal() {
  const queryClient = useQueryClient();

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [codigo, setCodigo] = useState("");
  const [precoVenda, setPrecoVenda] = useState("");
  const [categoriaId, setCategoriaId] = useState("");

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

      await criarProduto({
        nome,
        descricao: descricao || undefined,
        codigo: codigo || undefined,
        precoVenda: Number(precoVenda),
        categoriaId: categoriaId || undefined,
      });

      toast.success("Produto cadastrado com sucesso!");

      setNome("");
      setDescricao("");
      setCodigo("");
      setPrecoVenda("");
      setCategoriaId("");

      setAberto(false);

      queryClient.invalidateQueries({
        queryKey: ["produtos"],
      });
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Erro ao cadastrar produto"
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button>
          <Plus size={16} className="mr-2" />
          Novo produto
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Novo produto</DialogTitle>
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
              {salvando ? "Salvando..." : "Salvar produto"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
