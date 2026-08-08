"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/forms/FormDialog";

import { AgendaEvento, atualizarAgendaEvento } from "@/services/agenda.service";
import { listarClientes } from "@/services/clientes.service";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { agendaQueryKeys } from "@/lib/agenda-query-keys";
import { obterMensagemErro } from "@/lib/api-error";
import {
  PERMISSAO_AGENDA_EDITAR,
  PERMISSAO_CLIENTES_VISUALIZAR,
} from "@/lib/auth";
import type { AgendaStatusEditavel } from "@/services/agenda.service";

type Props = {
  evento: AgendaEvento;
};

function formatarParaInputData(data: string) {
  return new Date(data).toISOString().slice(0, 16);
}

export function EditarEventoModal({ evento }: Props) {
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeEditar = temPermissao(PERMISSAO_AGENDA_EDITAR);
  const podeVisualizarClientes = temPermissao(PERMISSAO_CLIENTES_VISUALIZAR);
  const queryClient = useQueryClient();

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [titulo, setTitulo] = useState(evento.titulo);
  const [descricao, setDescricao] = useState(evento.descricao ?? "");
  const [dataInicio, setDataInicio] = useState(
    formatarParaInputData(evento.dataInicio),
  );
  const [dataFim, setDataFim] = useState(formatarParaInputData(evento.dataFim));
  const [local, setLocal] = useState(evento.local ?? "");
  const [clienteId, setClienteId] = useState(evento.clienteId ?? "");
  const [status, setStatus] = useState<AgendaStatusEditavel>(
    evento.status === "CANCELADO" ? "AGENDADO" : evento.status,
  );

  const { data: clientesResponse } = useQuery({
    queryKey: ["clientes-select", empresaEfetivaId],
    queryFn: () =>
      listarClientes({
        page: 1,
        limit: 100,
      }),
    enabled:
      aberto &&
      !carregando &&
      Boolean(empresaEfetivaId) &&
      podeEditar &&
      podeVisualizarClientes,
  });

  async function salvar() {
    if (!podeEditar) {
      toast.error("Você não possui permissão para esta ação.");
      return;
    }
    if (carregando || !empresaEfetivaId) return;
    if (!clienteId) {
      toast.error(
        "Selecione um cliente cadastrado antes de salvar o atendimento.",
      );
      return;
    }

    try {
      setSalvando(true);

      await atualizarAgendaEvento(evento.id, {
        titulo,
        descricao: descricao || undefined,
        dataInicio: new Date(dataInicio).toISOString(),
        dataFim: new Date(dataFim).toISOString(),
        local: local || undefined,
        clienteId,
        clienteNome: undefined,
        clienteContato: undefined,
        status,
      });

      toast.success("Atendimento atualizado com sucesso!");
      setAberto(false);

      queryClient.invalidateQueries({
        queryKey: agendaQueryKeys.listas(empresaEfetivaId),
      });
      await queryClient.invalidateQueries({
        queryKey: agendaQueryKeys.detalhe(empresaEfetivaId, evento.id),
      });
      await queryClient.invalidateQueries({
        queryKey: agendaQueryKeys.historico(empresaEfetivaId, evento.id),
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao atualizar atendimento"));
    } finally {
      setSalvando(false);
    }
  }

  if (!podeEditar || evento.status === "CANCELADO") return null;

  return (
    <FormDialog
      open={aberto}
      onOpenChange={setAberto}
      title="Editar atendimento"
      trigger={
        <Button variant="outline" size="sm">
          <Pencil size={14} className="mr-2" />
          Editar
        </Button>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700">Título</label>
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
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

        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">Início</label>
            <Input
              type="datetime-local"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Fim</label>
            <Input
              type="datetime-local"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Local</label>
          <Input value={local} onChange={(e) => setLocal(e.target.value)} />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Cliente cadastrado *
          </label>

          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Selecionar cliente</option>

            {clientesResponse?.data.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nome}
              </option>
            ))}
          </select>

          {!clienteId && (
            <p className="mt-1 text-xs text-red-600">
              É obrigatório selecionar um cliente cadastrado.
            </p>
          )}

          <Link
            href="/clientes"
            className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline"
          >
            Cadastrar novo cliente
          </Link>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as AgendaStatusEditavel)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="AGENDADO">Agendado</option>
            <option value="EM_ANDAMENTO">Em andamento</option>
            <option value="CONCLUIDO">Concluído</option>
          </select>
        </div>

        <div className="sticky bottom-0 flex flex-col-reverse gap-3 bg-white pt-4 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => setAberto(false)}
            disabled={salvando}
          >
            Cancelar
          </Button>

          <Button onClick={salvar} disabled={salvando || !clienteId}>
            {salvando ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}
