"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Send,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/actions/ConfirmDialog";
import { ReceberPedidoCompraModal } from "./ReceberPedidoCompraModal";
import { EditarPedidoCompraModal } from "./EditarPedidoCompraModal";

import {
  aprovarPedido,
  cancelarPedido,
  enviarParaAprovacao,
  PedidoCompraDetalhado,
} from "@/services/pedidos-compra.service";

type Props = {
  pedido: PedidoCompraDetalhado;
};

export function PedidoCompraAcoes({ pedido }: Props) {
  const queryClient = useQueryClient();

  async function atualizarConsultas() {
    await queryClient.invalidateQueries({
      queryKey: ["pedido-compra", pedido.id],
    });

    await queryClient.invalidateQueries({
      queryKey: ["pedidos-compra"],
    });
  }

  async function enviar() {
    try {
      await enviarParaAprovacao(pedido.id);
      toast.success("Pedido enviado para aprovação!");
      await atualizarConsultas();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          "Erro ao enviar pedido para aprovação"
      );
    }
  }

  async function aprovar() {
    try {
      await aprovarPedido(pedido.id);
      toast.success("Pedido aprovado com sucesso!");
      await atualizarConsultas();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          "Erro ao aprovar pedido"
      );
    }
  }

  async function cancelar() {
    try {
      await cancelarPedido(pedido.id);
      toast.success("Pedido cancelado com sucesso!");
      await atualizarConsultas();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          "Erro ao cancelar pedido"
      );
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {pedido.status === "RASCUNHO" && (
        <EditarPedidoCompraModal pedido={pedido} />
      )}

      {pedido.status === "RASCUNHO" && (
        <ConfirmDialog
          title="Enviar pedido para aprovação?"
          description="Após o envio, o pedido não poderá mais ser editado."
          onConfirm={enviar}
          trigger={
            <Button>
              <Send size={16} className="mr-2" />
              Enviar para aprovação
            </Button>
          }
        />
      )}

      {pedido.status === "PENDENTE_APROVACAO" && (
        <ConfirmDialog
          title="Aprovar pedido de compra?"
          description="O pedido ficará disponível para recebimento."
          onConfirm={aprovar}
          trigger={
            <Button>
              <CheckCircle2 size={16} className="mr-2" />
              Aprovar pedido
            </Button>
          }
        />
      )}

      {[
        "APROVADO",
        "PARCIALMENTE_RECEBIDO",
      ].includes(pedido.status) && (
        <ReceberPedidoCompraModal pedido={pedido} />
      )}

      {[
        "RASCUNHO",
        "PENDENTE_APROVACAO",
        "APROVADO",
      ].includes(pedido.status) && (
        <ConfirmDialog
          title="Cancelar pedido de compra?"
          description="Os itens do pedido também serão cancelados."
          onConfirm={cancelar}
          trigger={
            <Button variant="destructive">
              <XCircle size={16} className="mr-2" />
              Cancelar
            </Button>
          }
        />
      )}
    </div>
  );
}
