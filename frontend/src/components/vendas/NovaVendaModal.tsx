"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/forms/FormDialog";

import { VendaForm, VendaFormPayload } from "@/components/vendas/VendaForm";

import { criarVenda } from "@/services/vendas.service";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_VENDAS_CRIAR } from "@/lib/auth";
import { obterMensagemErro } from "@/lib/api-error";
import { vendasQueryKeys } from "@/lib/vendas-query-keys";

export function NovaVendaModal() {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeCriar = temPermissao(PERMISSAO_VENDAS_CRIAR);

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [formularioKey, setFormularioKey] = useState(0);

  function fecharModal() {
    if (salvando) {
      return;
    }

    setAberto(false);
  }

  function limparFormulario() {
    setFormularioKey((valorAtual) => valorAtual + 1);
  }

  async function salvar(dados: VendaFormPayload) {
    if (!podeCriar || !empresaEfetivaId || carregando) return;
    try {
      setSalvando(true);

      await criarVenda(dados);

      toast.success("Venda criada com sucesso!");

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: vendasQueryKeys.listas(empresaEfetivaId),
        }),

        queryClient.invalidateQueries({
          queryKey: vendasQueryKeys.dashboards(empresaEfetivaId),
        }),
      ]);

      limparFormulario();
      setAberto(false);
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao criar venda."));
    } finally {
      setSalvando(false);
    }
  }

  if (!podeCriar || !empresaEfetivaId || carregando) return null;

  return (
    <FormDialog
      open={aberto}
      onOpenChange={(novoEstado) => {
        if (salvando) {
          return;
        }

        setAberto(novoEstado);

        if (!novoEstado) {
          limparFormulario();
        }
      }}
      title="Nova venda"
      trigger={
        <Button>
          <Plus size={16} className="mr-2" />
          Nova venda
        </Button>
      }
    >
      <VendaForm
        ativo={aberto}
        key={formularioKey}
        salvando={salvando}
        textoBotao="Criar venda"
        onSubmit={salvar}
        onCancelar={fecharModal}
      />
    </FormDialog>
  );
}
