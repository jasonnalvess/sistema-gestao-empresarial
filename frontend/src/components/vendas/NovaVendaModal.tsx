"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/forms/FormDialog";

import {
  VendaForm,
  VendaFormPayload,
} from "@/components/vendas/VendaForm";

import { criarVenda } from "@/services/vendas.service";

export function NovaVendaModal() {
  const queryClient = useQueryClient();

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
    try {
      setSalvando(true);

      await criarVenda(dados);

      toast.success("Venda criada com sucesso!");

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["vendas"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["dashboard-vendas"],
        }),
      ]);

      limparFormulario();
      setAberto(false);
    } catch (error: any) {
      const mensagem = error.response?.data?.message;

      toast.error(
        Array.isArray(mensagem)
          ? mensagem.join(", ")
          : mensagem || "Erro ao criar venda."
      );
    } finally {
      setSalvando(false);
    }
  }

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
        key={formularioKey}
        salvando={salvando}
        textoBotao="Criar venda"
        onSubmit={salvar}
        onCancelar={fecharModal}
      />
    </FormDialog>
  );
}