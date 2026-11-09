"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { FormDialog } from "@/components/forms/FormDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_VENDAS_EDITAR } from "@/lib/auth";
import { obterMensagemErro } from "@/lib/api-error";
import { vendasQueryKeys } from "@/lib/vendas-query-keys";

import {
  buscarVenda,
  atualizarVenda,
  VendaDetalhada,
} from "@/services/vendas.service";

import { VendaForm, VendaFormPayload, VendaFormInitialData } from "./VendaForm";

type Props = {
  vendaId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditarVendaModal({ vendaId, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeEditar = temPermissao(PERMISSAO_VENDAS_EDITAR);

  const [salvando, setSalvando] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: vendasQueryKeys.detalhe(empresaEfetivaId ?? "", vendaId),
    queryFn: () => buscarVenda(vendaId),
    enabled: open && Boolean(empresaEfetivaId) && !carregando && podeEditar,
  });

  const venda: VendaDetalhada | undefined = data;

  const initialData = useMemo<VendaFormInitialData | undefined>(() => {
    if (!venda) return undefined;

    return {
      clienteId: venda.cliente?.id ?? "",
      depositoId: venda.deposito?.id ?? "",

      dataVenda: venda.dataVenda,

      condicaoPagamento: venda.condicaoPagamento,
      formaPagamento: venda.formaPagamento,

      quantidadeParcelas: 1,
      intervaloParcelas: 30,
      primeiroVencimento: undefined,

      valorDesconto: Number(venda.valorDesconto ?? 0),
      valorFrete: Number(venda.valorFrete ?? 0),
      valorOutros: Number(venda.valorOutros ?? 0),

      observacao: venda.observacao ?? "",
      observacaoInterna: venda.observacaoInterna ?? "",

      itens: venda.itens.map((item) => ({
        produtoId: item.produtoId,
        quantidade: Number(item.quantidade),
        valorUnitario: Number(item.valorUnitario),
        valorDesconto: Number(item.valorDesconto ?? 0),
        observacao: item.observacao ?? "",
      })),
    };
  }, [venda]);

  async function salvar(dados: VendaFormPayload) {
    if (!podeEditar || !empresaEfetivaId || carregando) {
      toast.error("Você não possui permissão para editar esta venda.");
      return;
    }
    try {
      setSalvando(true);

      await atualizarVenda(vendaId, dados);

      toast.success("Venda atualizada com sucesso.");

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: vendasQueryKeys.listas(empresaEfetivaId),
        }),

        queryClient.invalidateQueries({
          queryKey: vendasQueryKeys.detalhe(empresaEfetivaId, vendaId),
        }),

        queryClient.invalidateQueries({
          queryKey: vendasQueryKeys.dashboards(empresaEfetivaId),
        }),
        queryClient.invalidateQueries({
          queryKey: vendasQueryKeys.historico(empresaEfetivaId, vendaId),
        }),
      ]);

      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao atualizar venda."));
    } finally {
      setSalvando(false);
    }
  }

  if (!podeEditar || !empresaEfetivaId || carregando) return null;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Editar venda"
      trigger={<span className="hidden" />}
    >
      {isLoading || !initialData ? (
        <div className="py-10 text-center">Carregando...</div>
      ) : (
        <VendaForm
          ativo={open}
          initialData={initialData}
          textoBotao="Salvar alterações"
          salvando={salvando}
          onCancelar={() => onOpenChange(false)}
          onSubmit={salvar}
        />
      )}
    </FormDialog>
  );
}
