"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import {
  adicionarOrdemServicoHistorico,
  listarOrdemServicoHistorico,
} from "@/services/ordens-servico.service";

type Props = {
  ordemServicoId: string;
};

export function OrdemServicoHistoricoCard({ ordemServicoId }: Props) {
  const queryClient = useQueryClient();

  const [descricao, setDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);

  const { data: historicos = [], isLoading } = useQuery({
    queryKey: ["ordem-servico-historico", ordemServicoId],
    queryFn: () => listarOrdemServicoHistorico(ordemServicoId),
  });

  async function salvarHistorico() {
    try {
      setSalvando(true);

      await adicionarOrdemServicoHistorico(ordemServicoId, descricao);

      toast.success("Histórico adicionado com sucesso!");
      setDescricao("");

      queryClient.invalidateQueries({
        queryKey: ["ordem-servico-historico", ordemServicoId],
      });
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Erro ao adicionar histórico"
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="text-sm font-medium text-slate-700">
          Nova evolução
        </label>

        <Textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex: Técnico iniciou análise, peça substituída, serviço concluído..."
        />

        <div className="mt-3 flex justify-end">
          <Button
            onClick={salvarHistorico}
            disabled={salvando || descricao.trim().length < 2}
          >
            <MessageSquarePlus size={16} className="mr-2" />
            {salvando ? "Salvando..." : "Adicionar histórico"}
          </Button>
        </div>
      </div>

      <div className="border-t pt-4">
        {isLoading ? (
          <p className="text-sm text-slate-500">Carregando histórico...</p>
        ) : historicos.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nenhum histórico registrado para esta OS.
          </p>
        ) : (
          <div className="space-y-3">
            {historicos.map((historico) => (
              <div
                key={historico.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <p className="text-sm text-slate-700">
                  {historico.descricao}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  {historico.usuario?.nome || "Usuário"} •{" "}
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

