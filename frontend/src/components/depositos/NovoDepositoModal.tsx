"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/forms/FormDialog";

import { criarDeposito } from "@/services/depositos.service";

export function NovoDepositoModal() {
  const queryClient = useQueryClient();

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [endereco, setEndereco] = useState("");

  function limparCampos() {
    setNome("");
    setCodigo("");
    setDescricao("");
    setEndereco("");
  }

  async function salvar() {
    if (!nome.trim()) {
      toast.error("Informe o nome do depósito.");
      return;
    }

    if (!codigo.trim()) {
      toast.error("Informe o código do depósito.");
      return;
    }

    try {
      setSalvando(true);

      await criarDeposito({
        nome: nome.trim(),
        codigo: codigo.trim().toUpperCase(),
        descricao: descricao.trim() || undefined,
        endereco: endereco.trim() || undefined,
      });

      toast.success("Depósito cadastrado com sucesso!");

      limparCampos();
      setAberto(false);

      queryClient.invalidateQueries({
        queryKey: ["depositos"],
      });
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Erro ao cadastrar depósito"
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <FormDialog
      open={aberto}
      onOpenChange={setAberto}
      title="Novo depósito"
      trigger={
        <Button>
          <Plus size={16} className="mr-2" />
          Novo depósito
        </Button>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700">
            Nome *
          </label>

          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Almoxarifado Central"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Código *
          </label>

          <Input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            placeholder="Ex: ALMOX-01"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Descrição
          </label>

          <Textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Endereço ou localização
          </label>

          <Input
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            placeholder="Ex: Galpão 2, setor administrativo"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => setAberto(false)}
            disabled={salvando}
          >
            Cancelar
          </Button>

          <Button
            onClick={salvar}
            disabled={salvando || !nome.trim() || !codigo.trim()}
          >
            {salvando ? "Salvando..." : "Salvar depósito"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}
