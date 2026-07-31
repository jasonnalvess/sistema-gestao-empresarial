"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageSquarePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { useAuth } from "@/contexts/AuthContext";
import { PERMISSAO_CLIENTES_EDITAR } from "@/lib/auth";
import {
  adicionarClienteHistorico,
  listarClienteHistorico,
} from "@/services/clientes.service";

type Props = {
  clienteId: string;
};

export function ClienteHistoricoCard({ clienteId }: Props) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const podeEditarCliente = temPermissao(PERMISSAO_CLIENTES_EDITAR);

  const [descricao, setDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);

  const { data: historicos = [], isLoading } = useQuery({
    queryKey: ["cliente-historico", clienteId],
    queryFn: () => listarClienteHistorico(clienteId),
  });

  async function salvarHistorico() {
    if (!podeEditarCliente) {
      toast.error("Você não possui permissão para esta ação.");
      return;
    }

    try {
      setSalvando(true);

      await adicionarClienteHistorico(clienteId, descricao);

      toast.success("Histórico adicionado com sucesso!");
      setDescricao("");

      queryClient.invalidateQueries({
        queryKey: ["cliente-historico", clienteId],
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
      {podeEditarCliente && (
        <div>
          <label className="text-sm font-medium text-slate-700">
            Nova anotação
          </label>

          <Textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex: Cliente solicitou retorno, pediu orçamento, atualizou telefone..."
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
      )}

      <div className="border-t pt-4">
        {isLoading ? (
          <p className="text-sm text-slate-500">Carregando histórico...</p>
        ) : historicos.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nenhum histórico geral registrado.
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
