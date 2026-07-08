"use client";

import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { obterResumoDashboard } from "@/services/dashboard.service";
import { DashboardWelcome } from "@/components/dashboard/DashboardWelcome";
import { DashboardRecentMovements } from "@/components/dashboard/DashboardRecentMovements";
import { listarMovimentacoes } from "@/services/movimentacoes.service";
import { DashboardLowStock } from "@/components/dashboard/DashboardLowStock";
import { listarEstoque } from "@/services/estoque.service";
import { DashboardMovementsChart } from "@/components/dashboard/DashboardMovementsChart";
import { DashboardQuickActions } from "@/components/dashboard/DashboardQuickActions";

export default function DashboardPage() {
  const { data: resumo, isLoading, error } = useQuery({
    queryKey: ["dashboard-resumo"],
    queryFn: obterResumoDashboard,
  });

  const { data: movimentacoesResponse } = useQuery({
    queryKey: ["dashboard-movimentacoes"],
    queryFn: () =>
      listarMovimentacoes({
        page: 1,
        limit: 5,
        sortBy: "createdAt",
        order: "desc",
      }),
  });

  const { data: estoqueResponse } = useQuery({
    queryKey: ["dashboard-estoque-baixo"],
    queryFn: () =>
      listarEstoque({
        page: 1,
        limit: 10,
        sortBy: "quantidadeAtual",
        order: "asc",
      }),
  });

  if (isLoading) {
    return (
      <AppLayout>
        <p className="text-slate-600">Carregando dashboard...</p>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="rounded-xl bg-red-50 p-4 text-red-700">
          Erro ao carregar dashboard.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description="Resumo geral do Sistema de Gestão Empresarial."
        />

        <DashboardWelcome />

        <DashboardQuickActions />

        {resumo && <DashboardStats resumo={resumo} />}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <DashboardRecentMovements
            movimentacoes={movimentacoesResponse?.data ?? []}
          />

          <DashboardLowStock itens={estoqueResponse?.data ?? []} />
        </div>

        <DashboardMovementsChart
          movimentacoes={movimentacoesResponse?.data ?? []}
        />
      </div>
    </AppLayout>
  );
}
