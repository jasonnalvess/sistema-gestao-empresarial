import { AgendaEvento } from "@/services/agenda.service";
import { AgendaEventCard } from "./AgendaEventCard";

type Props = { eventos: AgendaEvento[] };

function chaveData(data: Date) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

export function AgendaListView({ eventos }: Props) {
  const eventosOrdenados = [...eventos].sort(
    (a, b) =>
      new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime(),
  );
  const grupos = new Map<string, AgendaEvento[]>();

  eventosOrdenados.forEach((evento) => {
    const chave = chaveData(new Date(evento.dataInicio));
    grupos.set(chave, [...(grupos.get(chave) ?? []), evento]);
  });

  return (
    <section className="min-w-0 space-y-6">
      {Array.from(grupos.entries()).map(([data, eventosDoDia]) => {
        const dataLocal = new Date(`${data}T12:00:00`);
        return (
          <div key={data} className="min-w-0">
            <div className="mb-3 border-b border-slate-200 pb-2">
              <h2 className="text-lg font-semibold capitalize text-slate-900">
                {dataLocal.toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <p className="text-sm text-slate-500">
                {eventosDoDia.length} evento(s)
              </p>
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2">
              {eventosDoDia.map((evento) => (
                <AgendaEventCard key={evento.id} evento={evento} />
              ))}
            </div>
          </div>
        );
      })}

      {eventos.length === 0 && (
        <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
          Nenhum evento encontrado.
        </p>
      )}
    </section>
  );
}
