"use client";

import { useQueryClient } from "@tanstack/react-query";
import { XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/actions/ConfirmDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import {
  PERMISSAO_CONTAS_RECEBER_CANCELAR,
  PERMISSAO_CONTAS_RECEBER_RECEBER,
} from "@/lib/auth";

import {
  cancelarContaReceber,
  contasReceberQueryKeys,
  obterMensagemErroContasReceber,
  ContaReceberDetalhada,
} from "@/services/contas-receber.service";

import { RegistrarRecebimentoModal } from "./RegistrarRecebimentoModal";

type Props = {
  conta: ContaReceberDetalhada;
};

export function ContaReceberAcoes({ conta }: Props) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeReceber = temPermissao(PERMISSAO_CONTAS_RECEBER_RECEBER);
  const podeCancelar = temPermissao(PERMISSAO_CONTAS_RECEBER_CANCELAR);

  async function atualizarConsultas() {
    await queryClient.invalidateQueries({
      queryKey: contasReceberQueryKeys.detalhe(
        empresaEfetivaId ?? "",
        conta.id,
      ),
    });

    await queryClient.invalidateQueries({
      queryKey: contasReceberQueryKeys.listas(empresaEfetivaId ?? ""),
    });

    await queryClient.invalidateQueries({
      queryKey: contasReceberQueryKeys.resumo(empresaEfetivaId ?? ""),
    });

    await queryClient.invalidateQueries({
      queryKey: contasReceberQueryKeys.historico(
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
      await cancelarContaReceber(conta.id);

      toast.success("Conta cancelada com sucesso!");

      await atualizarConsultas();
    } catch (error: unknown) {
      toast.error(
        obterMensagemErroContasReceber(error, "Erro ao cancelar conta"),
      );
    }
  }

  const aceitaRecebimento = [
    "PENDENTE",
    "PARCIALMENTE_RECEBIDA",
    "VENCIDA",
  ].includes(conta.status);

  const aceitaCancelamento =
    conta.status !== "RECEBIDA" &&
    conta.status !== "CANCELADA" &&
    conta.recebimentos.length === 0;

  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-2 lg:flex lg:w-auto lg:flex-wrap [&>*]:w-full md:[&>*]:w-full lg:[&>*]:w-auto">
      {podeReceber && aceitaRecebimento && empresaEfetivaId && !carregando && (
        <RegistrarRecebimentoModal conta={conta} />
      )}

      {podeCancelar &&
        aceitaCancelamento &&
        empresaEfetivaId &&
        !carregando && (
          <ConfirmDialog
            title="Cancelar conta a receber?"
            description="A conta ficará indisponível para novos recebimentos."
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
