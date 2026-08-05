import { AgendaEvento } from "@/services/agenda.service";
import { EditarEventoModal } from "./EditarEventoModal";
import { AgendaStatusBadge } from "./AgendaStatusBadge";
import { AgendaHistoricoModal } from "./AgendaHistoricoModal";
import { CancelarEventoButton } from "./CancelarEventoButton";

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

export function AgendaDayView({ eventos }: Props) {
  const hoje = new Date();

  const eventosHoje = eventos
    .filter((evento) => mesmoDia(new Date(evento.dataInicio), hoje))
    .sort(
      (a, b) =>
        new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime(),
    );

  const horas = Array.from({ length: 14 }).map((_, index) => index + 7);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="mb-5 text-lg font-semibold text-slate-900">
        Hoje — {hoje.toLocaleDateString("pt-BR")}
      </h2>

      <div className="space-y-3">
        {horas.map((hora) => {
          const eventosDaHora = eventosHoje.filter(
            (evento) => new Date(evento.dataInicio).getHours() === hora,
          );

          return (
            <div
              key={hora}
              className="grid gap-3 border-b border-slate-100 pb-3 md:grid-cols-[80px_1fr]"
            >
              <div className="text-sm font-medium text-slate-500">
                {String(hora).padStart(2, "0")}:00
              </div>

              <div className="space-y-2">
                {eventosDaHora.map((evento) => (
                  <div
                    key={evento.id}
                    className="rounded-lg border border-blue-200 bg-blue-50 p-3"
                  >
                    <p className="font-medium text-blue-900">{evento.titulo}</p>

                    <p className="text-sm text-blue-700">
                      {new Date(evento.dataInicio).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      -{" "}
                      {new Date(evento.dataFim).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>

                    <div className="mt-2">
                      <AgendaStatusBadge status={evento.status} />
                    </div>

                    {(evento.cliente?.nome || evento.clienteNome) && (
                      <p className="mt-1 text-sm text-slate-600">
                        Cliente: {evento.cliente?.nome || evento.clienteNome}
                      </p>
                    )}

                    <div className="mt-3">
                      <div className="flex gap-2">
                        <EditarEventoModal evento={evento} />
                        <AgendaHistoricoModal evento={evento} />
                        <CancelarEventoButton evento={evento} />
                      </div>
                    </div>
                  </div>
                ))}

                {eventosDaHora.length === 0 && (
                  <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-400">
                    Horário livre
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
