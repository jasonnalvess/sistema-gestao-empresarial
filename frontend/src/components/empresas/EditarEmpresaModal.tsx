"use client";

import { useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormDialog } from "@/components/forms/FormDialog";
import { atualizarEmpresa, type Empresa } from "@/services/empresas.service";
import { empresasQueryKeys } from "@/lib/empresas-query-keys";
import { obterMensagemErro } from "@/lib/api-error";

type Props = {
  empresa: Empresa;
};

export function EditarEmpresaModal({ empresa }: Props) {
  const nomeId = useId();
  const cnpjId = useId();
  const queryClient = useQueryClient();

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [nome, setNome] = useState(empresa.nome);
  const [cnpj, setCnpj] = useState(empresa.cnpj ?? "");

  const nomeValido = nome.trim().length >= 2;

  async function salvar() {
    if (!nomeValido || salvando) return;
    try {
      setSalvando(true);

      await atualizarEmpresa(empresa.id, {
        nome: nome.trim(),
        cnpj: cnpj.trim(),
      });

      toast.success("Empresa atualizada com sucesso!");

      setAberto(false);

      queryClient.invalidateQueries({
        queryKey: empresasQueryKeys.todas(),
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao atualizar empresa"));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <FormDialog
      open={aberto}
      onOpenChange={setAberto}
      title={`Editar empresa "${empresa.nome}"`}
      trigger={
        <Button variant="outline" size="sm">
          <Pencil aria-hidden="true" />
          Editar
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
            htmlFor={cnpjId}
            className="text-sm font-medium text-slate-700"
          >
            CNPJ
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
            {salvando ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}
