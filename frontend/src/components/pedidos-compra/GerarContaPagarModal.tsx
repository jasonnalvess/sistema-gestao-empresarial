"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { WalletCards } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/forms/FormDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import {
  PERMISSAO_CONTAS_PAGAR_CRIAR,
  PERMISSAO_PEDIDOS_COMPRA_VISUALIZAR,
} from "@/lib/auth";

import {
  PedidoCompraDetalhado,
  pedidosCompraQueryKeys,
} from "@/services/pedidos-compra.service";
import {
  contasPagarQueryKeys,
  gerarContaPorPedido,
  obterMensagemErroContasPagar,
} from "@/services/contas-pagar.service";

type Props = {
  pedido: PedidoCompraDetalhado;
};

export function GerarContaPagarModal({ pedido }: Props) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeVisualizarPedido = temPermissao(
    PERMISSAO_PEDIDOS_COMPRA_VISUALIZAR,
  );
  const podeCriarConta = temPermissao(PERMISSAO_CONTAS_PAGAR_CRIAR);

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [dataVencimento, setDataVencimento] = useState("");

  const [dataCompetencia, setDataCompetencia] = useState(
    new Date().toISOString().slice(0, 7) + "-01",
  );

  const [documento, setDocumento] = useState("");
  const [observacao, setObservacao] = useState("");

  async function salvar() {
    if (
      !podeVisualizarPedido ||
      !podeCriarConta ||
      !empresaEfetivaId ||
      carregando
    ) {
      toast.error("Você não possui permissão para esta ação.");
      return;
    }
    if (!dataVencimento) {
      toast.error("Informe a data de vencimento.");
      return;
    }

    try {
      setSalvando(true);

      await gerarContaPorPedido(pedido.id, {
        dataVencimento,

        dataCompetencia: dataCompetencia || undefined,

        documento: documento.trim() || undefined,

        observacao: observacao.trim() || undefined,
      });

      toast.success("Conta a pagar gerada com sucesso!");

      setAberto(false);

      await queryClient.invalidateQueries({
        queryKey: contasPagarQueryKeys.listas(empresaEfetivaId),
      });
      await queryClient.invalidateQueries({
        queryKey: contasPagarQueryKeys.resumo(empresaEfetivaId),
      });
      await queryClient.invalidateQueries({
        queryKey: pedidosCompraQueryKeys.detalhe(empresaEfetivaId, pedido.id),
      });
    } catch (error: unknown) {
      toast.error(
        obterMensagemErroContasPagar(error, "Erro ao gerar conta a pagar"),
      );
    } finally {
      setSalvando(false);
    }
  }

  if (
    !podeVisualizarPedido ||
    !podeCriarConta ||
    !empresaEfetivaId ||
    carregando
  ) {
    return null;
  }

  return (
    <FormDialog
      open={aberto}
      onOpenChange={setAberto}
      title={`Gerar conta do pedido #${String(pedido.numero).padStart(5, "0")}`}
      trigger={
        <Button variant="outline">
          <WalletCards size={16} className="mr-2" />
          Gerar conta a pagar
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Valor do pedido
          </p>

          <p className="mt-1 text-xl font-bold">
            {formatarMoeda(pedido.valorTotal)}
          </p>
        </div>

          <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Vencimento *</label>

            <Input
              type="date"
              value={dataVencimento}
              onChange={(event) => setDataVencimento(event.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Competência</label>

            <Input
              type="date"
              value={dataCompetencia}
              onChange={(event) => setDataCompetencia(event.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium">Documento</label>

            <Input
              value={documento}
              onChange={(event) => setDocumento(event.target.value)}
              placeholder={`PEDIDO-COMPRA-${pedido.numero}`}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Observação</label>

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
            {salvando ? "Gerando..." : "Gerar conta"}
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
