"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/forms/FormDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_CAIXA_MOVIMENTACOES_REGISTRAR } from "@/lib/auth";
import { caixasQueryKeys } from "@/lib/caixas-query-keys";
import { obterMensagemErro } from "@/lib/api-error";

import {
  Caixa,
  criarMovimentacaoCaixa,
  TipoMovimentacaoCaixa,
} from "@/services/caixas.service";

type Props = {
  caixa: Caixa;
  tipo: TipoMovimentacaoCaixa;
};

export function NovaMovimentacaoCaixaModal({ caixa, tipo }: Props) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeMovimentar = temPermissao(PERMISSAO_CAIXA_MOVIMENTACOES_REGISTRAR);

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [descricao, setDescricao] = useState("");

  const [valor, setValor] = useState("");
  const [documento, setDocumento] = useState("");

  const [observacao, setObservacao] = useState("");

  const [dataMovimentacao, setDataMovimentacao] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const entrada = tipo === "ENTRADA";

  function limpar() {
    setDescricao("");
    setValor("");
    setDocumento("");
    setObservacao("");

    setDataMovimentacao(new Date().toISOString().slice(0, 10));
  }

  async function salvar() {
    if (!podeMovimentar || !empresaEfetivaId || carregando) {
      toast.error("Você não possui permissão para esta ação.");
      return;
    }
    if (descricao.trim().length < 2) {
      toast.error("Informe a descrição da movimentação.");
      return;
    }

    if (Number(valor) <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }

    try {
      setSalvando(true);

      await criarMovimentacaoCaixa(caixa.id, {
        tipo,
        origem: "MANUAL",
        descricao: descricao.trim(),
        valor: Number(valor),

        documento: documento.trim() || undefined,

        observacao: observacao.trim() || undefined,

        dataMovimentacao: dataMovimentacao || undefined,
      });

      toast.success(
        entrada
          ? "Entrada registrada com sucesso!"
          : "Saída registrada com sucesso!",
      );

      limpar();
      setAberto(false);

      await queryClient.invalidateQueries({
        queryKey: caixasQueryKeys.detalhe(empresaEfetivaId, caixa.id),
      });

      await queryClient.invalidateQueries({
        queryKey: caixasQueryKeys.listas(empresaEfetivaId),
      });
      await queryClient.invalidateQueries({
        queryKey: caixasQueryKeys.resumo(empresaEfetivaId),
      });
      await queryClient.invalidateQueries({
        queryKey: caixasQueryKeys.aberturaAtual(empresaEfetivaId, caixa.id),
      });

      await queryClient.invalidateQueries({
        queryKey: caixasQueryKeys.movimentacoes(empresaEfetivaId),
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao registrar movimentação"));
    } finally {
      setSalvando(false);
    }
  }

  if (!podeMovimentar || !empresaEfetivaId || carregando) return null;

  return (
    <FormDialog
      open={aberto}
      onOpenChange={setAberto}
      title={entrada ? "Registrar entrada" : "Registrar saída"}
      trigger={
        <Button variant={entrada ? "default" : "outline"}>
          {entrada ? (
            <ArrowUpCircle size={16} className="mr-2" />
          ) : (
            <ArrowDownCircle size={16} className="mr-2" />
          )}

          {entrada ? "Entrada" : "Saída"}
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Saldo atual
          </p>

          <p className="mt-1 text-xl font-bold text-slate-900">
            {formatarMoeda(caixa.saldoAtual)}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Descrição *
          </label>

          <Input
            value={descricao}
            onChange={(event) => setDescricao(event.target.value)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">
              Valor *
            </label>

            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={valor}
              onChange={(event) => setValor(event.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Data</label>

            <Input
              type="date"
              value={dataMovimentacao}
              onChange={(event) => setDataMovimentacao(event.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Documento
          </label>

          <Input
            value={documento}
            onChange={(event) => setDocumento(event.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Observação
          </label>

          <Textarea
            value={observacao}
            onChange={(event) => setObservacao(event.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 border-t pt-5">
          <Button
            variant="outline"
            onClick={() => setAberto(false)}
            disabled={salvando}
          >
            Cancelar
          </Button>

          <Button onClick={salvar} disabled={salvando}>
            {salvando ? "Registrando..." : "Confirmar"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}

function formatarMoeda(valor: string | number) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
