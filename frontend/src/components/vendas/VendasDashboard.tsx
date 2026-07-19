"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  Ban,
  Banknote,
  CheckCircle2,
  Clock3,
  FileEdit,
  HandCoins,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import {
  dashboardVendas,
  DashboardVendasResponse,
} from "@/services/vendas.service";

import {
  DashboardCard,
  DashboardGrid,
  DashboardStatusCard,
} from "@/components/dashboard";

interface VendasDashboardProps {
  clienteId?: string;
  depositoId?: string;
  dataInicio?: string;
  dataFim?: string;
}

export function VendasDashboard({
  clienteId,
  depositoId,
  dataInicio,
  dataFim,
}: VendasDashboardProps) {
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      "vendas-dashboard",
      clienteId,
      depositoId,
      dataInicio,
      dataFim,
    ],

    queryFn: () =>
      dashboardVendas({
        clienteId:
          clienteId || undefined,

        depositoId:
          depositoId || undefined,

        dataInicio:
          dataInicio || undefined,

        dataFim:
          dataFim || undefined,
      }),
  });

  if (isLoading) {
    return <DashboardLoading />;
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Não foi possível carregar os indicadores de vendas.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <DashboardGrid>
        <DashboardCard
          title="Total vendido"
          value={formatarMoeda(
            data.indicadores
              .valorTotalVendido,
          )}
          description={`${data.indicadores.totalVendas} venda(s)`}
          icon={
            <ShoppingCart size={20} />
          }
        />

        <DashboardCard
          title="Ticket médio"
          value={formatarMoeda(
            data.indicadores.ticketMedio,
          )}
          description="Valor médio por venda"
          icon={
            <TrendingUp size={20} />
          }
        />

        <DashboardCard
          title="Valor recebido"
          value={formatarMoeda(
            data.financeiro.valorRecebido,
          )}
          description={`${formatarPercentual(
            data.financeiro
              .percentualRecebido,
          )} recebido`}
          icon={<HandCoins size={20} />}
        />

        <DashboardCard
          title="Valor em aberto"
          value={formatarMoeda(
            data.financeiro.valorEmAberto,
          )}
          description={`${data.financeiro.quantidadeContas} conta(s) gerada(s)`}
          icon={
            <WalletCards size={20} />
          }
        />
      </DashboardGrid>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <DashboardStatusCard
          title="Rascunho"
          value={
            data.vendasPorStatus.rascunho
          }
          color="bg-slate-100 text-slate-700"
          icon={<FileEdit size={18} />}
        />

        <DashboardStatusCard
          title="Pendente"
          value={
            data.vendasPorStatus.pendente
          }
          color="bg-amber-100 text-amber-700"
          icon={<Clock3 size={18} />}
        />

        <DashboardStatusCard
          title="Aprovada"
          value={
            data.vendasPorStatus.aprovada
          }
          color="bg-blue-100 text-blue-700"
          icon={
            <CheckCircle2 size={18} />
          }
        />

        <DashboardStatusCard
          title="Faturada"
          value={
            data.vendasPorStatus.faturada
          }
          color="bg-purple-100 text-purple-700"
          icon={
            <ReceiptText size={18} />
          }
        />

        <DashboardStatusCard
          title="Concluída"
          value={
            data.vendasPorStatus.concluida
          }
          color="bg-green-100 text-green-700"
          icon={
            <BadgeCheck size={18} />
          }
        />

        <DashboardStatusCard
          title="Cancelada"
          value={
            data.vendasPorStatus.cancelada
          }
          color="bg-red-100 text-red-700"
          icon={<Ban size={18} />}
        />
      </div>

      <ResumoFinanceiro data={data} />
    </div>
  );
}

function ResumoFinanceiro({
  data,
}: {
  data: DashboardVendasResponse;
}) {
  return (
    <DashboardGrid>
      <DashboardCard
        title="Valor dos produtos"
        value={formatarMoeda(
          data.indicadores.valorProdutos,
        )}
        icon={<Banknote size={20} />}
      />

      <DashboardCard
        title="Descontos concedidos"
        value={formatarMoeda(
          data.indicadores
            .valorDescontos,
        )}
        icon={<TrendingUp size={20} />}
      />

      <DashboardCard
        title="Fretes"
        value={formatarMoeda(
          data.indicadores.valorFretes,
        )}
        icon={<ReceiptText size={20} />}
      />

      <DashboardCard
        title="Outros valores"
        value={formatarMoeda(
          data.indicadores.valorOutros,
        )}
        icon={
          <WalletCards size={20} />
        }
      />
    </DashboardGrid>
  );
}

function DashboardLoading() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({
          length: 4,
        }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-xl bg-slate-200"
          />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({
          length: 6,
        }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-xl bg-slate-200"
          />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({
          length: 4,
        }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-xl bg-slate-200"
          />
        ))}
      </div>
    </div>
  );
}

function formatarMoeda(
  valor: number,
) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarPercentual(
  valor: number,
) {
  return `${valor.toLocaleString(
    "pt-BR",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
  )}%`;
}