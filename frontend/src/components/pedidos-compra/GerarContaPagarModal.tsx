"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { WalletCards } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/forms/FormDialog";

import { PedidoCompraDetalhado } from "@/services/pedidos-compra.service";
import { gerarContaPorPedido } from "@/services/contas-pagar.service";

type Props = {
  pedido: PedidoCompraDetalhado;
};

export function GerarContaPagarModal({
  pedido,
}: Props) {
  const queryClient = useQueryClient();

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [dataVencimento, setDataVencimento] =
    useState("");

  const [dataCompetencia, setDataCompetencia] =
    useState(
      new Date().toISOString().slice(0, 7) +
        "-01"
    );

  const [documento, setDocumento] = useState("");
  const [observacao, setObservacao] = useState("");

  async function salvar() {
    if (!dataVencimento) {
      toast.error(
        "Informe a data de vencimento."
      );
      return;
    }

    try {
      setSalvando(true);

      await gerarContaPorPedido(
        pedido.id,
        {
          dataVencimento,

          dataCompetencia:
            dataCompetencia || undefined,

          documento:
            documento.trim() || undefined,

          observacao:
            observacao.trim() || undefined,
        }
      );

      toast.success(
        "Conta a pagar gerada com sucesso!"
      );

      setAberto(false);

      await queryClient.invalidateQueries({
        queryKey: ["contas-pagar"],
      });
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          "Erro ao gerar conta a pagar"
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <FormDialog
      open={aberto}
      onOpenChange={setAberto}
      title={`Gerar conta do pedido #${String(
        pedido.numero
      ).padStart(5, "0")}`}
      trigger={
        <Button variant="outline">
          <WalletCards
            size={16}
            className="mr-2"
          />
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
            {formatarMoeda(
              pedido.valorTotal
            )}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">
              Vencimento *
            </label>

            <Input
              type="date"
              value={dataVencimento}
              onChange={(event) =>
                setDataVencimento(
                  event.target.value
                )
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              Competência
            </label>

            <Input
              type="date"
              value={dataCompetencia}
              onChange={(event) =>
                setDataCompetencia(
                  event.target.value
                )
              }
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium">
              Documento
            </label>

            <Input
              value={documento}
              onChange={(event) =>
                setDocumento(
                  event.target.value
                )
              }
              placeholder={`PEDIDO-COMPRA-${pedido.numero}`}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">
            Observação
          </label>

          <Textarea
            value={observacao}
            onChange={(event) =>
              setObservacao(
                event.target.value
              )
            }
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

          <Button
            onClick={salvar}
            disabled={salvando}
          >
            {salvando
              ? "Gerando..."
              : "Gerar conta"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}

function formatarMoeda(
  valor: string | number
) {
  return Number(valor).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );
}
