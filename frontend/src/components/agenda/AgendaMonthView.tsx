"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
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

export function AgendaMonthView({ eventos }: Props) {
  const [dataAtual, setDataAtual] = useState(new Date());

  const ano = dataAtual.getFullYear();
  const mes = dataAtual.getMonth();

  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);

  const diasNoMes = ultimoDia.getDate();
  const diaSemanaInicio = primeiroDia.getDay();

  const dias: Array<Date | null> = [];

  for (let i = 0; i < diaSemanaInicio; i++) {
    dias.push(null);
  }

  for (let dia = 1; dia <= diasNoMes; dia++) {
    dias.push(new Date(ano, mes, dia));
  }

  function mesAnterior() {
    setDataAtual(new Date(ano, mes - 1, 1));
  }

  function proximoMes() {
    setDataAtual(new Date(ano, mes + 1, 1));
  }

  function irParaHoje() {
    setDataAtual(new Date());
  }

  const nomesDias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-lg font-semibold capitalize text-slate-900">
          {dataAtual.toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric",
          })}
        </h2>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={mesAnterior}>
            <ChevronLeft size={16} />
          </Button>

          <Button variant="outline" size="sm" onClick={irParaHoje}>
            Hoje
          </Button>

          <Button variant="outline" size="sm" onClick={proximoMes}>
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {nomesDias.map((dia) => (
          <div
            key={dia}
            className="text-center text-xs font-semibold uppercase text-slate-500"
          >
            {dia}
          </div>
        ))}

        {dias.map((dia, index) => {
          const eventosDoDia = dia
            ? eventos.filter((evento) =>
                mesmoDia(new Date(evento.dataInicio), dia)
              )
            : [];

          return (
            <div
              key={index}
              className="min-h-28 rounded-lg border border-slate-200 bg-slate-50 p-2"
            >
              {dia && (
                <>
                  <div className="mb-2 text-sm font-medium text-slate-700">
                    {dia.getDate()}
                  </div>

                  <div className="space-y-1">
                    {eventosDoDia.slice(0, 3).map((evento) => (
                      <div
                        key={evento.id}
                        className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700"
                        title={evento.titulo}
                      >
                        <div className="truncate font-medium">{evento.titulo}</div>
                        <div className="mt-1">
                          <AgendaStatusBadge status={evento.status} />
                        </div>
                        <div className="mt-1">
                          <div className="flex flex-col gap-1">
                            <EditarEventoModal evento={evento} />
                            <AgendaHistoricoModal evento={evento} />
                          </div>
                        </div>
                      </div>
                    ))}

                    {eventosDoDia.length > 3 && (
                      <div className="text-xs text-slate-500">
                        +{eventosDoDia.length - 3} eventos
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
