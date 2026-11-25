"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LockKeyholeOpen } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/forms/FormDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_CAIXA_ABRIR } from "@/lib/auth";
import { caixasQueryKeys } from "@/lib/caixas-query-keys";
import { obterMensagemErro } from "@/lib/api-error";

import { abrirCaixa, Caixa } from "@/services/caixas.service";

type Props = {
  caixa: Caixa;
};

export function AbrirCaixaModal({ caixa }: Props) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeAbrir = temPermissao(PERMISSAO_CAIXA_ABRIR);

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [saldoInicial, setSaldoInicial] = useState(
    Number(caixa.saldoAtual).toFixed(2),
  );

  const [observacao, setObservacao] = useState("");

  async function salvar() {
    if (!podeAbrir || !empresaEfetivaId || carregando) {
      toast.error("Você não possui permissão para esta ação.");
      return;
    }
    const saldo = Number(saldoInicial);

    if (saldo < 0) {
      toast.error("O saldo inicial não pode ser negativo.");
      return;
    }

    try {
      setSalvando(true);

      await abrirCaixa(caixa.id, {
        saldoInicial: saldo,

        observacao: observacao.trim() || undefined,
      });

      toast.success("Caixa aberto com sucesso!");

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
        queryKey: caixasQueryKeys.movimentacoes(empresaEfetivaId),
      });
      await queryClient.invalidateQueries({
        queryKey: caixasQueryKeys.aberturaAtual(empresaEfetivaId, caixa.id),
      });
      await queryClient.invalidateQueries({
        queryKey: caixasQueryKeys.aberturas(empresaEfetivaId, caixa.id),
      });

      await queryClient.invalidateQueries({
        queryKey: caixasQueryKeys.abertosPagamento(empresaEfetivaId),
      });

      await queryClient.invalidateQueries({
        queryKey: caixasQueryKeys.abertosRecebimento(empresaEfetivaId),
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao abrir caixa"));
    } finally {
      setSalvando(false);
    }
  }

  if (!podeAbrir || !empresaEfetivaId || carregando) return null;

  return (
    <FormDialog
      open={aberto}
      onOpenChange={setAberto}
      title={`Abrir ${caixa.nome}`}
      trigger={
        <Button>
          <LockKeyholeOpen size={16} className="mr-2" />
          Abrir caixa
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Último saldo registrado
          </p>

          <p className="mt-1 text-xl font-bold text-slate-900">
            {formatarMoeda(caixa.saldoAtual)}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Saldo inicial *
          </label>

          <Input
            type="number"
            min="0"
            step="0.01"
            value={saldoInicial}
            onChange={(event) => setSaldoInicial(event.target.value)}
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

          <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t bg-white pt-5 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => setAberto(false)}
            disabled={salvando}
          >
            Cancelar
          </Button>

          <Button onClick={salvar} disabled={salvando}>
            {salvando ? "Abrindo..." : "Confirmar abertura"}
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
