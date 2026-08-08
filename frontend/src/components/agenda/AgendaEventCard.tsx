import { Clock, MapPin, UserRound } from "lucide-react";

import { AgendaEvento } from "@/services/agenda.service";
import { cn } from "@/lib/utils";
import { AgendaHistoricoModal } from "./AgendaHistoricoModal";
import { AgendaStatusBadge } from "./AgendaStatusBadge";
import { CancelarEventoButton } from "./CancelarEventoButton";
import { EditarEventoModal } from "./EditarEventoModal";

type Props = {
  evento: AgendaEvento;
  compacto?: boolean;
};

export function AgendaEventCard({ evento, compacto = false }: Props) {
  const inicio = new Date(evento.dataInicio);
  const fim = new Date(evento.dataFim);
  const cliente = evento.cliente?.nome || evento.clienteNome;

  return (
    <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-blue-700">
            <Clock className="shrink-0" size={16} aria-hidden="true" />
            <time dateTime={evento.dataInicio}>
              {inicio.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {" – "}
              {fim.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
          </div>

          <h3 className="mt-1 break-words font-semibold text-slate-900">
            {evento.titulo}
          </h3>

          {!compacto && evento.descricao && (
            <p className="mt-1 line-clamp-2 break-words text-sm text-slate-600">
              {evento.descricao}
            </p>
          )}

          {!compacto && (
            <div className="mt-2 space-y-1 text-sm text-slate-500">
              {cliente && (
                <p className="flex min-w-0 items-center gap-2">
                  <UserRound
                    className="shrink-0"
                    size={15}
                    aria-hidden="true"
                  />
                  <span className="truncate">{cliente}</span>
                </p>
              )}
              {evento.local && (
                <p className="flex min-w-0 items-center gap-2">
                  <MapPin className="shrink-0" size={15} aria-hidden="true" />
                  <span className="truncate">{evento.local}</span>
                </p>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0">
          <AgendaStatusBadge status={evento.status} />
        </div>
      </div>

      <div
        className={cn(
          "mt-3 grid grid-cols-1 gap-2 [&>*]:w-full",
          !compacto && "lg:grid-cols-3",
        )}
      >
        <EditarEventoModal evento={evento} />
        <AgendaHistoricoModal evento={evento} />
        <CancelarEventoButton evento={evento} />
      </div>
    </article>
  );
}
