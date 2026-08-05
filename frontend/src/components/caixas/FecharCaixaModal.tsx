"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LockKeyhole } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/forms/FormDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_CAIXA_FECHAR } from "@/lib/auth";
import { caixasQueryKeys } from "@/lib/caixas-query-keys";
import { obterMensagemErro } from "@/lib/api-error";

import { Caixa, fecharCaixa } from "@/services/caixas.service";

type Props = {
  caixa: Caixa;
};

export function FecharCaixaModal({ caixa }: Props) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeFechar = temPermissao(PERMISSAO_CAIXA_FECHAR);

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [saldoInformado, setSaldoInformado] = useState(
    Number(caixa.saldoAtual).toFixed(2),
  );

  const [observacao, setObservacao] = useState("");

  const diferenca = Number(saldoInformado || 0) - Number(caixa.saldoAtual);

  async function salvar() {
    if (!podeFechar || !empresaEfetivaId || carregando) {
      toast.error("Você não possui permissão para esta ação.");
      return;
    }
    const saldo = Number(saldoInformado);

    if (saldo < 0) {
      toast.error("O saldo informado não pode ser negativo.");
      return;
    }

    try {
      setSalvando(true);

      await fecharCaixa(caixa.id, {
        saldoInformado: saldo,

        observacao: observacao.trim() || undefined,
      });

      toast.success("Caixa fechado com sucesso!");

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
      toast.error(obterMensagemErro(error, "Erro ao fechar caixa"));
    } finally {
      setSalvando(false);
    }
  }

  if (!podeFechar || !empresaEfetivaId || carregando) return null;

  return (
    <FormDialog
      open={aberto}
      onOpenChange={setAberto}
      title={`Fechar ${caixa.nome}`}
      trigger={
        <Button variant="destructive">
          <LockKeyhole size={16} className="mr-2" />
          Fechar caixa
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 rounded-lg bg-slate-50 p-4 md:grid-cols-2">
          <Resumo label="Saldo do sistema" valor={Number(caixa.saldoAtual)} />

          <Resumo label="Diferença" valor={diferenca} destaque />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Saldo contado/informado *
          </label>

          <Input
            type="number"
            min="0"
            step="0.01"
            value={saldoInformado}
            onChange={(event) => setSaldoInformado(event.target.value)}
          />
        </div>

        {Math.abs(diferenca) >= 0.01 && (
          <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
            O fechamento possui diferença de{" "}
            <strong>{formatarMoeda(diferenca)}</strong>.
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-slate-700">
            Observação
          </label>

          <Textarea
            value={observacao}
            onChange={(event) => setObservacao(event.target.value)}
            placeholder="Explique eventuais diferenças no fechamento"
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

          <Button variant="destructive" onClick={salvar} disabled={salvando}>
            {salvando ? "Fechando..." : "Confirmar fechamento"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}

function Resumo({
  label,
  valor,
  destaque = false,
}: {
  label: string;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p
        className={
          destaque
            ? "mt-1 text-xl font-bold text-slate-900"
            : "mt-1 font-semibold text-slate-700"
        }
      >
        {formatarMoeda(valor)}
      </p>
    </div>
  );
}

function formatarMoeda(valor: string | number) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
