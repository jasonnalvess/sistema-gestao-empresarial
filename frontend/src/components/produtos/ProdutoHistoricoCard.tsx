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
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_PRODUTOS_EDITAR, PERMISSAO_PRODUTOS_VISUALIZAR } from "@/lib/auth";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";
import { obterMensagemErro } from "@/lib/api-error";

type Props = {
  produtoId: string;
};

export function ProdutoHistoricoCard({ produtoId }: Props) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeVisualizar = temPermissao(PERMISSAO_PRODUTOS_VISUALIZAR);
  const podeEditar = temPermissao(PERMISSAO_PRODUTOS_EDITAR);

  const [descricao, setDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);

  const { data: historicos = [], isLoading } = useQuery({
    queryKey: estoqueQueryKeys.produtoHistorico(empresaEfetivaId ?? "", produtoId),
    queryFn: () => listarProdutoHistorico(produtoId),
    enabled: podeVisualizar && Boolean(empresaEfetivaId) && Boolean(produtoId) && !carregando,
  });

  async function salvarHistorico() {
    if (!podeEditar || !empresaEfetivaId || carregando) return;
    try {
      setSalvando(true);

      await adicionarProdutoHistorico(produtoId, descricao);

      toast.success("Anotação adicionada com sucesso!");
      setDescricao("");

      queryClient.invalidateQueries({
        queryKey: estoqueQueryKeys.produtoHistorico(empresaEfetivaId, produtoId),
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao adicionar anotação"));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="min-w-0 space-y-5">
      {podeEditar && <div>
        <label className="text-sm font-medium text-slate-700">
          Nova anotação
        </label>

        <Textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex: Produto revisado, embalagem alterada, observação comercial..."
        />

        <div className="mt-3 flex justify-stretch sm:justify-end">
          <Button
            onClick={salvarHistorico}
            disabled={salvando || descricao.trim().length < 2}
          >
            <MessageSquarePlus aria-hidden="true" />
            {salvando ? "Salvando..." : "Adicionar anotação"}
          </Button>
        </div>
      </div>}

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
                <p className="break-words whitespace-pre-line text-sm text-slate-700">
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
