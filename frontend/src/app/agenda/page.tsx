"use client";

import { useQuery } from "@tanstack/react-query";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { CrudCard } from "@/components/crud/CrudCard";
import { CrudLoading } from "@/components/crud/CrudLoading";
import { listarAgenda } from "@/services/agenda.service";
import { NovoEventoModal } from "@/components/agenda/NovoEventoModal";
import { AgendaView } from "@/components/agenda/AgendaView";
import { AgendaSummaryCards } from "@/components/agenda/AgendaSummaryCards";
import { AcessoNegado } from "@/components/common/AcessoNegado";
import { EmpresaNaoSelecionada } from "@/components/common/EmpresaNaoSelecionada";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { agendaQueryKeys } from "@/lib/agenda-query-keys";
import {
  PERMISSAO_AGENDA_CRIAR,
  PERMISSAO_AGENDA_VISUALIZAR,
} from "@/lib/auth";

export default function AgendaPage() {
  const { temPermissao } = useAuth();
  const { empresaSelecionadaId, empresaEfetivaId, carregando, requerSelecao } =
    useEmpresaSelecionada();
  const possuiEmpresa = !requerSelecao || Boolean(empresaSelecionadaId);
  const podeVisualizar = temPermissao(PERMISSAO_AGENDA_VISUALIZAR);
  const podeCriar = temPermissao(PERMISSAO_AGENDA_CRIAR);
  const {
    data: eventos = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: agendaQueryKeys.lista(empresaEfetivaId ?? ""),
    queryFn: listarAgenda,
    enabled:
      !carregando &&
      possuiEmpresa &&
      podeVisualizar &&
      Boolean(empresaEfetivaId),
  });

  if (carregando)
    return (
      <AppLayout>
        <CrudLoading />
      </AppLayout>
    );
  if (!podeVisualizar)
    return (
      <AppLayout>
        <AcessoNegado />
      </AppLayout>
    );
  if (!possuiEmpresa)
    return (
      <AppLayout>
        <EmpresaNaoSelecionada />
      </AppLayout>
    );

  return (
    <AppLayout>
      <div className="min-w-0 space-y-6">
        <PageHeader
          title="Agenda"
          description="Gerencie atendimentos, compromissos e acompanhamentos da empresa."
          actions={podeCriar ? <NovoEventoModal /> : undefined}
        />

        <AgendaSummaryCards eventos={eventos} />

        <CrudCard>
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              Erro ao carregar agenda.
            </div>
          )}

          {isLoading ? <CrudLoading /> : <AgendaView eventos={eventos} />}
        </CrudCard>
      </div>
    </AppLayout>
  );
}
