import { CalendarDays, Clock, MapPin, User } from "lucide-react";
import { AgendaEvento } from "@/services/agenda.service";
import { EditarEventoModal } from "./EditarEventoModal";
import { AgendaStatusBadge } from "./AgendaStatusBadge";
import { AgendaHistoricoModal } from "./AgendaHistoricoModal";

type Props = {
  eventos: AgendaEvento[];
};

export function AgendaListView({ eventos }: Props) {
  const eventosOrdenados = [...eventos].sort(
    (a, b) =>
      new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime()
  );

  return (
    <div className="space-y-4">
      {eventosOrdenados.map((evento) => (
        <div
          key={evento.id}
          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CalendarDays size={18} className="text-blue-600" />
                <h3 className="font-semibold text-slate-900">
                  {evento.titulo}
                </h3>
              </div>

              {evento.descricao && (
                <p className="mt-2 text-sm text-slate-600">
                  {evento.descricao}
                </p>
              )}

              <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                <span className="flex items-center gap-2">
                  <Clock size={15} />
                  {new Date(evento.dataInicio).toLocaleString("pt-BR")}
                </span>

                {evento.local && (
                  <span className="flex items-center gap-2">
                    <MapPin size={15} />
                    {evento.local}
                  </span>
                )}

                {(evento.cliente?.nome || evento.clienteNome) && (
  <span className="flex items-center gap-2">
    <User size={15} />
    {evento.cliente?.nome || evento.clienteNome}
  </span>
)}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <AgendaStatusBadge status={evento.status} />
              <div className="flex gap-2">
                <EditarEventoModal evento={evento} />
                <AgendaHistoricoModal evento={evento} />
              </div>
            </div>
          </div>
        </div>
      ))}

      {eventos.length === 0 && (
        <p className="text-sm text-slate-500">Nenhum evento encontrado.</p>
      )}
    </div>
  );
}
