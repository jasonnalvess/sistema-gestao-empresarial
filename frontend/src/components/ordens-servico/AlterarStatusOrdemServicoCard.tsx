"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import {
  alterarStatusOrdemServico,
  OrdemServicoDetalhada,
} from "@/services/ordens-servico.service";

type Props = {
  ordem: OrdemServicoDetalhada;
};

export function AlterarStatusOrdemServicoCard({ ordem }: Props) {
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<
    "ABERTA" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA"
  >(ordem.status as "ABERTA" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA");

  const [descricao, setDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    try {
      setSalvando(true);

      await alterarStatusOrdemServico(ordem.id, {
        status,
        descricao: descricao || undefined,
      });

      toast.success("Status da OS atualizado com sucesso!");
      setDescricao("");

      queryClient.invalidateQueries({ queryKey: ["ordem-servico", ordem.id] });
      queryClient.invalidateQueries({
        queryKey: ["ordem-servico-historico", ordem.id],
      });
      queryClient.invalidateQueries({ queryKey: ["ordens-servico"] });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao alterar status");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-700">
          Status da OS
        </label>

        <select
          value={status}
          onChange={(e) =>
            setStatus(
              e.target.value as
                | "ABERTA"
                | "EM_ANDAMENTO"
                | "CONCLUIDA"
                | "CANCELADA"
            )
          }
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="ABERTA">Aberta</option>
          <option value="EM_ANDAMENTO">Em andamento</option>
          <option value="CONCLUIDA">Concluída</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">
          Observação da alteração
        </label>

        <Textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex: Serviço iniciado, finalizado, cancelado pelo cliente..."
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={salvar} disabled={salvando || status === ordem.status}>
          {salvando ? "Salvando..." : "Atualizar status"}
        </Button>
      </div>
    </div>
  );
}
