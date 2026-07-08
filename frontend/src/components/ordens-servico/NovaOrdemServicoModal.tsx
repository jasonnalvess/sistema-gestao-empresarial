"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/forms/FormDialog";

import { listarClientes } from "@/services/clientes.service";
import { criarOrdemServico } from "@/services/ordens-servico.service";

export function NovaOrdemServicoModal() {
  const queryClient = useQueryClient();

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [prioridade, setPrioridade] = useState<
    "BAIXA" | "NORMAL" | "ALTA" | "URGENTE"
  >("NORMAL");
  const [dataPrevista, setDataPrevista] = useState("");
  const [observacao, setObservacao] = useState("");

  const { data: clientesResponse } = useQuery({
    queryKey: ["clientes-select"],
    queryFn: () =>
      listarClientes({
        page: 1,
        limit: 100,
      }),
  });

  async function salvar() {
    if (!clienteId) {
      toast.error("Selecione um cliente cadastrado antes de criar a OS.");
      return;
    }

    try {
      setSalvando(true);

      await criarOrdemServico({
        titulo,
        descricao: descricao || undefined,
        clienteId,
        prioridade,
        dataPrevista: dataPrevista
          ? new Date(dataPrevista).toISOString()
          : undefined,
        observacao: observacao || undefined,
      });

      toast.success("Ordem de serviço criada com sucesso!");

      setTitulo("");
      setDescricao("");
      setClienteId("");
      setPrioridade("NORMAL");
      setDataPrevista("");
      setObservacao("");
      setAberto(false);

      queryClient.invalidateQueries({
        queryKey: ["ordens-servico"],
      });
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Erro ao criar ordem de serviço"
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <FormDialog
      open={aberto}
      onOpenChange={setAberto}
      title="Nova ordem de serviço"
      trigger={
        <Button>
          <Plus size={16} className="mr-2" />
          Nova OS
        </Button>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700">
            Cliente *
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
          <label className="text-sm font-medium text-slate-700">Título</label>
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Descrição do serviço
          </label>
          <Textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">
              Prioridade
            </label>

            <select
              value={prioridade}
              onChange={(e) =>
                setPrioridade(
                  e.target.value as "BAIXA" | "NORMAL" | "ALTA" | "URGENTE"
                )
              }
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="BAIXA">Baixa</option>
              <option value="NORMAL">Normal</option>
              <option value="ALTA">Alta</option>
              <option value="URGENTE">Urgente</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Data prevista
            </label>
            <Input
              type="datetime-local"
              value={dataPrevista}
              onChange={(e) => setDataPrevista(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Observação interna
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

          <Button onClick={salvar} disabled={salvando || !clienteId || !titulo}>
            {salvando ? "Salvando..." : "Salvar OS"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}
