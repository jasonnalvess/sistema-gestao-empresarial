"use client";

import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Send, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_PEDIDOS_COMPRA_EDITAR } from "@/lib/auth";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/actions/ConfirmDialog";
import { ReceberPedidoCompraModal } from "./ReceberPedidoCompraModal";
import { EditarPedidoCompraModal } from "./EditarPedidoCompraModal";
import { GerarContaPagarModal } from "./GerarContaPagarModal";

import {
  aprovarPedido,
  cancelarPedido,
  enviarParaAprovacao,
  PedidoCompraDetalhado,
  pedidosCompraQueryKeys,
  obterMensagemErroPedidoCompra,
} from "@/services/pedidos-compra.service";

type Props = {
  pedido: PedidoCompraDetalhado;
};

export function PedidoCompraAcoes({ pedido }: Props) {
  const queryClient = useQueryClient();
  const { usuario, temPermissao } = useAuth();
  const { empresaEfetivaId } = useEmpresaSelecionada();
  const podeEditarPedido = temPermissao(PERMISSAO_PEDIDOS_COMPRA_EDITAR);
  const podeAprovarPedido =
    podeEditarPedido &&
    Boolean(usuario && ["SUPER_ADMIN", "ADMIN_EMPRESA"].includes(usuario.tipo));

  async function atualizarConsultas() {
    if (!empresaEfetivaId) return;

    await queryClient.invalidateQueries({
      queryKey: pedidosCompraQueryKeys.detalhe(empresaEfetivaId, pedido.id),
    });

    await queryClient.invalidateQueries({
      queryKey: pedidosCompraQueryKeys.listas(empresaEfetivaId),
    });

    await queryClient.invalidateQueries({
      queryKey: pedidosCompraQueryKeys.historico(empresaEfetivaId, pedido.id),
    });
  }

  function podeMutar(aprovacao = false) {
    const autorizado = aprovacao ? podeAprovarPedido : podeEditarPedido;
    if (!autorizado || !empresaEfetivaId) {
      toast.error("Você não possui permissão para esta ação.");
      return false;
    }
    return true;
  }

  async function enviar() {
    if (!podeMutar()) return;
    try {
      await enviarParaAprovacao(pedido.id);
      toast.success("Pedido enviado para aprovação!");
      await atualizarConsultas();
    } catch (error: unknown) {
      toast.error(
        obterMensagemErroPedidoCompra(
          error,
          "Erro ao enviar pedido para aprovação",
        ),
      );
    }
  }

  async function aprovar() {
    if (!podeMutar(true)) return;
    try {
      await aprovarPedido(pedido.id);
      toast.success("Pedido aprovado com sucesso!");
      await atualizarConsultas();
    } catch (error: unknown) {
      toast.error(
        obterMensagemErroPedidoCompra(error, "Erro ao aprovar pedido"),
      );
    }
  }

  async function cancelar() {
    if (!podeMutar()) return;
    try {
      await cancelarPedido(pedido.id);
      toast.success("Pedido cancelado com sucesso!");
      await atualizarConsultas();
    } catch (error: unknown) {
      toast.error(
        obterMensagemErroPedidoCompra(error, "Erro ao cancelar pedido"),
      );
    }
  }

  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-2 lg:flex lg:w-auto lg:flex-wrap [&>*]:w-full md:[&>*]:w-full lg:[&>*]:w-auto">
      {podeEditarPedido && empresaEfetivaId && pedido.status === "RASCUNHO" && (
        <EditarPedidoCompraModal pedido={pedido} />
      )}

      {podeEditarPedido && empresaEfetivaId && pedido.status === "RASCUNHO" && (
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

      {podeAprovarPedido &&
        empresaEfetivaId &&
        pedido.status === "PENDENTE_APROVACAO" && (
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

      {podeEditarPedido &&
        empresaEfetivaId &&
        ["APROVADO", "PARCIALMENTE_RECEBIDO"].includes(pedido.status) && (
          <ReceberPedidoCompraModal pedido={pedido} />
        )}

      {pedido.status === "RECEBIDO" && <GerarContaPagarModal pedido={pedido} />}

      {podeEditarPedido &&
        empresaEfetivaId &&
        ["RASCUNHO", "PENDENTE_APROVACAO", "APROVADO"].includes(
          pedido.status,
        ) && (
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
