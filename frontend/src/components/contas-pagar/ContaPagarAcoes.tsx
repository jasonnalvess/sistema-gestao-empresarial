"use client";

import { useQueryClient } from "@tanstack/react-query";
import { XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/actions/ConfirmDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import {
  PERMISSAO_CONTAS_PAGAR_CANCELAR,
  PERMISSAO_CONTAS_PAGAR_PAGAR,
} from "@/lib/auth";

import {
  cancelarContaPagar,
  contasPagarQueryKeys,
  obterMensagemErroContasPagar,
  ContaPagarDetalhada,
} from "@/services/contas-pagar.service";

import { RegistrarPagamentoModal } from "./RegistrarPagamentoModal";

type Props = {
  conta: ContaPagarDetalhada;
};

export function ContaPagarAcoes({ conta }: Props) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podePagar = temPermissao(PERMISSAO_CONTAS_PAGAR_PAGAR);
  const podeCancelar = temPermissao(PERMISSAO_CONTAS_PAGAR_CANCELAR);

  async function atualizarConsultas() {
    await queryClient.invalidateQueries({
      queryKey: contasPagarQueryKeys.detalhe(empresaEfetivaId ?? "", conta.id),
    });

    await queryClient.invalidateQueries({
      queryKey: contasPagarQueryKeys.listas(empresaEfetivaId ?? ""),
    });
    await queryClient.invalidateQueries({
      queryKey: contasPagarQueryKeys.resumo(empresaEfetivaId ?? ""),
    });
    await queryClient.invalidateQueries({
      queryKey: contasPagarQueryKeys.historico(
        empresaEfetivaId ?? "",
        conta.id,
      ),
    });
  }

  async function cancelar() {
    if (!podeCancelar || !empresaEfetivaId || carregando) {
      toast.error("Você não possui permissão para esta ação.");
      return;
    }
    try {
      await cancelarContaPagar(conta.id);

      toast.success("Conta cancelada com sucesso!");

      await atualizarConsultas();
    } catch (error: unknown) {
      toast.error(
        obterMensagemErroContasPagar(error, "Erro ao cancelar conta"),
      );
    }
  }

  const aceitaPagamento = ["PENDENTE", "PARCIALMENTE_PAGA", "VENCIDA"].includes(
    conta.status,
  );

  const aceitaCancelamento =
    conta.status !== "PAGA" &&
    conta.status !== "CANCELADA" &&
    conta.pagamentos.length === 0;

  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-2 lg:flex lg:w-auto lg:flex-wrap [&>*]:w-full md:[&>*]:w-full lg:[&>*]:w-auto">
      {podePagar && aceitaPagamento && empresaEfetivaId && !carregando && (
        <RegistrarPagamentoModal conta={conta} />
      )}

      {podeCancelar &&
        aceitaCancelamento &&
        empresaEfetivaId &&
        !carregando && (
          <ConfirmDialog
            title="Cancelar conta a pagar?"
            description="A conta ficará indisponível para pagamentos."
            onConfirm={cancelar}
            trigger={
              <Button variant="destructive">
                <XCircle size={16} className="mr-2" />
                Cancelar conta
              </Button>
            }
          />
        )}
    </div>
  );
}
