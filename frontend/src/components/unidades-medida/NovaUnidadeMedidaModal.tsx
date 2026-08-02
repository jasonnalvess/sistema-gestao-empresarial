"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormDialog } from "@/components/forms/FormDialog";
import { criarUnidadeMedida } from "@/services/unidades-medida.service";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_UNIDADES_CRIAR } from "@/lib/auth";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";
import { obterMensagemErro } from "@/lib/api-error";

export function NovaUnidadeMedidaModal() {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeCriar = temPermissao(PERMISSAO_UNIDADES_CRIAR);

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [nome, setNome] = useState("");
  const [sigla, setSigla] = useState("");

  async function salvar() {
    if (!podeCriar || !empresaEfetivaId || carregando) return;
    try {
      setSalvando(true);

      await criarUnidadeMedida({
        nome,
        sigla,
      });

      toast.success("Unidade cadastrada com sucesso!");

      setNome("");
      setSigla("");
      setAberto(false);

      queryClient.invalidateQueries({
        queryKey: estoqueQueryKeys.unidades(empresaEfetivaId),
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao cadastrar unidade"));
    } finally {
      setSalvando(false);
    }
  }

  if (!podeCriar || !empresaEfetivaId || carregando) return null;

  return (
    <FormDialog
      open={aberto}
      onOpenChange={setAberto}
      title="Nova unidade de medida"
      trigger={
        <Button>
          <Plus size={16} className="mr-2" />
          Nova unidade
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
            placeholder="UN, CX, KG..."
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
            {salvando ? "Salvando..." : "Salvar unidade"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}
