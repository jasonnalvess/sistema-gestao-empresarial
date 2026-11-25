"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

function inicioDaSemana(data: Date) {
  const inicio = new Date(data);
  inicio.setDate(inicio.getDate() - inicio.getDay());
  inicio.setHours(0, 0, 0, 0);
  return inicio;
}

function chaveData(data: Date) {
  return `${data.getFullYear()}-${data.getMonth()}-${data.getDate()}`;
}

export function AgendaWeekView({ eventos }: Props) {
  const hoje = useMemo(() => new Date(), []);
  const [inicio, setInicio] = useState(() => inicioDaSemana(hoje));
  const [diaSelecionado, setDiaSelecionado] = useState(hoje);
  const dias = Array.from({ length: 7 }, (_, indice) => {
    const dia = new Date(inicio);
    dia.setDate(inicio.getDate() + indice);
    return dia;
  });
  const eventosOrdenados = useMemo(
    () =>
      [...eventos].sort(
        (a, b) =>
          new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime(),
      ),
    [eventos],
  );
  const eventosPorDia = useMemo(() => {
    const grupos = new Map<string, AgendaEvento[]>();
    eventosOrdenados.forEach((evento) => {
      const chave = chaveData(new Date(evento.dataInicio));
      grupos.set(chave, [...(grupos.get(chave) ?? []), evento]);
    });
    return grupos;
  }, [eventosOrdenados]);
  const eventosSelecionados =
    eventosPorDia.get(chaveData(diaSelecionado)) ?? [];

  function mudarSemana(deslocamento: number) {
    const novaSemana = new Date(inicio);
    novaSemana.setDate(inicio.getDate() + deslocamento * 7);
    setInicio(novaSemana);
    setDiaSelecionado(novaSemana);
  }

  function irParaHoje() {
    const agora = new Date();
    setInicio(inicioDaSemana(agora));
    setDiaSelecionado(agora);
  }

  return (
    <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 sm:p-5">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Visão semanal
          </p>
          <h2 className="text-xl font-semibold text-slate-900">
            {inicio.toLocaleDateString("pt-BR", {
              day: "numeric",
              month: "short",
            })}
            {" – "}
            {dias[6].toLocaleDateString("pt-BR", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </h2>
        </div>
        <div className="grid grid-cols-[auto_1fr_auto] gap-2 sm:flex">
          <Button
            variant="outline"
            size="icon"
            onClick={() => mudarSemana(-1)}
            aria-label="Semana anterior"
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button variant="outline" onClick={irParaHoje}>
            Hoje
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => mudarSemana(1)}
            aria-label="Próxima semana"
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 lg:hidden">
        {dias.map((dia) => {
          const quantidade = eventosPorDia.get(chaveData(dia))?.length ?? 0;
          const selecionado = mesmoDia(dia, diaSelecionado);
          const diaAtual = mesmoDia(dia, hoje);
          return (
            <button
              key={dia.toISOString()}
              type="button"
              onClick={() => setDiaSelecionado(dia)}
              aria-pressed={selecionado}
              aria-current={diaAtual ? "date" : undefined}
              aria-label={`${dia.toLocaleDateString("pt-BR", { dateStyle: "full" })}, ${quantidade} eventos`}
              className={cn(
                "flex min-h-16 min-w-0 flex-col items-center justify-center rounded-lg p-1 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                selecionado
                  ? "bg-blue-600 text-white"
                  : "bg-slate-50 text-slate-600",
                diaAtual && !selecionado && "ring-2 ring-blue-500",
              )}
            >
              <span className="uppercase">
                {dia.toLocaleDateString("pt-BR", { weekday: "narrow" })}
              </span>
              <span className="text-base font-semibold">{dia.getDate()}</span>
              <span
                className={cn(
                  "mt-0.5 size-1 rounded-full",
                  quantidade > 0 ? "bg-current" : "bg-transparent",
                )}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>

      <div className="mt-4 space-y-3 lg:hidden">
        <h3 className="font-semibold capitalize text-slate-900">
          {diaSelecionado.toLocaleDateString("pt-BR", { dateStyle: "full" })}
        </h3>
        {eventosSelecionados.map((evento) => (
          <AgendaEventCard key={evento.id} evento={evento} />
        ))}
        {eventosSelecionados.length === 0 && (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            Nenhum compromisso neste dia.
          </p>
        )}
      </div>

      <div className="hidden grid-cols-7 gap-3 lg:grid">
        {dias.map((dia) => {
          const eventosDoDia = eventosPorDia.get(chaveData(dia)) ?? [];
          return (
            <div
              key={dia.toISOString()}
              className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-2"
            >
              <div className="mb-3 text-center">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  {dia.toLocaleDateString("pt-BR", { weekday: "short" })}
                </p>
                <p className="text-lg font-semibold text-slate-900">
                  {dia.getDate()}
                </p>
              </div>
              <div className="space-y-2">
                {eventosDoDia.map((evento) => (
                  <AgendaEventCard key={evento.id} evento={evento} compacto />
                ))}
                {eventosDoDia.length === 0 && (
                  <p className="py-3 text-center text-xs text-slate-400">
                    Sem eventos
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
