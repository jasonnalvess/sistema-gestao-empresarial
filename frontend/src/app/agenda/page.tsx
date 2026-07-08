"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock, MapPin, User } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { CrudCard } from "@/components/crud/CrudCard";
import { CrudEmpty } from "@/components/crud/CrudEmpty";
import { CrudLoading } from "@/components/crud/CrudLoading";
import { listarAgenda } from "@/services/agenda.service";
import { NovoEventoModal } from "@/components/agenda/NovoEventoModal";
import { AgendaView } from "@/components/agenda/AgendaView";
import { AgendaSummaryCards } from "@/components/agenda/AgendaSummaryCards";

export default function AgendaPage() {
  const { data: eventos = [], isLoading, error } = useQuery({
    queryKey: ["agenda"],
    queryFn: listarAgenda,
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Agenda"
          description="Gerencie atendimentos, compromissos e acompanhamentos da empresa."
          actions={<NovoEventoModal />}
        />

        <AgendaSummaryCards eventos={eventos} />

        <CrudCard>
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              Erro ao carregar agenda.
            </div>
          )}

          {isLoading ? (
            <CrudLoading />
          ) : eventos.length === 0 ? (
            <CrudEmpty message="Nenhum evento encontrado na agenda." />
          ) : (
            <AgendaView eventos={eventos} />
          )}
        </CrudCard>
      </div>
    </AppLayout>
  );
}
