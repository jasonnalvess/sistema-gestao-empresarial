"use client";

import { useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { FormDialog } from "@/components/forms/FormDialog";
import { CrudCard } from "@/components/crud/CrudCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { obterMensagemErro } from "@/lib/api-error";
import { crmQueryKeys } from "@/lib/crm-query-keys";
import {
  atualizarCrmEtapa,
  criarCrmEtapa,
  type CrmEtapa,
  type TipoEtapaCRM,
} from "@/services/crm.service";

type Props = {
  empresaId: string;
  etapas: CrmEtapa[];
};

type FormularioEtapaProps = {
  empresaId: string;
  etapa?: CrmEtapa;
};

const selectClassName =
  "min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function FormularioEtapa({ empresaId, etapa }: FormularioEtapaProps) {
  const nomeId = useId();
  const ordemId = useId();
  const tipoId = useId();
  const ativoId = useId();
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [nome, setNome] = useState(etapa?.nome ?? "");
  const [ordem, setOrdem] = useState(String(etapa?.ordem ?? 0));
  const [tipo, setTipo] = useState<TipoEtapaCRM>(etapa?.tipo ?? "ABERTA");
  const [ativo, setAtivo] = useState(etapa?.ativo ?? true);
  const edicao = Boolean(etapa);

  function aoMudarAbertura(novoAberto: boolean) {
    if (novoAberto && etapa) {
      setNome(etapa.nome);
      setOrdem(String(etapa.ordem));
      setAtivo(etapa.ativo);
    }
    setAberto(novoAberto);
  }

  async function salvar() {
    const ordemNumerica = Number(ordem);
    if (!nome.trim() || !Number.isInteger(ordemNumerica) || ordemNumerica < 0)
      return;

    try {
      setSalvando(true);
      if (etapa) {
        await atualizarCrmEtapa(etapa.id, {
          nome,
          ordem: ordemNumerica,
          ativo,
        });
      } else {
        await criarCrmEtapa({ nome, ordem: ordemNumerica, tipo, ativo });
      }
      toast.success(
        edicao ? "Etapa atualizada com sucesso!" : "Etapa criada com sucesso!",
      );
      setAberto(false);
      await queryClient.invalidateQueries({
        queryKey: crmQueryKeys.etapas(empresaId),
      });
      await queryClient.invalidateQueries({
        queryKey: crmQueryKeys.oportunidades(empresaId),
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Não foi possível salvar a etapa."));
      await queryClient.invalidateQueries({
        queryKey: crmQueryKeys.etapas(empresaId),
      });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <FormDialog
      open={aberto}
      onOpenChange={aoMudarAbertura}
      title={edicao ? "Editar etapa" : "Nova etapa"}
      trigger={
        edicao ? (
          <Button variant="outline" size="sm">
            <Pencil aria-hidden="true" />
            Editar
          </Button>
        ) : (
          <Button>
            <Plus aria-hidden="true" />
            Nova etapa
          </Button>
        )
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
            onChange={(event) => setNome(event.target.value)}
            disabled={salvando}
          />
        </div>
        <div>
          <label
            htmlFor={ordemId}
            className="text-sm font-medium text-slate-700"
          >
            Ordem
          </label>
          <Input
            id={ordemId}
            type="number"
            min="0"
            step="1"
            value={ordem}
            onChange={(event) => setOrdem(event.target.value)}
            disabled={salvando}
          />
        </div>
        {!edicao && (
          <div>
            <label
              htmlFor={tipoId}
              className="text-sm font-medium text-slate-700"
            >
              Tipo estrutural
            </label>
            <select
              id={tipoId}
              className={selectClassName}
              value={tipo}
              disabled={salvando}
              onChange={(event) => setTipo(event.target.value as TipoEtapaCRM)}
            >
              <option value="ABERTA">Aberta</option>
              <option value="GANHA">Ganha</option>
              <option value="PERDIDA">Perdida</option>
            </select>
          </div>
        )}
        <label
          htmlFor={ativoId}
          className="flex items-center gap-2 text-sm text-slate-700"
        >
          <input
            id={ativoId}
            type="checkbox"
            checked={ativo}
            disabled={salvando}
            onChange={(event) => setAtivo(event.target.checked)}
          />
          Etapa ativa
        </label>
        <div className="sticky -bottom-4 -mx-4 flex flex-col-reverse gap-2 border-t bg-white p-4 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => setAberto(false)}
            disabled={salvando}
          >
            Cancelar
          </Button>
          <Button
            onClick={salvar}
            disabled={
              salvando ||
              !nome.trim() ||
              !Number.isInteger(Number(ordem)) ||
              Number(ordem) < 0
            }
          >
            {salvando
              ? "Salvando..."
              : edicao
                ? "Salvar alterações"
                : "Criar etapa"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}

export function CrmGerenciarEtapas({ empresaId, etapas }: Props) {
  return (
    <CrudCard>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Gerenciar etapas
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Crie, edite a ordem e ative ou inative etapas. O tipo estrutural é
            definido na criação.
          </p>
        </div>
        <FormularioEtapa empresaId={empresaId} />
      </div>
      <div className="mt-5 space-y-3">
        {etapas.map((etapa) => (
          <div
            key={etapa.id}
            className="flex min-w-0 flex-col gap-3 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="break-words font-medium text-slate-900">
                {etapa.nome}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Ordem {etapa.ordem} · {etapa.tipo} ·{" "}
                {etapa.ativo ? "Ativa" : "Inativa"}
              </p>
            </div>
            <FormularioEtapa empresaId={empresaId} etapa={etapa} />
          </div>
        ))}
      </div>
    </CrudCard>
  );
}
