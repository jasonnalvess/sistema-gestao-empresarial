"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import {
  adicionarProdutoHistorico,
  listarProdutoHistorico,
} from "@/services/produtos.service";

type Props = {
  produtoId: string;
};

export function ProdutoHistoricoCard({ produtoId }: Props) {
  const queryClient = useQueryClient();

  const [descricao, setDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);

  const { data: historicos = [], isLoading } = useQuery({
    queryKey: ["produto-historico", produtoId],
    queryFn: () => listarProdutoHistorico(produtoId),
  });

  async function salvarHistorico() {
    try {
      setSalvando(true);

      await adicionarProdutoHistorico(produtoId, descricao);

      toast.success("Anotação adicionada com sucesso!");
      setDescricao("");

      queryClient.invalidateQueries({
        queryKey: ["produto-historico", produtoId],
      });
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Erro ao adicionar anotação"
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="text-sm font-medium text-slate-700">
          Nova anotação
        </label>

        <Textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex: Produto revisado, embalagem alterada, observação comercial..."
        />

        <div className="mt-3 flex justify-end">
          <Button
            onClick={salvarHistorico}
            disabled={salvando || descricao.trim().length < 2}
          >
            <MessageSquarePlus size={16} className="mr-2" />
            {salvando ? "Salvando..." : "Adicionar anotação"}
          </Button>
        </div>
      </div>

      <div className="border-t pt-4">
        {isLoading ? (
          <p className="text-sm text-slate-500">
            Carregando histórico...
          </p>
        ) : historicos.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nenhum histórico registrado para este produto.
          </p>
        ) : (
          <div className="space-y-3">
            {historicos.map((historico) => (
              <div
                key={historico.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <p className="whitespace-pre-line text-sm text-slate-700">
                  {historico.descricao}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  {historico.usuario?.nome || "Sistema"} •{" "}
                  {new Date(historico.createdAt).toLocaleString("pt-BR")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
