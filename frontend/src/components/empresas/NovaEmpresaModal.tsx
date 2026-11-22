"use client";

import { useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormDialog } from "@/components/forms/FormDialog";
import { criarEmpresa } from "@/services/empresas.service";
import { empresasQueryKeys } from "@/lib/empresas-query-keys";
import { obterMensagemErro } from "@/lib/api-error";

export function NovaEmpresaModal() {
  const nomeId = useId();
  const cnpjId = useId();
  const queryClient = useQueryClient();

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");

  const nomeValido = nome.trim().length >= 2;

  async function salvar() {
    if (!nomeValido || salvando) return;
    try {
      setSalvando(true);

      await criarEmpresa({
        nome: nome.trim(),
        ...(cnpj.trim() ? { cnpj: cnpj.trim() } : {}),
      });

      toast.success("Empresa cadastrada com sucesso!");

      setNome("");
      setCnpj("");
      setAberto(false);

      queryClient.invalidateQueries({
        queryKey: empresasQueryKeys.todas(),
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao cadastrar empresa"));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <FormDialog
      open={aberto}
      onOpenChange={setAberto}
      title="Nova empresa"
      trigger={
        <Button className="w-full md:w-auto">
          <Plus aria-hidden="true" />
          Nova empresa
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
            placeholder="Nome da empresa"
          />
        </div>

        <div>
          <label
            htmlFor={cnpjId}
            className="text-sm font-medium text-slate-700"
          >
            CNPJ (opcional)
          </label>
          <Input
            id={cnpjId}
            value={cnpj}
            onChange={(e) => setCnpj(e.target.value)}
            placeholder="00.000.000/0000-00"
          />
          <p className="mt-1 text-xs text-slate-500">
            O CNPJ deve ser único entre as empresas cadastradas.
          </p>
        </div>

        <div className="sticky -bottom-4 -mx-4 flex flex-col-reverse gap-2 border-t bg-white p-4 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => setAberto(false)}
            disabled={salvando}
          >
            Cancelar
          </Button>

          <Button onClick={salvar} disabled={salvando || !nomeValido}>
            {salvando ? "Salvando..." : "Salvar empresa"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}
