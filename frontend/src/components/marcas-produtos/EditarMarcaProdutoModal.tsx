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
  atualizarMarcaProduto,
  MarcaProduto,
} from "@/services/marcas-produtos.service";

type Props = {
  marca: MarcaProduto;
};

export function EditarMarcaProdutoModal({ marca }: Props) {
  const queryClient = useQueryClient();

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState(marca.nome);
  const [descricao, setDescricao] = useState(marca.descricao ?? "");

  async function salvar() {
    try {
      setSalvando(true);

      await atualizarMarcaProduto(marca.id, {
        nome,
        descricao: descricao || undefined,
      });

      toast.success("Marca atualizada com sucesso!");
      setAberto(false);

      queryClient.invalidateQueries({
        queryKey: ["marcas-produtos"],
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao atualizar marca");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <FormDialog
      open={aberto}
      onOpenChange={setAberto}
      title="Editar marca"
      trigger={
        <Button variant="outline" size="sm">
          <Pencil size={14} className="mr-2" />
          Editar
        </Button>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700">Nome</label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} />
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

        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => setAberto(false)}
            disabled={salvando}
          >
            Cancelar
          </Button>

          <Button onClick={salvar} disabled={salvando || !nome}>
            {salvando ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}
