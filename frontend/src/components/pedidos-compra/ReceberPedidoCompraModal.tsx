"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_PEDIDOS_COMPRA_EDITAR } from "@/lib/auth";
import { dashboardQueryKeys } from "@/lib/dashboard-query-keys";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/forms/FormDialog";

import {
  PedidoCompraDetalhado,
  receberPedido,
  pedidosCompraQueryKeys,
  obterMensagemErroPedidoCompra,
} from "@/services/pedidos-compra.service";

type Props = {
  pedido: PedidoCompraDetalhado;
};

type ItemRecebimento = {
  itemId: string;
  quantidadeRecebida: string;
  custoUnitario: string;
};

export function ReceberPedidoCompraModal({ pedido }: Props) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId } = useEmpresaSelecionada();
  const podeEditarPedido = temPermissao(PERMISSAO_PEDIDOS_COMPRA_EDITAR);

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [documentoReferencia, setDocumentoReferencia] = useState("");

  const [observacao, setObservacao] = useState("");

  const itensPendentes = useMemo(
    () =>
      pedido.itens.filter(
        (item) => item.status !== "RECEBIDO" && item.status !== "CANCELADO",
      ),
    [pedido.itens],
  );

  const [itens, setItens] = useState<ItemRecebimento[]>(
    itensPendentes.map((item) => ({
      itemId: item.id,
      quantidadeRecebida: "",
      custoUnitario: item.valorUnitario,
    })),
  );

  function atualizarItem(
    itemId: string,
    campo: "quantidadeRecebida" | "custoUnitario",
    valor: string,
  ) {
    setItens((estadoAtual) =>
      estadoAtual.map((item) =>
        item.itemId === itemId
          ? {
              ...item,
              [campo]: valor,
            }
          : item,
      ),
    );
  }

  function preencherSaldoPendente() {
    setItens(
      itensPendentes.map((item) => ({
        itemId: item.id,
        quantidadeRecebida: String(
          Number(item.quantidadeSolicitada) - Number(item.quantidadeRecebida),
        ),
        custoUnitario: item.valorUnitario,
      })),
    );
  }

  function limparQuantidades() {
    setItens((estadoAtual) =>
      estadoAtual.map((item) => ({
        ...item,
        quantidadeRecebida: "",
      })),
    );
  }

  async function salvar() {
    if (!podeEditarPedido || !empresaEfetivaId) {
      toast.error("Você não possui permissão para esta ação.");
      return;
    }
    const itensSelecionados = itens.filter(
      (item) => Number(item.quantidadeRecebida) > 0,
    );

    if (itensSelecionados.length === 0) {
      toast.error("Informe a quantidade recebida de pelo menos um item.");
      return;
    }

    for (const itemRecebimento of itensSelecionados) {
      const itemPedido = pedido.itens.find(
        (item) => item.id === itemRecebimento.itemId,
      );

      if (!itemPedido) {
        toast.error("Item do pedido não encontrado.");
        return;
      }

      const saldoPendente =
        Number(itemPedido.quantidadeSolicitada) -
        Number(itemPedido.quantidadeRecebida);

      const quantidade = Number(itemRecebimento.quantidadeRecebida);

      if (quantidade <= 0) {
        toast.error(
          `Informe uma quantidade válida para ${itemPedido.produto.nome}.`,
        );
        return;
      }

      if (quantidade > saldoPendente) {
        toast.error(
          `A quantidade de ${itemPedido.produto.nome} excede o saldo pendente de ${formatarQuantidade(
            saldoPendente,
          )}.`,
        );
        return;
      }

      if (Number(itemRecebimento.custoUnitario) < 0) {
        toast.error(`Informe um custo válido para ${itemPedido.produto.nome}.`);
        return;
      }
    }

    try {
      setSalvando(true);

      await receberPedido(pedido.id, {
        documentoReferencia: documentoReferencia.trim() || undefined,

        observacao: observacao.trim() || undefined,

        itens: itensSelecionados.map((item) => ({
          itemId: item.itemId,
          quantidadeRecebida: Number(item.quantidadeRecebida),
          custoUnitario:
            item.custoUnitario !== "" ? Number(item.custoUnitario) : undefined,
        })),
      });

      toast.success("Recebimento registrado com sucesso!");

      setDocumentoReferencia("");
      setObservacao("");
      setAberto(false);

      await queryClient.invalidateQueries({
        queryKey: pedidosCompraQueryKeys.detalhe(empresaEfetivaId, pedido.id),
      });

      await queryClient.invalidateQueries({
        queryKey: pedidosCompraQueryKeys.listas(empresaEfetivaId),
      });

      await queryClient.invalidateQueries({
        queryKey: pedidosCompraQueryKeys.historico(empresaEfetivaId, pedido.id),
      });

      await queryClient.invalidateQueries({
        queryKey: estoqueQueryKeys.estoque(empresaEfetivaId),
      });

      await queryClient.invalidateQueries({
        queryKey: estoqueQueryKeys.movimentacoes(empresaEfetivaId),
      });

      await queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.resumo(empresaEfetivaId),
      });
    } catch (error: unknown) {
      toast.error(
        obterMensagemErroPedidoCompra(error, "Erro ao registrar recebimento"),
      );
    } finally {
      setSalvando(false);
    }
  }

  if (!podeEditarPedido || !empresaEfetivaId) return null;

  return (
    <FormDialog
      open={aberto}
      onOpenChange={setAberto}
      title={`Receber pedido #${String(pedido.numero).padStart(5, "0")}`}
      trigger={
        <Button>
          <PackageCheck size={16} className="mr-2" />
          Receber mercadoria
        </Button>
      }
    >
      <div className="max-h-[78vh] space-y-6 overflow-y-auto pr-2">
        <section className="space-y-4">
          <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Documento de referência
              </label>

              <Input
                value={documentoReferencia}
                onChange={(e) => setDocumentoReferencia(e.target.value)}
                placeholder="Ex.: NF-12345"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Depósito
              </label>

              <div className="mt-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                {pedido.deposito
                  ? `${
                      pedido.deposito.codigo
                        ? `${pedido.deposito.codigo} - `
                        : ""
                    }${pedido.deposito.nome}`
                  : "-"}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4 border-t pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900">Itens pendentes</h3>

              <p className="text-sm text-slate-500">
                Informe somente as quantidades recebidas agora.
              </p>
            </div>

          <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={limparQuantidades}
              >
                Limpar
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={preencherSaldoPendente}
              >
                Receber tudo
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {itensPendentes.map((itemPedido) => {
              const itemFormulario = itens.find(
                (item) => item.itemId === itemPedido.id,
              );

              const quantidadeSolicitada = Number(
                itemPedido.quantidadeSolicitada,
              );

              const quantidadeJaRecebida = Number(
                itemPedido.quantidadeRecebida,
              );

              const saldoPendente = quantidadeSolicitada - quantidadeJaRecebida;

              return (
                <div
                  key={itemPedido.id}
                  className="rounded-lg border border-slate-200 p-4"
                >
                  <div className="mb-4">
                    <p className="font-medium text-slate-900">
                      {itemPedido.produto.nome}
                    </p>

                    <p className="text-xs text-slate-500">
                      {itemPedido.produto.codigo || "Sem código"}
                    </p>
                  </div>

            <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <CampoResumo
                      label="Solicitado"
                      valor={formatarQuantidade(quantidadeSolicitada)}
                    />

                    <CampoResumo
                      label="Já recebido"
                      valor={formatarQuantidade(quantidadeJaRecebida)}
                    />

                    <CampoResumo
                      label="Saldo pendente"
                      valor={formatarQuantidade(saldoPendente)}
                    />

                    <div>
                      <label className="text-sm font-medium text-slate-700">
                        Receber agora
                      </label>

                      <Input
                        type="number"
                        min="0"
                        max={saldoPendente}
                        step="0.01"
                        value={itemFormulario?.quantidadeRecebida ?? ""}
                        onChange={(e) =>
                          atualizarItem(
                            itemPedido.id,
                            "quantidadeRecebida",
                            e.target.value,
                          )
                        }
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700">
                        Custo unitário
                      </label>

                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={itemFormulario?.custoUnitario ?? ""}
                        onChange={(e) =>
                          atualizarItem(
                            itemPedido.id,
                            "custoUnitario",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {itensPendentes.length === 0 && (
              <p className="text-sm text-slate-500">
                Todos os itens deste pedido já foram recebidos.
              </p>
            )}
          </div>
        </section>

        <section className="border-t pt-5">
          <label className="text-sm font-medium text-slate-700">
            Observação do recebimento
          </label>

          <Textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Informe detalhes sobre este recebimento..."
          />
        </section>

          <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t bg-white pt-5 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => setAberto(false)}
            disabled={salvando}
          >
            Cancelar
          </Button>

          <Button
            onClick={salvar}
            disabled={salvando || itensPendentes.length === 0}
          >
            <PackageCheck size={16} className="mr-2" />

            {salvando ? "Registrando..." : "Confirmar recebimento"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}

function CampoResumo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-slate-900">{valor}</p>
    </div>
  );
}

function formatarQuantidade(valor: number) {
  return valor.toLocaleString("pt-BR", {
    maximumFractionDigits: 3,
  });
}
