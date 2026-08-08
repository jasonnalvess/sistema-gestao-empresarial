"use client";

import { CalendarDays, Clock, ListChecks } from "lucide-react";

type Props = {
  onPeriodoChange: (periodo: string) => void;
  onStatusChange: (status: string) => void;
  onTabChange: (tab: string) => void;
};

export function AgendaQuickActions({
  onPeriodoChange,
  onStatusChange,
  onTabChange,
}: Props) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3">
      <button
        onClick={() => {
          onPeriodoChange("HOJE");
          onTabChange("dia");
        }}
        className="rounded-xl border bg-white p-4 text-left shadow-sm transition hover:bg-slate-50"
      >
        <CalendarDays size={20} className="mb-2 text-blue-600" />
        <p className="font-medium text-slate-900">Ver hoje</p>
        <p className="text-sm text-slate-500">Atendimentos do dia</p>
      </button>

      <button
        onClick={() => {
          onPeriodoChange("SEMANA");
          onTabChange("semana");
        }}
        className="rounded-xl border bg-white p-4 text-left shadow-sm transition hover:bg-slate-50"
      >
        <Clock size={20} className="mb-2 text-orange-600" />
        <p className="font-medium text-slate-900">Ver semana</p>
        <p className="text-sm text-slate-500">Agenda semanal</p>
      </button>

      <button
        onClick={() => {
          onStatusChange("EM_ANDAMENTO");
          onTabChange("lista");
        }}
        className="rounded-xl border bg-white p-4 text-left shadow-sm transition hover:bg-slate-50"
      >
        <ListChecks size={20} className="mb-2 text-green-600" />
        <p className="font-medium text-slate-900">Em andamento</p>
        <p className="text-sm text-slate-500">Atendimentos ativos</p>
      </button>
    </div>
  );
}
