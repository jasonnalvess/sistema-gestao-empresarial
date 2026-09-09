"use client";

import { useQuery } from "@tanstack/react-query";

import { AcessoNegado } from "@/components/common/AcessoNegado";
import { EmpresaNaoSelecionada } from "@/components/common/EmpresaNaoSelecionada";
import { PageHeader } from "@/components/common/PageHeader";
import { CrudLoading } from "@/components/crud/CrudLoading";
import { DashboardLowStock } from "@/components/dashboard/DashboardLowStock";
import { DashboardMovementsChart } from "@/components/dashboard/DashboardMovementsChart";
import { DashboardQuickActions } from "@/components/dashboard/DashboardQuickActions";
import { DashboardRecentMovements } from "@/components/dashboard/DashboardRecentMovements";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { DashboardWelcome } from "@/components/dashboard/DashboardWelcome";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import {
  PERMISSAO_DASHBOARD_VISUALIZAR,
  PERMISSAO_ESTOQUE_VISUALIZAR,
  PERMISSAO_MOVIMENTACOES_VISUALIZAR,
} from "@/lib/auth";
import { dashboardQueryKeys } from "@/lib/dashboard-query-keys";
import { obterResumoDashboard } from "@/services/dashboard.service";
import { listarEstoque } from "@/services/estoque.service";
import { listarMovimentacoes } from "@/services/movimentacoes.service";

const filtrosMovimentacoes = {
  page: 1,
  limit: 5,
  sortBy: "createdAt",
  order: "desc" as const,
};

const filtrosEstoqueBaixo = {
  page: 1,
  limit: 10,
  sortBy: "quantidadeAtual",
  order: "asc" as const,
};

export default function DashboardPage() {
  const { temPermissao } = useAuth();
  const {
    empresaSelecionadaId,
    empresaEfetivaId,
    carregando,
    requerSelecao,
  } = useEmpresaSelecionada();
  const podeVisualizar = temPermissao(PERMISSAO_DASHBOARD_VISUALIZAR);
  const podeVisualizarMovimentacoes = temPermissao(
    PERMISSAO_MOVIMENTACOES_VISUALIZAR,
  );
  const podeVisualizarEstoque = temPermissao(PERMISSAO_ESTOQUE_VISUALIZAR);
  const possuiEmpresa = !requerSelecao || Boolean(empresaSelecionadaId);
  const contextoPronto =
    !carregando && possuiEmpresa && Boolean(empresaEfetivaId);

  const {
    data: resumo,
    isLoading,
    error,
  } = useQuery({
    queryKey: dashboardQueryKeys.resumo(empresaEfetivaId ?? ""),
    queryFn: obterResumoDashboard,
    enabled: podeVisualizar && contextoPronto,
  });
  const { data: movimentacoesResponse } = useQuery({
    queryKey: dashboardQueryKeys.movimentacoes(
      empresaEfetivaId ?? "",
      filtrosMovimentacoes.page,
      filtrosMovimentacoes.limit,
      filtrosMovimentacoes.sortBy,
      filtrosMovimentacoes.order,
    ),
    queryFn: () => listarMovimentacoes(filtrosMovimentacoes),
    enabled:
      podeVisualizar && podeVisualizarMovimentacoes && contextoPronto,
  });
  const { data: estoqueResponse } = useQuery({
    queryKey: dashboardQueryKeys.estoqueBaixo(
      empresaEfetivaId ?? "",
      filtrosEstoqueBaixo.page,
      filtrosEstoqueBaixo.limit,
      filtrosEstoqueBaixo.sortBy,
      filtrosEstoqueBaixo.order,
    ),
    queryFn: () => listarEstoque(filtrosEstoqueBaixo),
    enabled: podeVisualizar && podeVisualizarEstoque && contextoPronto,
  });

  if (carregando) {
    return (
      <AppLayout>
        <CrudLoading />
      </AppLayout>
    );
  }
  if (!podeVisualizar) {
    return (
      <AppLayout>
        <AcessoNegado />
      </AppLayout>
    );
  }
  if (!possuiEmpresa || !empresaEfetivaId) {
    return (
      <AppLayout>
        <EmpresaNaoSelecionada />
      </AppLayout>
    );
  }
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
      <div className="min-w-0 space-y-6">
        <PageHeader
          title="Dashboard"
          description="Resumo geral do Sistema de Gestão Empresarial."
        />
        <DashboardWelcome />
        <DashboardQuickActions />
        {resumo && <DashboardStats resumo={resumo} />}
        {(podeVisualizarMovimentacoes || podeVisualizarEstoque) && (
          <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
            {podeVisualizarMovimentacoes && (
              <DashboardRecentMovements
                movimentacoes={movimentacoesResponse?.data ?? []}
              />
            )}
            {podeVisualizarEstoque && (
              <DashboardLowStock itens={estoqueResponse?.data ?? []} />
            )}
          </div>
        )}
        {podeVisualizarMovimentacoes && (
          <DashboardMovementsChart
            movimentacoes={movimentacoesResponse?.data ?? []}
          />
        )}
      </div>
    </AppLayout>
  );
}
