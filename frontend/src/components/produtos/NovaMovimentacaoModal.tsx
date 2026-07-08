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

import { listarProdutos } from "@/services/produtos.service";
import { criarMovimentacao } from "@/services/movimentacoes.service";

export function NovaMovimentacaoModal() {
  const queryClient = useQueryClient();

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [produtoId, setProdutoId] = useState("");
  const [tipo, setTipo] = useState<"ENTRADA" | "SAIDA">("ENTRADA");
  const [quantidade, setQuantidade] = useState("");
  const [observacao, setObservacao] = useState("");

  const { data: produtosResponse } = useQuery({
    queryKey: ["produtos-select"],
    queryFn: () =>
      listarProdutos({
        page: 1,
        limit: 100,
        sortBy: "nome",
        order: "asc",
      }),
  });

  async function salvar() {
    try {
      setSalvando(true);

      await criarMovimentacao({
        produtoId,
        tipo,
        quantidade: Number(quantidade),
        observacao: observacao || undefined,
      });

      toast.success("Movimentação registrada com sucesso!");

      setProdutoId("");
      setTipo("ENTRADA");
      setQuantidade("");
      setObservacao("");
      setAberto(false);

      queryClient.invalidateQueries({ queryKey: ["movimentacoes"] });
      queryClient.invalidateQueries({ queryKey: ["estoque"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-resumo"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-movimentacoes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-estoque-baixo"] });
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Erro ao registrar movimentação"
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
          Nova movimentação
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nova movimentação</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">
              Produto
            </label>

            <select
              value={produtoId}
              onChange={(e) => setProdutoId(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Selecione um produto</option>

              {produtosResponse?.data.map((produto) => (
                <option key={produto.id} value={produto.id}>
                  {produto.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Tipo</label>

            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as "ENTRADA" | "SAIDA")}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="ENTRADA">Entrada</option>
              <option value="SAIDA">Saída</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Quantidade
            </label>
            <Input
              type="number"
              min="1"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Observação
            </label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
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
              {salvando ? "Salvando..." : "Salvar movimentação"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
