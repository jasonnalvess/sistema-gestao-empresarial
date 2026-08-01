"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Clock3,
  HandCoins,
  XCircle,
} from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { AcessoNegado } from "@/components/common/AcessoNegado";
import { EmpresaNaoSelecionada } from "@/components/common/EmpresaNaoSelecionada";
import { CrudCard } from "@/components/crud/CrudCard";
import { CrudToolbar } from "@/components/crud/CrudToolbar";
import { CrudSearch } from "@/components/crud/CrudSearch";
import { CrudPagination } from "@/components/crud/CrudPagination";
import { CrudEmpty } from "@/components/crud/CrudEmpty";
import { CrudLoading } from "@/components/crud/CrudLoading";
import { DetailsButton } from "@/components/actions/DetailsButton";
import { NovaContaReceberModal } from "@/components/contas-receber/NovaContaReceberModal";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  contasReceberQueryKeys,
  buscarResumoContasReceber,
  listarContasReceber,
  OrigemContaReceber,
  StatusContaReceber,
} from "@/services/contas-receber.service";

import { listarClientes } from "@/services/clientes.service";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import {
  PERMISSAO_CLIENTES_VISUALIZAR,
  PERMISSAO_CONTAS_RECEBER_CRIAR,
  PERMISSAO_CONTAS_RECEBER_VISUALIZAR,
} from "@/lib/auth";

