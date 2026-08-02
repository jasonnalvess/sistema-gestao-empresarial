"use client";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { EmpresaNaoSelecionada } from "@/components/common/EmpresaNaoSelecionada";
import { CrudLoading } from "@/components/crud/CrudLoading";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { DashboardWelcome } from "@/components/dashboard/DashboardWelcome";
import { DashboardRecentMovements } from "@/components/dashboard/DashboardRecentMovements";
import { DashboardLowStock } from "@/components/dashboard/DashboardLowStock";
import { DashboardMovementsChart } from "@/components/dashboard/DashboardMovementsChart";
import { DashboardQuickActions } from "@/components/dashboard/DashboardQuickActions";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";
import { obterResumoDashboard } from "@/services/dashboard.service";
import { listarMovimentacoes } from "@/services/movimentacoes.service";
import { listarEstoque } from "@/services/estoque.service";

export default function DashboardPage() {
  const { empresaSelecionadaId, empresaEfetivaId, carregando, requerSelecao } = useEmpresaSelecionada();
  const possuiEmpresa = !requerSelecao || Boolean(empresaSelecionadaId);
  const enabled = possuiEmpresa && Boolean(empresaEfetivaId) && !carregando;
  const { data: resumo, isLoading, error } = useQuery({ queryKey: estoqueQueryKeys.dashboardResumo(empresaEfetivaId ?? ""), queryFn: obterResumoDashboard, enabled });
  const { data: movimentacoesResponse } = useQuery({ queryKey: estoqueQueryKeys.dashboardMovimentacoes(empresaEfetivaId ?? ""), queryFn: () => listarMovimentacoes({ page: 1, limit: 5, sortBy: "createdAt", order: "desc" }), enabled });
  const { data: estoqueResponse } = useQuery({ queryKey: estoqueQueryKeys.dashboardEstoqueBaixo(empresaEfetivaId ?? ""), queryFn: () => listarEstoque({ page: 1, limit: 10, sortBy: "quantidadeAtual", order: "asc" }), enabled });
  if (carregando) return <AppLayout><CrudLoading /></AppLayout>;
  if (!possuiEmpresa) return <AppLayout><EmpresaNaoSelecionada /></AppLayout>;
  if (isLoading) return <AppLayout><p className="text-slate-600">Carregando dashboard...</p></AppLayout>;
  if (error) return <AppLayout><div className="rounded-xl bg-red-50 p-4 text-red-700">Erro ao carregar dashboard.</div></AppLayout>;
  return <AppLayout><div className="space-y-6"><PageHeader title="Dashboard" description="Resumo geral do Sistema de Gestão Empresarial." /><DashboardWelcome /><DashboardQuickActions />{resumo && <DashboardStats resumo={resumo} />}<div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><DashboardRecentMovements movimentacoes={movimentacoesResponse?.data ?? []} /><DashboardLowStock itens={estoqueResponse?.data ?? []} /></div><DashboardMovementsChart movimentacoes={movimentacoesResponse?.data ?? []} /></div></AppLayout>;
}
