"use client";

import { useId, useState } from "react";
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
  const nomeId = useId();
  const siglaId = useId();
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
        <Button className="w-full md:w-auto">
          <Plus aria-hidden="true" />
          Nova unidade
        </Button>
      }
    >
      <div className="min-w-0 space-y-4">
        <div>
          <label
            htmlFor={nomeId}
            className="text-sm font-medium text-slate-700"
          >
            Nome
          </label>
          <Input
            id={nomeId}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>

        <div>
          <label
            htmlFor={siglaId}
            className="text-sm font-medium text-slate-700"
          >
            Sigla
          </label>
          <Input
            id={siglaId}
            value={sigla}
            onChange={(e) => setSigla(e.target.value.toUpperCase())}
            placeholder="UN, CX, KG..."
          />
        </div>

        <div className="sticky -bottom-4 -mx-4 flex flex-col-reverse gap-2 border-t bg-white p-4 sm:flex-row sm:justify-end">
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
