"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/forms/FormDialog";

import {
  atualizarDeposito,
  Deposito,
} from "@/services/depositos.service";

type Props = {
  deposito: Deposito;
};

export function EditarDepositoModal({ deposito }: Props) {
  const queryClient = useQueryClient();

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState(deposito.nome);
  const [codigo, setCodigo] = useState(deposito.codigo);
  const [descricao, setDescricao] = useState(deposito.descricao ?? "");
  const [endereco, setEndereco] = useState(deposito.endereco ?? "");

  async function salvar() {
    if (!nome.trim() || !codigo.trim()) {
      toast.error("Nome e código são obrigatórios.");
      return;
    }

    try {
      setSalvando(true);

      await atualizarDeposito(deposito.id, {
        nome: nome.trim(),
        codigo: codigo.trim().toUpperCase(),
        descricao: descricao.trim() || undefined,
        endereco: endereco.trim() || undefined,
      });

      toast.success("Depósito atualizado com sucesso!");
      setAberto(false);

      queryClient.invalidateQueries({
        queryKey: ["depositos"],
      });
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Erro ao atualizar depósito"
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <FormDialog
      open={aberto}
      onOpenChange={setAberto}
      title="Editar depósito"
      trigger={
        <Button variant="outline" size="sm">
          <Pencil size={14} className="mr-2" />
          Editar
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
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Código *
          </label>

          <Input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
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
            {salvando ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}
