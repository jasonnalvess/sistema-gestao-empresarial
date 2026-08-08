"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  ArrowDownCircle,
  ArrowLeft,
  ArrowUpCircle,
  CircleDollarSign,
  ListFilter,
} from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { AcessoNegado } from "@/components/common/AcessoNegado";
import { EmpresaNaoSelecionada } from "@/components/common/EmpresaNaoSelecionada";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_CAIXA_VISUALIZAR } from "@/lib/auth";
import { caixasQueryKeys } from "@/lib/caixas-query-keys";
import { PageHeader } from "@/components/common/PageHeader";
import { CrudCard } from "@/components/crud/CrudCard";
import { CrudToolbar } from "@/components/crud/CrudToolbar";
import { CrudSearch } from "@/components/crud/CrudSearch";
import { CrudPagination } from "@/components/crud/CrudPagination";
import { CrudEmpty } from "@/components/crud/CrudEmpty";
import { CrudLoading } from "@/components/crud/CrudLoading";

import { Button } from "@/components/ui/button";

import {
  listarCaixas,
  listarMovimentacoesCaixa,
  buscarResumoCaixas,
  OrigemMovimentacaoCaixa,
  TipoMovimentacaoCaixa,
} from "@/services/caixas.service";

export default function MovimentacoesCaixaPage() {
  const { temPermissao } = useAuth();
  const { empresaSelecionadaId, empresaEfetivaId, carregando, requerSelecao } =
    useEmpresaSelecionada();
  const possuiEmpresa = !requerSelecao || Boolean(empresaSelecionadaId);
  const podeVisualizar = temPermissao(PERMISSAO_CAIXA_VISUALIZAR);
  const [search, setSearch] = useState("");
  const [searchAplicado, setSearchAplicado] = useState("");

  const [caixaId, setCaixaId] = useState("");
  const [tipo, setTipo] = useState("");
  const [origem, setOrigem] = useState("");

  const [dataInicio, setDataInicio] = useState("");

  const [dataFim, setDataFim] = useState("");

  const [filtrosAplicados, setFiltrosAplicados] = useState({
    caixaId: "",
    tipo: "",
    origem: "",
    dataInicio: "",
    dataFim: "",
  });

  const [page, setPage] = useState(1);

  const { data: caixasResponse } = useQuery({
    queryKey: caixasQueryKeys.lista(empresaEfetivaId ?? "", {
      ativo: true,
      page: 1,
      limit: 100,
      sortBy: "nome",
      order: "asc",
    }),

    queryFn: () =>
      listarCaixas({
        ativo: true,
        page: 1,
        limit: 100,
        sortBy: "nome",
        order: "asc",
      }),
    enabled:
      !carregando &&
      possuiEmpresa &&
      podeVisualizar &&
      Boolean(empresaEfetivaId),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: caixasQueryKeys.movimentacoesLista(empresaEfetivaId ?? "", {
      search: searchAplicado || undefined,
      caixaId: filtrosAplicados.caixaId || undefined,
      tipo: filtrosAplicados.tipo
        ? (filtrosAplicados.tipo as TipoMovimentacaoCaixa)
        : undefined,
      origem: filtrosAplicados.origem
        ? (filtrosAplicados.origem as OrigemMovimentacaoCaixa)
        : undefined,
      dataInicio: filtrosAplicados.dataInicio || undefined,
      dataFim: filtrosAplicados.dataFim || undefined,
      page,
      limit: 10,
      sortBy: "dataMovimentacao",
      order: "desc",
    }),

    queryFn: () =>
      listarMovimentacoesCaixa({
        search: searchAplicado || undefined,

        caixaId: filtrosAplicados.caixaId || undefined,

        tipo: filtrosAplicados.tipo
          ? (filtrosAplicados.tipo as TipoMovimentacaoCaixa)
          : undefined,

        origem: filtrosAplicados.origem
          ? (filtrosAplicados.origem as OrigemMovimentacaoCaixa)
          : undefined,

        dataInicio: filtrosAplicados.dataInicio || undefined,

        dataFim: filtrosAplicados.dataFim || undefined,

        page,
        limit: 10,
        sortBy: "dataMovimentacao",
        order: "desc",
      }),
    enabled:
      !carregando &&
      possuiEmpresa &&
      podeVisualizar &&
      Boolean(empresaEfetivaId),
  });

  const { data: resumo } = useQuery({
    queryKey: caixasQueryKeys.resumo(empresaEfetivaId ?? "", {
      search: searchAplicado || undefined,
      caixaId: filtrosAplicados.caixaId || undefined,
      tipo: filtrosAplicados.tipo
        ? (filtrosAplicados.tipo as TipoMovimentacaoCaixa)
        : undefined,
      origem: filtrosAplicados.origem
        ? (filtrosAplicados.origem as OrigemMovimentacaoCaixa)
        : undefined,
      dataInicio: filtrosAplicados.dataInicio || undefined,
      dataFim: filtrosAplicados.dataFim || undefined,
    }),

    queryFn: () =>
      buscarResumoCaixas({
        search: searchAplicado || undefined,

        caixaId: filtrosAplicados.caixaId || undefined,

        tipo: filtrosAplicados.tipo
          ? (filtrosAplicados.tipo as TipoMovimentacaoCaixa)
          : undefined,

        origem: filtrosAplicados.origem
          ? (filtrosAplicados.origem as OrigemMovimentacaoCaixa)
          : undefined,

        dataInicio: filtrosAplicados.dataInicio || undefined,

        dataFim: filtrosAplicados.dataFim || undefined,
      }),
    enabled:
      !carregando &&
      possuiEmpresa &&
      podeVisualizar &&
      Boolean(empresaEfetivaId),
  });

  const movimentacoes = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  function aplicarFiltros() {
    setPage(1);

    setFiltrosAplicados({
      caixaId,
      tipo,
      origem,
      dataInicio,
      dataFim,
    });
  }

  function pesquisar() {
    setPage(1);
    setSearchAplicado(search);
  }

  function limparFiltros() {
    setSearch("");
    setSearchAplicado("");

    setCaixaId("");
    setTipo("");
    setOrigem("");
    setDataInicio("");
    setDataFim("");

    setFiltrosAplicados({
      caixaId: "",
      tipo: "",
      origem: "",
      dataInicio: "",
      dataFim: "",
    });

    setPage(1);
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
          title="Movimentações de Caixa"
          description="Consulta consolidada de entradas, saídas e integrações financeiras."
          actions={
            <Button variant="outline" asChild>
              <Link href="/caixas">
                <ArrowLeft size={16} className="mr-2" />
                Voltar para caixas
              </Link>
            </Button>
          }
        />

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ResumoCard
            titulo="Entradas"
            valor={formatarMoeda(resumo?.movimentacoes.entradas ?? 0)}
            descricao={`${resumo?.movimentacoes.quantidadeEntradas ?? 0} movimentações`}
            icone={<ArrowUpCircle size={20} />}
          />

          <ResumoCard
            titulo="Saídas"
            valor={formatarMoeda(resumo?.movimentacoes.saidas ?? 0)}
            descricao={`${resumo?.movimentacoes.quantidadeSaidas ?? 0} movimentações`}
            icone={<ArrowDownCircle size={20} />}
          />

          <ResumoCard
            titulo="Resultado"
            valor={formatarMoeda(resumo?.movimentacoes.resultado ?? 0)}
            descricao="Entradas menos saídas"
            icone={<CircleDollarSign size={20} />}
          />

          <ResumoCard
            titulo="Total de movimentações"
            valor={String(resumo?.movimentacoes.quantidadeTotal ?? 0)}
            descricao="No período selecionado"
            icone={<ListFilter size={20} />}
          />
        </div>

        <CrudCard>
          <CrudToolbar>
            <CrudSearch
              value={search}
              onChange={setSearch}
              onSearch={pesquisar}
              placeholder="Pesquisar por descrição, documento, observação ou caixa..."
            />
          </CrudToolbar>

          <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <select
              value={caixaId}
              onChange={(event) => setCaixaId(event.target.value)}
              className="h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-base md:text-sm"
            >
              <option value="">Todos os caixas</option>

              {caixasResponse?.data.map((caixa) => (
                <option key={caixa.id} value={caixa.id}>
                  {caixa.nome} — {caixa.codigo}
                </option>
              ))}
            </select>

            <select
              value={tipo}
              onChange={(event) => setTipo(event.target.value)}
              className="h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-base md:text-sm"
            >
              <option value="">Entradas e saídas</option>

              <option value="ENTRADA">Entradas</option>

              <option value="SAIDA">Saídas</option>
            </select>

            <select
              value={origem}
              onChange={(event) => setOrigem(event.target.value)}
              className="h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-base md:text-sm"
            >
              <option value="">Todas as origens</option>

              <option value="MANUAL">Manual</option>

              <option value="CONTA_PAGAR">Conta a pagar</option>

              <option value="CONTA_RECEBER">Conta a receber</option>

              <option value="VENDA">Venda</option>

              <option value="AJUSTE">Ajuste</option>

              <option value="OUTRA">Outra</option>
            </select>

            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Data inicial
              </label>

              <input
                type="date"
                value={dataInicio}
                onChange={(event) => setDataInicio(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Data final
              </label>

              <input
                type="date"
                value={dataFim}
                onChange={(event) => setDataFim(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>

            <div className="flex flex-col gap-2 lg:flex-row lg:items-end [&>*]:w-full lg:[&>*]:w-auto">
              <Button onClick={aplicarFiltros}>Aplicar filtros</Button>

              <Button variant="outline" onClick={limparFiltros}>
                Limpar
              </Button>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              Erro ao carregar movimentações de caixa.
            </div>
          )}

          {isLoading ? (
            <CrudLoading />
          ) : (
            <>
              <div className="mt-5 min-w-0 max-w-full overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="p-3">Data</th>

                      <th className="p-3">Caixa</th>

                      <th className="p-3">Tipo</th>

                      <th className="p-3">Origem</th>

                      <th className="p-3">Descrição</th>

                      <th className="p-3">Documento</th>

                      <th className="p-3">Usuário</th>

                      <th className="p-3 text-right">Valor</th>

                      <th className="p-3 text-right">Saldo posterior</th>

                      <th className="p-3 text-right">Referência</th>
                    </tr>
                  </thead>

                  <tbody>
                    {movimentacoes.map((movimentacao) => (
                      <tr
                        key={movimentacao.id}
                        className="border-b last:border-0"
                      >
                        <td className="p-3">
                          {formatarDataHora(movimentacao.dataMovimentacao)}
                        </td>

                        <td className="p-3">
                          {movimentacao.caixa ? (
                            <Link
                              href={`/caixas/${movimentacao.caixa.id}`}
                              className="font-medium text-slate-900 hover:underline"
                            >
                              {movimentacao.caixa.nome}
                            </Link>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td className="p-3">
                          <TipoBadge tipo={movimentacao.tipo} />
                        </td>

                        <td className="p-3">
                          {formatarOrigem(movimentacao.origem)}
                        </td>

                        <td className="p-3">
                          {movimentacao.descricao}

                          {movimentacao.observacao && (
                            <p className="mt-1 text-xs text-slate-500">
                              {movimentacao.observacao}
                            </p>
                          )}
                        </td>

                        <td className="p-3">{movimentacao.documento || "-"}</td>

                        <td className="p-3">
                          {movimentacao.usuario?.nome || "Sistema"}
                        </td>

                        <td className="p-3 text-right font-medium">
                          {formatarMoeda(movimentacao.valor)}
                        </td>

                        <td className="p-3 text-right">
                          {formatarMoeda(movimentacao.saldoPosterior)}
                        </td>

                        <td className="p-3 text-right">
                          <ReferenciaLink movimentacao={movimentacao} />
                        </td>
                      </tr>
                    ))}

                    {movimentacoes.length === 0 && (
                      <tr>
                        <td colSpan={10}>
                          <CrudEmpty message="Nenhuma movimentação encontrada." />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <CrudPagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </>
          )}
        </CrudCard>
      </div>
    </AppLayout>
  );
}

function ReferenciaLink({
  movimentacao,
}: {
  movimentacao: {
    pagamentoContaPagar?: {
      contaPagar?: {
        id: string;
        numero: number;
      };
    } | null;

    recebimentoContaReceber?: {
      contaReceber?: {
        id: string;
        numero: number;
      };
    } | null;
  };
}) {
  const contaPagar = movimentacao.pagamentoContaPagar?.contaPagar;

  if (contaPagar) {
    return (
      <Link
        href={`/contas-pagar/${contaPagar.id}`}
        className="text-sm font-medium text-blue-600 hover:underline"
      >
        Conta a pagar #{String(contaPagar.numero).padStart(5, "0")}
      </Link>
    );
  }

  const contaReceber = movimentacao.recebimentoContaReceber?.contaReceber;

  if (contaReceber) {
    return (
      <Link
        href={`/contas-receber/${contaReceber.id}`}
        className="text-sm font-medium text-blue-600 hover:underline"
      >
        Conta a receber #{String(contaReceber.numero).padStart(5, "0")}
      </Link>
    );
  }

  return <span className="text-slate-500">Manual</span>;
}

function ResumoCard({
  titulo,
  valor,
  descricao,
  icone,
}: {
  titulo: string;
  valor: string;
  descricao: string;
  icone: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{titulo}</p>

          <p className="mt-2 text-2xl font-bold text-slate-900">{valor}</p>

          <p className="mt-1 text-xs text-slate-500">{descricao}</p>
        </div>

        <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
          {icone}
        </div>
      </div>
    </div>
  );
}

function TipoBadge({ tipo }: { tipo: TipoMovimentacaoCaixa }) {
  const entrada = tipo === "ENTRADA";

  return (
    <span
      className={
        entrada
          ? "inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700"
          : "inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700"
      }
    >
      {entrada ? <ArrowUpCircle size={13} /> : <ArrowDownCircle size={13} />}

      {entrada ? "Entrada" : "Saída"}
    </span>
  );
}

function formatarOrigem(origem: OrigemMovimentacaoCaixa) {
  const mapa: Record<OrigemMovimentacaoCaixa, string> = {
    MANUAL: "Manual",
    CONTA_PAGAR: "Conta a pagar",
    CONTA_RECEBER: "Conta a receber",
    VENDA: "Venda",
    AJUSTE: "Ajuste",
    OUTRA: "Outra",
  };

  return mapa[origem];
}

function formatarMoeda(valor: string | number) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarDataHora(valor: string) {
  return new Date(valor).toLocaleString("pt-BR");
}
