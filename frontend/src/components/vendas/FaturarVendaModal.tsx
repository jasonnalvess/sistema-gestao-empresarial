"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/forms/FormDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_VENDAS_FATURAR } from "@/lib/auth";
import { obterMensagemErro } from "@/lib/api-error";
import { dashboardQueryKeys } from "@/lib/dashboard-query-keys";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";
import { financeiroQueryKeys } from "@/lib/financeiro-query-keys";
import { vendasQueryKeys } from "@/lib/vendas-query-keys";
import { contasReceberQueryKeys } from "@/services/contas-receber.service";

import { faturarVenda } from "@/services/vendas.service";

type Props = {
  vendaId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FaturarVendaModal({ vendaId, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeFaturar = temPermissao(PERMISSAO_VENDAS_FATURAR);

  const [processando, setProcessando] = useState(false);

  async function confirmar() {
    if (!podeFaturar || !empresaEfetivaId || carregando) {
      toast.error("Você não possui permissão para faturar esta venda.");
      return;
    }
    try {
      setProcessando(true);

      await faturarVenda(vendaId, {});

      toast.success("Venda faturada com sucesso.");

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: vendasQueryKeys.listas(empresaEfetivaId),
        }),

        queryClient.invalidateQueries({
          queryKey: vendasQueryKeys.dashboards(empresaEfetivaId),
        }),

        queryClient.invalidateQueries({
          queryKey: vendasQueryKeys.detalhe(empresaEfetivaId, vendaId),
        }),
        queryClient.invalidateQueries({
          queryKey: vendasQueryKeys.historico(empresaEfetivaId, vendaId),
        }),
        queryClient.invalidateQueries({
          queryKey: estoqueQueryKeys.estoque(empresaEfetivaId),
        }),
        queryClient.invalidateQueries({
          queryKey: estoqueQueryKeys.movimentacoes(empresaEfetivaId),
        }),
        queryClient.invalidateQueries({
          queryKey: estoqueQueryKeys.produtosDetalhes(empresaEfetivaId),
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardQueryKeys.root(empresaEfetivaId),
        }),
        queryClient.invalidateQueries({
          queryKey: contasReceberQueryKeys.listas(empresaEfetivaId),
        }),
        queryClient.invalidateQueries({
          queryKey: contasReceberQueryKeys.resumo(empresaEfetivaId),
        }),
        queryClient.invalidateQueries({
          queryKey: financeiroQueryKeys.raiz(empresaEfetivaId),
        }),
      ]);

      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao faturar venda."));
    } finally {
      setProcessando(false);
    }
  }

  if (!podeFaturar || !empresaEfetivaId || carregando) return null;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Faturar venda"
      trigger={<span className="hidden" />}
    >
      <div className="space-y-6">
        <div>
          <p className="text-sm text-slate-600">
            Deseja realmente faturar esta venda?
          </p>

          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
            <p className="text-sm text-amber-900">Ao faturar:</p>

            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">
              <li>o estoque será baixado;</li>
              <li>as contas a receber serão geradas;</li>
              <li>a venda passará para o status FATURADA;</li>
              <li>a operação não poderá ser desfeita sem cancelamento.</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-5">
          <Button
            variant="outline"
            disabled={processando}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>

          <Button disabled={processando} onClick={confirmar}>
            {processando ? "Faturando..." : "Confirmar faturamento"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}
