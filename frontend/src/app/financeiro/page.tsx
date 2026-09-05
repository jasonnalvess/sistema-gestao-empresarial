"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarRange,
  CircleDollarSign,
  Clock3,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { AcessoNegado } from "@/components/common/AcessoNegado";
import { EmpresaNaoSelecionada } from "@/components/common/EmpresaNaoSelecionada";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_FINANCEIRO_VISUALIZAR } from "@/lib/auth";
import { financeiroQueryKeys } from "@/lib/financeiro-query-keys";
import { PageHeader } from "@/components/common/PageHeader";
import { CrudCard } from "@/components/crud/CrudCard";
import { CrudLoading } from "@/components/crud/CrudLoading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { buscarResumoFinanceiro } from "@/services/financeiro.service";

export default function FinanceiroPage() {
  const { temPermissao } = useAuth();
  const { empresaSelecionadaId, empresaEfetivaId, carregando, requerSelecao } =
    useEmpresaSelecionada();
  const possuiEmpresa = !requerSelecao || Boolean(empresaSelecionadaId);
  const podeVisualizar = temPermissao(PERMISSAO_FINANCEIRO_VISUALIZAR);
  const hoje = new Date();

  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  const [vencimentoInicio, setVencimentoInicio] = useState(primeiroDiaMes);

  const [vencimentoFim, setVencimentoFim] = useState(ultimoDiaMes);

  const [filtrosAplicados, setFiltrosAplicados] = useState({
    vencimentoInicio: primeiroDiaMes,
    vencimentoFim: ultimoDiaMes,
  });

  const {
    data: resumo,
    isLoading,
    error,
  } = useQuery({
    queryKey: financeiroQueryKeys.resumo(empresaEfetivaId ?? "", {
      vencimentoInicio: filtrosAplicados.vencimentoInicio || undefined,
      vencimentoFim: filtrosAplicados.vencimentoFim || undefined,
    }),

    queryFn: () =>
      buscarResumoFinanceiro({
        vencimentoInicio: filtrosAplicados.vencimentoInicio || undefined,

        vencimentoFim: filtrosAplicados.vencimentoFim || undefined,
      }),
    enabled:
      !carregando &&
      possuiEmpresa &&
      podeVisualizar &&
      Boolean(empresaEfetivaId),
  });

  function aplicarPeriodo() {
    setFiltrosAplicados({
      vencimentoInicio,
      vencimentoFim,
    });
  }

  function limparPeriodo() {
    setVencimentoInicio("");
    setVencimentoFim("");

    setFiltrosAplicados({
      vencimentoInicio: "",
      vencimentoFim: "",
    });
  }

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
          title="Financeiro"
          description="Visão consolidada das contas a pagar e a receber."
          actions={
            <div className="grid w-full min-w-0 grid-cols-1 gap-2 lg:flex lg:w-auto lg:flex-wrap [&>*]:w-full md:[&>*]:w-full lg:[&>*]:w-auto">
              <Button variant="outline" asChild>
                <Link href="/contas-pagar">
                  <ArrowDownCircle size={16} className="mr-2" />
                  Contas a pagar
                </Link>
              </Button>

              <Button variant="outline" asChild>
                <Link href="/contas-receber">
                  <ArrowUpCircle size={16} className="mr-2" />
                  Contas a receber
                </Link>
              </Button>
            </div>
          }
        />

        <CrudCard>
          <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end [&>*]:w-full lg:[&>*]:w-auto">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Vencimento inicial
              </label>

              <Input
                type="date"
                value={vencimentoInicio}
                onChange={(event) => setVencimentoInicio(event.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Vencimento final
              </label>

              <Input
                type="date"
                value={vencimentoFim}
                onChange={(event) => setVencimentoFim(event.target.value)}
              />
            </div>

            <Button onClick={aplicarPeriodo}>
              <CalendarRange size={16} className="mr-2" />
              Aplicar período
            </Button>

            <Button variant="outline" onClick={limparPeriodo}>
              Todo o período
            </Button>
          </div>
        </CrudCard>

        {error && (
          <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">
            Erro ao carregar o resumo financeiro.
          </div>
        )}

        {isLoading ? (
          <CrudLoading />
        ) : resumo ? (
          <>
            <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <ResumoCard
                titulo="Saldo projetado"
                valor={resumo.consolidado.saldoProjetado}
                descricao="A receber menos a pagar"
                icone={<CircleDollarSign size={20} />}
                destaque
              />

              <ResumoCard
                titulo="Resultado realizado"
                valor={resumo.consolidado.resultadoRealizado}
                descricao="Recebido menos pago"
                icone={<WalletCards size={20} />}
              />

              <ResumoCard
                titulo="Contas em aberto"
                valorTexto={String(resumo.consolidado.contasEmAberto)}
                descricao="Pagar e receber"
                icone={<Clock3 size={20} />}
              />

              <ResumoCard
                titulo="Contas vencidas"
                valorTexto={String(resumo.consolidado.contasVencidas)}
                descricao="Obrigações em atraso"
                icone={<CalendarRange size={20} />}
              />
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
              <CrudCard>
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-lg bg-red-50 p-2 text-red-700">
                    <TrendingDown size={20} />
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Contas a pagar
                    </h2>

                    <p className="text-sm text-slate-500">
                      Obrigações financeiras da empresa
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <LinhaValor
                    label="Valor lançado"
                    valor={resumo.pagar.valorOriginal}
                  />

                  <LinhaValor
                    label="Valor pago"
                    valor={resumo.pagar.valorPago}
                  />

                  <LinhaValor
                    label="Saldo em aberto"
                    valor={resumo.pagar.valorAberto}
                    destaque
                  />

                  <LinhaValor
                    label="Valor vencido"
                    valor={resumo.pagar.valorVencido}
                  />

                  <LinhaQuantidade
                    label="Total de contas"
                    valor={resumo.pagar.quantidade}
                  />

                  <LinhaQuantidade
                    label="Contas em aberto"
                    valor={resumo.pagar.quantidadeEmAberto}
                  />

                  <LinhaQuantidade
                    label="Contas vencidas"
                    valor={resumo.pagar.quantidadeVencidas}
                  />
                </div>
              </CrudCard>

              <CrudCard>
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-lg bg-green-50 p-2 text-green-700">
                    <TrendingUp size={20} />
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Contas a receber
                    </h2>

                    <p className="text-sm text-slate-500">
                      Valores esperados dos clientes
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <LinhaValor
                    label="Valor lançado"
                    valor={resumo.receber.valorOriginal}
                  />

                  <LinhaValor
                    label="Valor recebido"
                    valor={resumo.receber.valorRecebido}
                  />

                  <LinhaValor
                    label="Saldo em aberto"
                    valor={resumo.receber.valorAberto}
                    destaque
                  />

                  <LinhaValor
                    label="Valor vencido"
                    valor={resumo.receber.valorVencido}
                  />

                  <LinhaQuantidade
                    label="Total de contas"
                    valor={resumo.receber.quantidade}
                  />

                  <LinhaQuantidade
                    label="Contas em aberto"
                    valor={resumo.receber.quantidadeEmAberto}
                  />

                  <LinhaQuantidade
                    label="Contas vencidas"
                    valor={resumo.receber.quantidadeVencidas}
                  />
                </div>
              </CrudCard>
            </div>

            <CrudCard>
              <h2 className="mb-5 text-lg font-semibold text-slate-900">
                Indicadores financeiros
              </h2>

              <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Indicador
                  titulo="Descontos concedidos"
                  valor={resumo.receber.descontos}
                />

                <Indicador
                  titulo="Descontos obtidos"
                  valor={resumo.pagar.descontos}
                />

                <Indicador
                  titulo="Juros recebidos"
                  valor={resumo.receber.juros}
                />

                <Indicador titulo="Juros pagos" valor={resumo.pagar.juros} />

                <Indicador
                  titulo="Multas recebidas"
                  valor={resumo.receber.multas}
                />

                <Indicador titulo="Multas pagas" valor={resumo.pagar.multas} />
              </div>
            </CrudCard>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}

function ResumoCard({
  titulo,
  valor,
  valorTexto,
  descricao,
  icone,
  destaque = false,
}: {
  titulo: string;
  valor?: number;
  valorTexto?: string;
  descricao: string;
  icone: React.ReactNode;
  destaque?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{titulo}</p>

          <p
            className={
              destaque
                ? "mt-2 text-2xl font-bold text-slate-900"
                : "mt-2 text-2xl font-semibold text-slate-900"
            }
          >
            {valorTexto ?? formatarMoeda(valor ?? 0)}
          </p>

          <p className="mt-1 text-xs text-slate-500">{descricao}</p>
        </div>

        <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
          {icone}
        </div>
      </div>
    </div>
  );
}

function LinhaValor({
  label,
  valor,
  destaque = false,
}: {
  label: string;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-sm text-slate-600">{label}</span>

      <span
        className={
          destaque ? "font-bold text-slate-900" : "font-medium text-slate-900"
        }
      >
        {formatarMoeda(valor)}
      </span>
    </div>
  );
}

function LinhaQuantidade({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-sm text-slate-600">{label}</span>

      <span className="font-medium text-slate-900">{valor}</span>
    </div>
  );
}

function Indicador({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="text-sm text-slate-500">{titulo}</p>

      <p className="mt-2 text-lg font-semibold text-slate-900">
        {formatarMoeda(valor)}
      </p>
    </div>
  );
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
