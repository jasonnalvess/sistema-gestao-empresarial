"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AgendaEvento } from "@/services/agenda.service";
import { AgendaEventCard } from "./AgendaEventCard";

type Props = { eventos: AgendaEvento[] };

function mesmoDia(dataA: Date, dataB: Date) {
  return (
    dataA.getFullYear() === dataB.getFullYear() &&
    dataA.getMonth() === dataB.getMonth() &&
    dataA.getDate() === dataB.getDate()
  );
}

export function AgendaDayView({ eventos }: Props) {
  const [diaSelecionado, setDiaSelecionado] = useState(() => new Date());
  const eventosDoDia = useMemo(
    () =>
      eventos
        .filter((evento) =>
          mesmoDia(new Date(evento.dataInicio), diaSelecionado),
        )
        .sort(
          (a, b) =>
            new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime(),
        ),
    [diaSelecionado, eventos],
  );

  function mudarDia(deslocamento: number) {
    setDiaSelecionado((diaAtual) => {
      const novoDia = new Date(diaAtual);
      novoDia.setDate(diaAtual.getDate() + deslocamento);
      return novoDia;
    });
  }

  return (
    <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 sm:p-5">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Visão diária
          </p>
          <h2 className="text-xl font-semibold capitalize text-slate-900">
            {diaSelecionado.toLocaleDateString("pt-BR", { dateStyle: "full" })}
          </h2>
        </div>
        <div className="grid grid-cols-[auto_1fr_auto] gap-2 sm:flex">
          <Button
            variant="outline"
            size="icon"
            onClick={() => mudarDia(-1)}
            aria-label="Dia anterior"
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            onClick={() => setDiaSelecionado(new Date())}
          >
            Hoje
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => mudarDia(1)}
            aria-label="Próximo dia"
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {eventosDoDia.map((evento) => (
          <AgendaEventCard key={evento.id} evento={evento} />
        ))}
        {eventosDoDia.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="font-medium text-slate-700">
              Nenhum compromisso neste dia
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Use a navegação para consultar outra data.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