export default function ContasReceberPage() {
  const { temPermissao } = useAuth();
  const { empresaSelecionadaId, empresaEfetivaId, carregando, requerSelecao } =
    useEmpresaSelecionada();
  const possuiEmpresaEfetiva = !requerSelecao || Boolean(empresaSelecionadaId);
  const podeVisualizarContas = temPermissao(
    PERMISSAO_CONTAS_RECEBER_VISUALIZAR,
  );
  const podeCriarConta = temPermissao(PERMISSAO_CONTAS_RECEBER_CRIAR);
  const podeVisualizarClientes = temPermissao(PERMISSAO_CLIENTES_VISUALIZAR);
  const [search, setSearch] = useState("");
  const [searchAplicado, setSearchAplicado] =
    useState("");

  const [status, setStatus] = useState("");
  const [origem, setOrigem] = useState("");
  const [clienteId, setClienteId] =
    useState("");

  const [vencimentoInicio, setVencimentoInicio] =
    useState("");

  const [vencimentoFim, setVencimentoFim] =
    useState("");

  const [page, setPage] = useState(1);

  const { data: clientesResponse } = useQuery({
    queryKey: ["clientes-select-contas-receber", empresaEfetivaId],
    queryFn: () =>
      listarClientes({
        ativo: "true",
        page: 1,
        limit: 100,
      }),
    enabled:
      podeVisualizarContas &&
      podeVisualizarClientes &&
      possuiEmpresaEfetiva &&
      Boolean(empresaEfetivaId) &&
      !carregando,
  });

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      ...contasReceberQueryKeys.listas(empresaEfetivaId ?? ""),
      searchAplicado,
      status,
      origem,
      clienteId,
      vencimentoInicio,
      vencimentoFim,
      page,
      10,
      "dataVencimento",
      "asc",
    ],

    queryFn: () =>
      listarContasReceber({
        search: searchAplicado || undefined,

        status: status
          ? (status as StatusContaReceber)
          : undefined,

        origem: origem
          ? (origem as OrigemContaReceber)
          : undefined,

        clienteId:
          clienteId || undefined,

        vencimentoInicio:
          vencimentoInicio || undefined,

        vencimentoFim:
          vencimentoFim || undefined,

        page,
        limit: 10,
        sortBy: "dataVencimento",
        order: "asc",
      }),
    enabled:
      podeVisualizarContas &&
      possuiEmpresaEfetiva &&
      Boolean(empresaEfetivaId) &&
      !carregando,
  });

  const { data: resumoContasReceber } = useQuery({
    queryKey: [
      ...contasReceberQueryKeys.resumo(empresaEfetivaId ?? ""),
      vencimentoInicio,
      vencimentoFim,
    ],

    queryFn: () =>
      buscarResumoContasReceber({
        vencimentoInicio:
          vencimentoInicio || undefined,

        vencimentoFim:
          vencimentoFim || undefined,
      }),
    enabled:
      podeVisualizarContas &&
      possuiEmpresaEfetiva &&
      Boolean(empresaEfetivaId) &&
      !carregando,
  });

  const contas = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  function pesquisar() {
    setPage(1);
    setSearchAplicado(search);
  }

  function limparFiltros() {
    setSearch("");
    setSearchAplicado("");
    setStatus("");
    setOrigem("");
    setClienteId("");
    setVencimentoInicio("");
    setVencimentoFim("");
    setPage(1);
  }

  if (carregando) {
    return (
      <AppLayout>
        <CrudLoading />
      </AppLayout>
    );
  }

  if (!podeVisualizarContas) {
    return (
      <AppLayout>
        <AcessoNegado />
      </AppLayout>
    );
  }

  if (!possuiEmpresaEfetiva || !empresaEfetivaId) {
    return (
      <AppLayout>
        <EmpresaNaoSelecionada />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Contas a Receber"
          description="Controle valores a receber, vencimentos e recebimentos dos clientes."
          actions={podeCriarConta ? <NovaContaReceberModal /> : undefined}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ResumoCard
            titulo="Valor lançado"
            valor={
              resumoContasReceber?.receber.valorOriginal ?? 0
            }
            icone={<Banknote size={20} />}
          />

          <ResumoCard
            titulo="Valor recebido"
            valor={
              resumoContasReceber?.receber.valorRecebido ?? 0
            }
            icone={<CheckCircle2 size={20} />}
          />

          <ResumoCard
            titulo="Saldo em aberto"
            valor={
              resumoContasReceber?.receber.valorAberto ?? 0
            }
            icone={<Clock3 size={20} />}
          />

          <ResumoCard
            titulo="Valor vencido"
            valor={
              resumoContasReceber?.receber.valorVencido ?? 0
            }
            icone={<AlertTriangle size={20} />}
          />
        </div>

        <CrudCard>
          <CrudToolbar>
            <CrudSearch
              value={search}
              onChange={setSearch}
              onSearch={pesquisar}
              placeholder="Pesquisar por número, descrição, documento ou cliente..."
            />
          </CrudToolbar>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">
                Todos os status
              </option>

              <option value="PENDENTE">
                Pendente
              </option>

              <option value="PARCIALMENTE_RECEBIDA">
                Parcialmente recebida
              </option>

              <option value="RECEBIDA">
                Recebida
              </option>

              <option value="VENCIDA">
                Vencida
              </option>

              <option value="CANCELADA">
                Cancelada
              </option>
            </select>

            <select
              value={origem}
              onChange={(event) => {
                setOrigem(event.target.value);
                setPage(1);
              }}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">
                Todas as origens
              </option>

              <option value="MANUAL">
                Manual
              </option>

              <option value="ORDEM_SERVICO">
                Ordem de serviço
              </option>

              <option value="VENDA">
                Venda
              </option>

              <option value="OUTRA">
                Outra
              </option>
            </select>

            <select
              value={clienteId}
              onChange={(event) => {
                setClienteId(event.target.value);
                setPage(1);
              }}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">
                Todos os clientes
              </option>

              {clientesResponse?.data.map(
                (cliente) => (
                  <option
                    key={cliente.id}
                    value={cliente.id}
                  >
                    {cliente.nome}
                  </option>
                )
              )}
            </select>

            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Vencimento inicial
              </label>

              <input
                type="date"
                value={vencimentoInicio}
                onChange={(event) => {
                  setVencimentoInicio(
                    event.target.value
                  );
                  setPage(1);
                }}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Vencimento final
              </label>

              <input
                type="date"
                value={vencimentoFim}
                onChange={(event) => {
                  setVencimentoFim(
                    event.target.value
                  );
                  setPage(1);
                }}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>

            <button
              type="button"
              onClick={limparFiltros}
              className="self-end rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Limpar filtros
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              Erro ao carregar contas a receber.
            </div>
          )}

          {isLoading ? (
            <CrudLoading />
          ) : (
            <>
              <div className="mt-5 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Vencimento</TableHead>

                      <TableHead className="text-right">
                        Valor original
                      </TableHead>

                      <TableHead className="text-right">
                        Saldo
                      </TableHead>

                      <TableHead className="text-right">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {contas.map((conta) => {
                      const statusVisual =
                        obterStatusVisual(
                          conta.status
                        );

                      return (
                        <TableRow key={conta.id}>
                          <TableCell className="font-medium">
                            #
                            {String(
                              conta.numero
                            ).padStart(5, "0")}
                          </TableCell>

                          <TableCell>
                            <p className="font-medium text-slate-900">
                              {conta.descricao}
                            </p>

                            {conta.documento && (
                              <p className="text-xs text-slate-500">
                                {conta.documento}
                              </p>
                            )}
                          </TableCell>

                          <TableCell>
                            {conta.cliente?.nome || "-"}
                          </TableCell>

                          <TableCell>
                            {formatarOrigem(
                              conta.origem
                            )}
                          </TableCell>

                          <TableCell>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${statusVisual.classe}`}
                            >
                              {statusVisual.icone}
                              {statusVisual.label}
                            </span>
                          </TableCell>

                          <TableCell>
                            {formatarData(
                              conta.dataVencimento
                            )}
                          </TableCell>

                          <TableCell className="text-right">
                            {formatarMoeda(
                              conta.valorOriginal
                            )}
                          </TableCell>

                          <TableCell className="text-right font-medium">
                            {formatarMoeda(
                              conta.valorAberto
                            )}
                          </TableCell>

                          <TableCell className="text-right">
                            <DetailsButton
                              href={`/contas-receber/${conta.id}`}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {contas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9}>
                          <CrudEmpty message="Nenhuma conta a receber encontrada." />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
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

function ResumoCard({
  titulo,
  valor,
  icone,
}: {
  titulo: string;
  valor: number;
  icone: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">
            {titulo}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatarMoeda(valor)}
          </p>
        </div>

        <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
          {icone}
        </div>
      </div>
    </div>
  );
}

function obterStatusVisual(
  status: StatusContaReceber
) {
  switch (status) {
    case "PENDENTE":
      return {
        label: "Pendente",
        classe:
          "bg-amber-100 text-amber-700",
        icone: <Clock3 size={14} />,
      };

    case "PARCIALMENTE_RECEBIDA":
      return {
        label: "Parcialmente recebida",
        classe:
          "bg-blue-100 text-blue-700",
        icone: <HandCoins size={14} />,
      };

    case "RECEBIDA":
      return {
        label: "Recebida",
        classe:
          "bg-green-100 text-green-700",
        icone: <CheckCircle2 size={14} />,
      };

    case "VENCIDA":
      return {
        label: "Vencida",
        classe:
          "bg-red-100 text-red-700",
        icone: <AlertTriangle size={14} />,
      };

    case "CANCELADA":
      return {
        label: "Cancelada",
        classe:
          "bg-slate-200 text-slate-700",
        icone: <XCircle size={14} />,
      };
  }
}

function formatarOrigem(
  origem: OrigemContaReceber
) {
  const mapa: Record<
    OrigemContaReceber,
    string
  > = {
    MANUAL: "Manual",
    ORDEM_SERVICO: "Ordem de serviço",
    VENDA: "Venda",
    OUTRA: "Outra",
  };

  return mapa[origem];
}

function formatarMoeda(
  valor: string | number
) {
  return Number(valor).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );
}

function formatarData(valor: string) {
  return new Date(valor).toLocaleDateString(
    "pt-BR",
    {
      timeZone: "UTC",
    }
  );
}
