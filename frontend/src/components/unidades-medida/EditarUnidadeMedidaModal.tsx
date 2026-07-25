"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormDialog } from "@/components/forms/FormDialog";

import {
  atualizarUnidadeMedida,
  UnidadeMedida,
} from "@/services/unidades-medida.service";

type Props = {
  unidade: UnidadeMedida;
};

export function EditarUnidadeMedidaModal({ unidade }: Props) {
  const queryClient = useQueryClient();

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState(unidade.nome);
  const [sigla, setSigla] = useState(unidade.sigla);

  async function salvar() {
    try {
      setSalvando(true);

      await atualizarUnidadeMedida(unidade.id, {
        nome,
        sigla,
      });

      toast.success("Unidade atualizada com sucesso!");
      setAberto(false);

      queryClient.invalidateQueries({
        queryKey: ["unidades-medida"],
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao atualizar unidade");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <FormDialog
      open={aberto}
      onOpenChange={setAberto}
      title="Editar unidade de medida"
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
          <label className="text-sm font-medium text-slate-700">Sigla</label>
          <Input
            value={sigla}
            onChange={(e) => setSigla(e.target.value.toUpperCase())}
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

          <Button onClick={salvar} disabled={salvando || !nome || !sigla}>
            {salvando ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}
