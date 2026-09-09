"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AgendaEvento } from "@/services/agenda.service";
import { AgendaEventCard } from "./AgendaEventCard";

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

function ordenarEventos(eventos: AgendaEvento[]) {
  return [...eventos].sort(
    (a, b) =>
      new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime(),
  );
}

function chaveData(data: Date) {
  return `${data.getFullYear()}-${data.getMonth()}-${data.getDate()}`;
}

export function AgendaMonthView({ eventos }: Props) {
  const hoje = useMemo(() => new Date(), []);
  const [mesExibido, setMesExibido] = useState(
    () => new Date(hoje.getFullYear(), hoje.getMonth(), 1),
  );
  const [diaSelecionado, setDiaSelecionado] = useState(hoje);

  const ano = mesExibido.getFullYear();
  const mes = mesExibido.getMonth();
  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  const dias: Array<Date | null> = [];

  for (let indice = 0; indice < primeiroDia.getDay(); indice += 1) {
    dias.push(null);
  }

  for (let numero = 1; numero <= ultimoDia.getDate(); numero += 1) {
    dias.push(new Date(ano, mes, numero));
  }

  while (dias.length % 7 !== 0) dias.push(null);

  const eventosOrdenados = useMemo(() => ordenarEventos(eventos), [eventos]);
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

  function mudarMes(deslocamento: number) {
    const novoMes = new Date(ano, mes + deslocamento, 1);
    setMesExibido(novoMes);
    setDiaSelecionado(novoMes);
  }

  function irParaHoje() {
    const agora = new Date();
    setMesExibido(new Date(agora.getFullYear(), agora.getMonth(), 1));
    setDiaSelecionado(agora);
  }

  const nomesDias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 sm:p-5">
      <div className="mb-5 flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Visão mensal
          </p>
          <h2 className="truncate text-xl font-semibold capitalize text-slate-900">
            {mesExibido.toLocaleDateString("pt-BR", {
              month: "long",
              year: "numeric",
            })}
          </h2>
        </div>

        <div className="grid grid-cols-[auto_1fr_auto] gap-2 sm:flex sm:justify-end">
          <Button
            variant="outline"
            size="icon"
            onClick={() => mudarMes(-1)}
            aria-label="Mês anterior"
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button variant="outline" onClick={irParaHoje}>
            Hoje
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => mudarMes(1)}
            aria-label="Próximo mês"
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-200 pb-2">
        {nomesDias.map((nome) => (
          <div
            key={nome}
            className="text-center text-[0.7rem] font-semibold uppercase text-slate-500 sm:text-xs"
          >
            {nome}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 lg:hidden">
        {dias.map((dia, indice) => {
          if (!dia) {
            return (
              <div
                key={`vazio-${indice}`}
                className="min-h-14 border-b border-slate-100"
                aria-hidden="true"
              />
            );
          }

          const eventosDoDia = eventosPorDia.get(chaveData(dia)) ?? [];
          const selecionado = mesmoDia(dia, diaSelecionado);
          const diaAtual = mesmoDia(dia, hoje);

          return (
            <button
              key={dia.toISOString()}
              type="button"
              onClick={() => setDiaSelecionado(dia)}
              aria-label={`${dia.toLocaleDateString("pt-BR", { dateStyle: "full" })}, ${eventosDoDia.length} eventos`}
              aria-pressed={selecionado}
              aria-current={diaAtual ? "date" : undefined}
              className={cn(
                "relative flex min-h-14 min-w-0 flex-col items-center justify-center border-b border-slate-100 p-1 text-sm transition focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                selecionado && "bg-blue-50 text-blue-800",
              )}
            >
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full font-medium",
                  diaAtual && "ring-2 ring-blue-500 ring-offset-1",
                  selecionado && "bg-blue-600 text-white",
                )}
              >
                {dia.getDate()}
              </span>
              {eventosDoDia.length > 0 && (
                <span
                  className="mt-1 flex items-center gap-0.5"
                  aria-hidden="true"
                >
                  {Array.from({ length: Math.min(eventosDoDia.length, 3) }).map(
                    (_, ponto) => (
                      <span
                        key={ponto}
                        className="size-1 rounded-full bg-blue-500"
                      />
                    ),
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="hidden grid-cols-7 border-l border-t border-slate-200 lg:grid">
        {dias.map((dia, indice) => {
          if (!dia) {
            return (
              <div
                key={`vazio-${indice}`}
                className="min-h-36 border-b border-r border-slate-200 bg-slate-50/60"
                aria-hidden="true"
              />
            );
          }

          const eventosDoDia = eventosPorDia.get(chaveData(dia)) ?? [];
          const selecionado = mesmoDia(dia, diaSelecionado);
          const diaAtual = mesmoDia(dia, hoje);

          return (
            <button
              key={dia.toISOString()}
              type="button"
              onClick={() => setDiaSelecionado(dia)}
              aria-pressed={selecionado}
              aria-current={diaAtual ? "date" : undefined}
              className={cn(
                "min-h-36 min-w-0 border-b border-r border-slate-200 p-2 text-left align-top transition hover:bg-slate-50 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                selecionado && "bg-blue-50",
              )}
            >
              <span
                className={cn(
                  "mb-2 flex size-7 items-center justify-center rounded-full text-sm font-semibold text-slate-700",
                  diaAtual && "ring-2 ring-blue-500",
                  selecionado && "bg-blue-600 text-white",
                )}
              >
                {dia.getDate()}
              </span>
              <span className="space-y-1">
                {eventosDoDia.slice(0, 3).map((evento) => (
                  <span
                    key={evento.id}
                    className="block truncate rounded bg-blue-100 px-1.5 py-1 text-xs text-blue-800"
                  >
                    {new Date(evento.dataInicio).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    {evento.titulo}
                  </span>
                ))}
                {eventosDoDia.length > 3 && (
                  <span className="block text-xs font-medium text-slate-500">
                    +{eventosDoDia.length - 3} eventos
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 border-t border-slate-200 pt-5">
        <div className="mb-3 flex min-w-0 flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Dia selecionado
            </p>
            <h3 className="text-lg font-semibold capitalize text-slate-900">
              {diaSelecionado.toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h3>
          </div>
          <p className="text-sm text-slate-500">
            {eventosSelecionados.length} evento(s)
          </p>
        </div>

        <div className="space-y-3">
          {eventosSelecionados.map((evento) => (
            <AgendaEventCard key={evento.id} evento={evento} />
          ))}
          {eventosSelecionados.length === 0 && (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
              Nenhum compromisso neste dia.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
