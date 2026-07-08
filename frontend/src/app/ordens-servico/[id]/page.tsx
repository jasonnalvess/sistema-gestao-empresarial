"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { CalendarDays, UserRound, Wrench, AlertTriangle } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { CrudCard } from "@/components/crud/CrudCard";
import { CrudLoading } from "@/components/crud/CrudLoading";
import { CrudEmpty } from "@/components/crud/CrudEmpty";
import { Button } from "@/components/ui/button";
import { OrdemServicoHistoricoCard } from "@/components/ordens-servico/OrdemServicoHistoricoCard";
import { AlterarStatusOrdemServicoCard } from "@/components/ordens-servico/AlterarStatusOrdemServicoCard";
import { OrdemServicoStatusBadge } from "@/components/ordens-servico/OrdemServicoStatusBadge";
import { OrdemServicoPrioridadeBadge } from "@/components/ordens-servico/OrdemServicoPrioridadeBadge";

import { buscarOrdemServicoPorId } from "@/services/ordens-servico.service";

export default function OrdemServicoDetalhesPage() {
  const params = useParams();
  const ordemId = params.id as string;

  const { data: ordem, isLoading, error } = useQuery({
    queryKey: ["ordem-servico", ordemId],
    queryFn: () => buscarOrdemServicoPorId(ordemId),
    enabled: !!ordemId,
  });

  if (isLoading) {
    return (
      <AppLayout>
        <CrudLoading />
      </AppLayout>
    );
  }

  if (error || !ordem) {
    return (
      <AppLayout>
        <CrudEmpty message="Ordem de serviço não encontrada." />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title={`OS #${ordem.numero}`}
          description={ordem.titulo}
          actions={
            <Button asChild variant="outline" size="sm">
              <Link href="/ordens-servico">Voltar</Link>
            </Button>
          }
        />

        <div className="grid gap-4 md:grid-cols-4">
          <CrudCard>
            <Wrench className="mb-2 text-blue-600" size={22} />
            <p className="text-sm text-slate-500">Status</p>
            <OrdemServicoStatusBadge status={ordem.status} />
          </CrudCard>

          <CrudCard>
            <AlertTriangle className="mb-2 text-orange-600" size={22} />
            <p className="text-sm text-slate-500">Prioridade</p>
            <OrdemServicoPrioridadeBadge prioridade={ordem.prioridade} />
          </CrudCard>

          <CrudCard>
            <UserRound className="mb-2 text-green-600" size={22} />
            <p className="text-sm text-slate-500">Cliente</p>
            <p className="font-semibold text-slate-900">
              {ordem.cliente?.nome || "-"}
            </p>
          </CrudCard>

          <CrudCard>
            <CalendarDays className="mb-2 text-purple-600" size={22} />
            <p className="text-sm text-slate-500">Abertura</p>
            <p className="font-semibold text-slate-900">
              {new Date(ordem.dataAbertura).toLocaleString("pt-BR")}
            </p>
          </CrudCard>
        </div>

        <CrudCard>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Dados da OS
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-slate-500">Título</p>
              <p className="font-medium text-slate-900">{ordem.titulo}</p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Responsável</p>
              <p className="font-medium text-slate-900">
                {ordem.responsavel?.nome || "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Data prevista</p>
              <p className="font-medium text-slate-900">
                {ordem.dataPrevista
                  ? new Date(ordem.dataPrevista).toLocaleString("pt-BR")
                  : "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Conclusão</p>
              <p className="font-medium text-slate-900">
                {ordem.dataConclusao
                  ? new Date(ordem.dataConclusao).toLocaleString("pt-BR")
                  : "-"}
              </p>
            </div>
          </div>

          {ordem.descricao && (
            <div className="mt-4">
              <p className="text-sm text-slate-500">Descrição</p>
              <p className="font-medium text-slate-900">{ordem.descricao}</p>
            </div>
          )}

          {ordem.observacao && (
            <div className="mt-4">
              <p className="text-sm text-slate-500">Observação interna</p>
              <p className="font-medium text-slate-900">{ordem.observacao}</p>
            </div>
          )}
        </CrudCard>

        <CrudCard>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Alterar status
          </h2>

          <AlterarStatusOrdemServicoCard ordem={ordem} />
        </CrudCard>

        <CrudCard>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Histórico da OS
          </h2>

          <OrdemServicoHistoricoCard ordemServicoId={ordem.id} />
        </CrudCard>
      </div>
    </AppLayout>
  );
}
