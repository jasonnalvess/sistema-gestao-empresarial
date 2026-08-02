"use client";

import { useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/forms/FormDialog";

import { criarAgendaEvento } from "@/services/agenda.service";
import { listarClientes } from "@/services/clientes.service";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { agendaQueryKeys } from "@/lib/agenda-query-keys";
import { obterMensagemErro } from "@/lib/api-error";
import {
  PERMISSAO_AGENDA_CRIAR,
  PERMISSAO_CLIENTES_VISUALIZAR,
} from "@/lib/auth";

export function NovoEventoModal() {
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeCriar = temPermissao(PERMISSAO_AGENDA_CRIAR);
  const podeVisualizarClientes = temPermissao(PERMISSAO_CLIENTES_VISUALIZAR);
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const clienteIdUrl = searchParams.get("clienteId");

  const [aberto, setAberto] = useState(Boolean(clienteIdUrl));
  const [salvando, setSalvando] = useState(false);

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [local, setLocal] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const [clienteContato, setClienteContato] = useState("");
  const [clienteId, setClienteId] = useState(clienteIdUrl ?? "");

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
      podeCriar &&
      podeVisualizarClientes,
  });

  async function salvar() {
    if (!podeCriar) {
      toast.error("Você não possui permissão para esta ação.");
      return;
    }
    if (carregando || !empresaEfetivaId) return;
    if (!clienteId) {
      toast.error(
        "Selecione um cliente cadastrado antes de criar o atendimento.",
      );
      return;
    }

    try {
      setSalvando(true);

      await criarAgendaEvento({
        titulo,
        descricao: descricao || undefined,
        dataInicio: new Date(dataInicio).toISOString(),
        dataFim: new Date(dataFim).toISOString(),
        local: local || undefined,
        clienteNome: clienteNome || undefined,
        clienteContato: clienteContato || undefined,
        clienteId: clienteId || undefined,
      });

      toast.success("Atendimento criado com sucesso!");

      setTitulo("");
      setDescricao("");
      setDataInicio("");
      setDataFim("");
      setLocal("");
      setClienteNome("");
      setClienteContato("");
      setClienteId("");
      setAberto(false);

      queryClient.invalidateQueries({
        queryKey: agendaQueryKeys.listas(empresaEfetivaId),
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao criar atendimento"));
    } finally {
      setSalvando(false);
    }
  }

  if (!podeCriar) return null;

  return (
    <FormDialog
      open={aberto}
      onOpenChange={setAberto}
      title="Novo atendimento"
      trigger={
        <Button>
          <Plus size={16} className="mr-2" />
          Novo atendimento
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

        <div className="grid gap-4 md:grid-cols-2">
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
            Cliente cadastrado
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
          <label className="text-sm font-medium text-slate-700">
            Nome do cliente
          </label>
          <Input
            value={clienteNome}
            onChange={(e) => setClienteNome(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Contato do cliente
          </label>
          <Input
            value={clienteContato}
            onChange={(e) => setClienteContato(e.target.value)}
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

          <Button onClick={salvar} disabled={salvando || !clienteId}>
            {salvando ? "Salvando..." : "Salvar atendimento"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}
