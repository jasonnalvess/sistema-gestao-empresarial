import { AgendaEvento } from "@/services/agenda.service";
import { EditarEventoModal } from "./EditarEventoModal";
import { AgendaStatusBadge } from "./AgendaStatusBadge";
import { AgendaHistoricoModal } from "./AgendaHistoricoModal";

type Props = {
  eventos: AgendaEvento[];
};

function mesmoDia(dataA: Date, dataB: Date) {
  return (
    dataA.getFullYear() === dataB.getFullYear() &&
    dataA.getMonth() === dataB.getMonth() &&
    dataA.getDate() === dataB.getDate()
  );
}

function inicioDaSemana(data: Date) {
  const novaData = new Date(data);
  const dia = novaData.getDay();
  novaData.setDate(novaData.getDate() - dia);
  return novaData;
}

export function AgendaWeekView({ eventos }: Props) {
  const hoje = new Date();
  const inicio = inicioDaSemana(hoje);

  const dias = Array.from({ length: 7 }).map((_, index) => {
    const dia = new Date(inicio);
    dia.setDate(inicio.getDate() + index);
    return dia;
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="mb-5 text-lg font-semibold text-slate-900">
        Visão semanal
      </h2>

      <div className="grid gap-4 md:grid-cols-7">
        {dias.map((dia) => {
          const eventosDoDia = eventos.filter((evento) =>
            mesmoDia(new Date(evento.dataInicio), dia)
          );

          return (
            <div
              key={dia.toISOString()}
              className="min-h-40 rounded-xl border border-slate-200 bg-slate-50 p-3"
            >
              <div className="mb-3">
                <p className="text-sm font-semibold capitalize text-slate-900">
                  {dia.toLocaleDateString("pt-BR", { weekday: "short" })}
                </p>
                <p className="text-xs text-slate-500">
                  {dia.toLocaleDateString("pt-BR")}
                </p>
              </div>

              <div className="space-y-2">
                {eventosDoDia.map((evento) => (
                  <div
                    key={evento.id}
                    className="rounded-lg bg-blue-100 p-2 text-xs text-blue-700"
                  >
                    <p className="font-medium">{evento.titulo}</p>
                    <p>
                      {new Date(evento.dataInicio).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <div className="mt-2">
                      <AgendaStatusBadge status={evento.status} />
                    </div>
                    <div className="mt-2">
                      <div className="flex flex-col gap-1">
                        <EditarEventoModal evento={evento} />
                        <AgendaHistoricoModal evento={evento} />
                      </div>
                    </div>
                  </div>
                ))}

                {eventosDoDia.length === 0 && (
                  <p className="text-xs text-slate-400">Sem eventos</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
