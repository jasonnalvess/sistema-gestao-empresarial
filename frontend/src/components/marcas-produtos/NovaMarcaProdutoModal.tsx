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
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_MARCAS_CRIAR } from "@/lib/auth";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";
import { obterMensagemErro } from "@/lib/api-error";

export function NovaMarcaProdutoModal() {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeCriar = temPermissao(PERMISSAO_MARCAS_CRIAR);

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");

  async function salvar() {
    if (!podeCriar || !empresaEfetivaId || carregando) return;
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
        queryKey: estoqueQueryKeys.marcas(empresaEfetivaId),
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao cadastrar marca"));
    } finally {
      setSalvando(false);
    }
  }

  if (!podeCriar || !empresaEfetivaId || carregando) return null;

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
