"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/forms/FormDialog";
import { criarMarcaProduto } from "@/services/marcas-produtos.service";

export function NovaMarcaProdutoModal() {
  const queryClient = useQueryClient();

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");

  async function salvar() {
    try {
      setSalvando(true);

      await criarMarcaProduto({
        nome,
        descricao: descricao || undefined,
      });

      toast.success("Marca cadastrada com sucesso!");

      setNome("");
      setDescricao("");
      setAberto(false);

      queryClient.invalidateQueries({
        queryKey: ["marcas-produtos"],
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao cadastrar marca");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <FormDialog
      open={aberto}
      onOpenChange={setAberto}
      title="Nova marca"
      trigger={
        <Button>
          <Plus size={16} className="mr-2" />
          Nova marca
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
            {salvando ? "Salvando..." : "Salvar marca"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}
