"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Ban } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { agendaQueryKeys } from "@/lib/agenda-query-keys";
import { obterMensagemErro } from "@/lib/api-error";
import { PERMISSAO_AGENDA_CANCELAR } from "@/lib/auth";
import { AgendaEvento, cancelarAgendaEvento } from "@/services/agenda.service";

export function CancelarEventoButton({ evento }: { evento: AgendaEvento }) {
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const queryClient = useQueryClient();
  const [cancelando, setCancelando] = useState(false);
  const podeCancelar = temPermissao(PERMISSAO_AGENDA_CANCELAR);

  if (
    !podeCancelar ||
    evento.status === "CANCELADO" ||
    evento.status === "CONCLUIDO"
  ) {
    return null;
  }

  async function cancelar() {
    if (!podeCancelar) {
      toast.error("Você não possui permissão para esta ação.");
      return;
    }
    if (carregando || !empresaEfetivaId) return;
    if (!window.confirm("Confirma o cancelamento deste evento?")) return;

    try {
      setCancelando(true);
      await cancelarAgendaEvento(evento.id);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: agendaQueryKeys.listas(empresaEfetivaId),
        }),
        queryClient.invalidateQueries({
          queryKey: agendaQueryKeys.detalhe(empresaEfetivaId, evento.id),
        }),
        queryClient.invalidateQueries({
          queryKey: agendaQueryKeys.historico(empresaEfetivaId, evento.id),
        }),
      ]);
      toast.success("Evento cancelado com sucesso.");
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao cancelar evento"));
    } finally {
      setCancelando(false);
    }
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      disabled={cancelando}
      onClick={cancelar}
    >
      <Ban size={14} className="mr-2" />
      {cancelando ? "Cancelando..." : "Cancelar"}
    </Button>
  );
}
