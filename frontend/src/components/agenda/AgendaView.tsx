"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgendaEvento } from "@/services/agenda.service";
import { AgendaMonthView } from "./AgendaMonthView";
import { AgendaWeekView } from "./AgendaWeekView";
import { AgendaDayView } from "./AgendaDayView";
import { AgendaListView } from "./AgendaListView";
import { AgendaQuickActions } from "./AgendaQuickActions";

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
  novaData.setHours(0, 0, 0, 0);
  return novaData;
}

function fimDaSemana(data: Date) {
  const inicio = inicioDaSemana(data);
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);
  fim.setHours(23, 59, 59, 999);
  return fim;
}

function passaPeriodo(dataEvento: Date, periodo: string) {
  const hoje = new Date();

  if (periodo === "TODOS") return true;

  if (periodo === "HOJE") {
    return mesmoDia(dataEvento, hoje);
  }

  if (periodo === "SEMANA") {
    return dataEvento >= inicioDaSemana(hoje) && dataEvento <= fimDaSemana(hoje);
  }

  if (periodo === "MES") {
    return (
      dataEvento.getFullYear() === hoje.getFullYear() &&
      dataEvento.getMonth() === hoje.getMonth()
    );
  }

  return true;
}

export function AgendaView({ eventos }: Props) {
  const [statusFiltro, setStatusFiltro] = useState("TODOS");
  const [busca, setBusca] = useState("");
  const [periodoFiltro, setPeriodoFiltro] = useState("TODOS");
  const [abaAtiva, setAbaAtiva] = useState("mes");

  function limparFiltros() {
    setStatusFiltro("TODOS");
    setPeriodoFiltro("TODOS");
    setBusca("");
  }

  const eventosFiltrados = eventos.filter((evento) => {
    const passaStatus =
      statusFiltro === "TODOS" || evento.status === statusFiltro;

    const textoBusca = busca.toLowerCase();

    const passaBusca =
      !textoBusca ||
      evento.titulo.toLowerCase().includes(textoBusca) ||
      evento.descricao?.toLowerCase().includes(textoBusca) ||
      evento.clienteNome?.toLowerCase().includes(textoBusca) ||
      evento.clienteContato?.toLowerCase().includes(textoBusca);

    const passaFiltroPeriodo = passaPeriodo(
      new Date(evento.dataInicio),
      periodoFiltro
    );

    return passaStatus && passaBusca && passaFiltroPeriodo;
  });

  return (
    <div className="min-w-0 space-y-4">
      <AgendaQuickActions
        onPeriodoChange={setPeriodoFiltro}
        onStatusChange={setStatusFiltro}
        onTabChange={setAbaAtiva}
      />

      <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <p className="text-sm font-medium text-slate-700">Filtrar por status</p>
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            className="mt-1 h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-base md:text-sm"
          >
            <option value="TODOS">Todos</option>
            <option value="AGENDADO">Agendado</option>
            <option value="EM_ANDAMENTO">Em andamento</option>
            <option value="CONCLUIDO">Concluído</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-700">Filtrar por período</p>
          <select
            value={periodoFiltro}
            onChange={(e) => setPeriodoFiltro(e.target.value)}
            className="mt-1 h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-base md:text-sm"
          >
            <option value="TODOS">Todos</option>
            <option value="HOJE">Hoje</option>
            <option value="SEMANA">Esta semana</option>
            <option value="MES">Este mês</option>
          </select>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-700">Buscar atendimento</p>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Cliente, contato, título ou descrição..."
            className="mt-1 h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-base md:text-sm"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-end">
        <button
          onClick={limparFiltros}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Limpar filtros
        </button>
      </div>

      <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="min-w-0 space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4">
          <TabsTrigger value="mes">Mês</TabsTrigger>
          <TabsTrigger value="semana">Semana</TabsTrigger>
          <TabsTrigger value="dia">Dia</TabsTrigger>
          <TabsTrigger value="lista">Lista</TabsTrigger>
        </TabsList>

        <TabsContent value="mes">
          <AgendaMonthView eventos={eventosFiltrados} />
        </TabsContent>

        <TabsContent value="semana">
          <AgendaWeekView eventos={eventosFiltrados} />
        </TabsContent>

        <TabsContent value="dia">
          <AgendaDayView eventos={eventosFiltrados} />
        </TabsContent>

        <TabsContent value="lista">
          <AgendaListView eventos={eventosFiltrados} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
