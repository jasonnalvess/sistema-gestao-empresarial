"use client";

import type {
  CrmEtapa,
  CrmResponsavel,
  TipoEtapaCRM,
} from "@/services/crm.service";

type Props = {
  etapas: CrmEtapa[];
  responsaveis: CrmResponsavel[];
  etapaId?: string;
  responsavelId?: string;
  tipoEtapa?: TipoEtapaCRM;
  onEtapaChange: (etapaId?: string) => void;
  onResponsavelChange: (responsavelId?: string) => void;
  onTipoChange: (tipo?: TipoEtapaCRM) => void;
  disabled?: boolean;
};

const selectClassName =
  "min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100";

export function CrmFiltros({
  etapas,
  responsaveis,
  etapaId,
  responsavelId,
  tipoEtapa,
  onEtapaChange,
  onResponsavelChange,
  onTipoChange,
  disabled = false,
}: Props) {
  return (
    <div className="grid min-w-0 gap-3 md:grid-cols-3">
      <div className="min-w-0">
        <label
          htmlFor="crm-filtro-etapa"
          className="text-sm font-medium text-slate-700"
        >
          Etapa
        </label>
        <select
          id="crm-filtro-etapa"
          className={selectClassName}
          value={etapaId ?? ""}
          disabled={disabled}
          onChange={(event) => onEtapaChange(event.target.value || undefined)}
        >
          <option value="">Todas as etapas</option>
          {etapas.map((etapa) => (
            <option key={etapa.id} value={etapa.id}>
              {etapa.nome}
              {etapa.ativo ? "" : " (inativa)"}
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-0">
        <label
          htmlFor="crm-filtro-responsavel"
          className="text-sm font-medium text-slate-700"
        >
          Responsável
        </label>
        <select
          id="crm-filtro-responsavel"
          className={selectClassName}
          value={responsavelId ?? ""}
          disabled={disabled}
          onChange={(event) =>
            onResponsavelChange(event.target.value || undefined)
          }
        >
          <option value="">Todos os responsáveis</option>
          {responsaveis.map((responsavel) => (
            <option key={responsavel.id} value={responsavel.id}>
              {responsavel.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-0">
        <label
          htmlFor="crm-filtro-tipo"
          className="text-sm font-medium text-slate-700"
        >
          Tipo de etapa
        </label>
        <select
          id="crm-filtro-tipo"
          className={selectClassName}
          value={tipoEtapa ?? ""}
          disabled={disabled}
          onChange={(event) =>
            onTipoChange(
              (event.target.value || undefined) as TipoEtapaCRM | undefined,
            )
          }
        >
          <option value="">Todos os tipos</option>
          <option value="ABERTA">Aberta</option>
          <option value="GANHA">Ganha</option>
          <option value="PERDIDA">Perdida</option>
        </select>
      </div>
    </div>
  );
}
