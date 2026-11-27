"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Link2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/forms/FormDialog";

import {
  type ModuloSistema,
} from "@/services/modulos.service";
import {
  vincularEmpresaModulo,
  type EmpresaModulo,
} from "@/services/empresa-modulos.service";
import { empresaModulosQueryKeys } from "@/lib/empresa-modulos-query-keys";
import { obterMensagemErro } from "@/lib/api-error";

type Props = {
  empresaId: string;
  catalogo: ModuloSistema[];
  vinculos: EmpresaModulo[];
};

export function VincularModuloModal({ empresaId, catalogo, vinculos }: Props) {
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [moduloId, setModuloId] = useState("");

  const vinculadosIds = new Set(vinculos.map((vinculo) => vinculo.moduloId));
  const disponiveis = catalogo.filter(
    (modulo) => !vinculadosIds.has(modulo.id),
  );

  async function salvar() {
    if (!moduloId || salvando) return;
    try {
      setSalvando(true);

      await vincularEmpresaModulo({ empresaId, moduloId });

      toast.success("Módulo vinculado e ativado para a empresa!");

      setModuloId("");
      setAberto(false);

      queryClient.invalidateQueries({
        queryKey: empresaModulosQueryKeys.porEmpresa(empresaId),
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao vincular módulo"));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <FormDialog
      open={aberto}
      onOpenChange={setAberto}
      title="Vincular módulo à empresa"
      trigger={
        <Button className="w-full md:w-auto">
          <Link2 aria-hidden="true" />
          Vincular módulo
        </Button>
      }
    >
      <div className="min-w-0 space-y-4">
        {disponiveis.length === 0 ? (
          <>
            <p className="text-sm text-slate-600">
              Todos os módulos do catálogo já estão vinculados a esta empresa.
            </p>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setAberto(false)}>
                Fechar
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600">
              O vínculo é criado já ativo para a empresa selecionada. Novos
              módulos são provisionados apenas pelos seeds oficiais.
            </p>

            <div>
              <label
                htmlFor="vinculo-modulo"
                className="text-sm font-medium text-slate-700"
              >
                Módulo
              </label>
              <select
                id="vinculo-modulo"
                value={moduloId}
                onChange={(e) => setModuloId(e.target.value)}
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
              >
                <option value="">Selecione um módulo</option>
                {disponiveis.map((modulo) => (
                  <option key={modulo.id} value={modulo.id}>
                    {modulo.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setAberto(false)}
                disabled={salvando}
              >
                Cancelar
              </Button>

              <Button onClick={salvar} disabled={salvando || !moduloId}>
                {salvando ? "Vinculando..." : "Vincular módulo"}
              </Button>
            </div>
          </>
        )}
      </div>
    </FormDialog>
  );
}
