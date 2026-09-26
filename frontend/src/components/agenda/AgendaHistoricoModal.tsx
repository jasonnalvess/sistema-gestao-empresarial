"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { History } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/forms/FormDialog";

import {
  AgendaEvento,
  adicionarAgendaHistorico,
  listarAgendaHistorico,
} from "@/services/agenda.service";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { agendaQueryKeys } from "@/lib/agenda-query-keys";
import { obterMensagemErro } from "@/lib/api-error";
import {
  PERMISSAO_AGENDA_EDITAR,
  PERMISSAO_AGENDA_VISUALIZAR,
} from "@/lib/auth";

type Props = {
  evento: AgendaEvento;
};

export function AgendaHistoricoModal({ evento }: Props) {
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeVisualizar = temPermissao(PERMISSAO_AGENDA_VISUALIZAR);
  const podeEditar = temPermissao(PERMISSAO_AGENDA_EDITAR);
  const queryClient = useQueryClient();

  const [aberto, setAberto] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);

  const { data: historicos = [], isLoading } = useQuery({
    queryKey: agendaQueryKeys.historico(empresaEfetivaId ?? "", evento.id),
    queryFn: () => listarAgendaHistorico(evento.id),
    enabled:
      aberto && !carregando && Boolean(empresaEfetivaId) && podeVisualizar,
  });

  async function salvarHistorico() {
    if (!podeEditar) {
      toast.error("Você não possui permissão para esta ação.");
      return;
    }
    if (carregando || !empresaEfetivaId) return;
    try {
      setSalvando(true);

      await adicionarAgendaHistorico(evento.id, descricao);

      toast.success("Histórico adicionado com sucesso!");

      setDescricao("");

      queryClient.invalidateQueries({
        queryKey: agendaQueryKeys.historico(empresaEfetivaId, evento.id),
      });
      await queryClient.invalidateQueries({
        queryKey: agendaQueryKeys.detalhe(empresaEfetivaId, evento.id),
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao adicionar histórico"));
    } finally {
      setSalvando(false);
    }
  }

  if (!podeVisualizar) return null;

  return (
    <FormDialog
      open={aberto}
      onOpenChange={setAberto}
      title="Histórico do atendimento"
      trigger={
        <Button variant="outline" size="sm">
          <History size={14} className="mr-2" />
          Histórico
        </Button>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="text-sm font-medium text-slate-700">{evento.titulo}</p>
          <p className="text-xs text-slate-500">
            {evento.cliente?.nome ||
              evento.clienteNome ||
              "Sem cliente informado"}
          </p>
        </div>

        {podeEditar && (
          <div>
            <label className="text-sm font-medium text-slate-700">
              Nova evolução
            </label>

            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Cliente enviou documentação, aguardando retorno..."
            />

            <div className="mt-3 flex justify-end">
              <Button
                onClick={salvarHistorico}
                disabled={salvando || descricao.trim().length < 2}
              >
                {salvando ? "Salvando..." : "Adicionar histórico"}
              </Button>
            </div>
          </div>
        )}

        <div className="border-t pt-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">
            Evoluções registradas
          </h3>

          {isLoading ? (
            <p className="text-sm text-slate-500">Carregando histórico...</p>
          ) : historicos.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhum histórico registrado.
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
    </FormDialog>
  );
}
