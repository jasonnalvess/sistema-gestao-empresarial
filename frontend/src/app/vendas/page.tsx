"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  Ban,
  CheckCircle2,
  Clock3,
  FileEdit,
  ReceiptText,
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
import { NovaVendaModal } from "@/components/vendas/NovaVendaModal";
import { VendaAcoes } from "@/components/vendas/VendaAcoes";
import { VendasDashboard } from "@/components/vendas/VendasDashboard";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { listarVendas, StatusVenda } from "@/services/vendas.service";

import { listarClientes } from "@/services/clientes.service";
import { listarDepositos } from "@/services/depositos.service";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import {
  PERMISSAO_CLIENTES_VISUALIZAR,
  PERMISSAO_DEPOSITOS_VISUALIZAR,
  PERMISSAO_VENDAS_CRIAR,
  PERMISSAO_VENDAS_VISUALIZAR,
} from "@/lib/auth";
import { vendasQueryKeys } from "@/lib/vendas-query-keys";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";

export default function VendasPage() {
  const { temPermissao } = useAuth();
  const { empresaSelecionadaId, empresaEfetivaId, carregando, requerSelecao } =
    useEmpresaSelecionada();
  const possuiEmpresaEfetiva = !requerSelecao || Boolean(empresaSelecionadaId);
  const podeVisualizar = temPermissao(PERMISSAO_VENDAS_VISUALIZAR);
  const podeCriar = temPermissao(PERMISSAO_VENDAS_CRIAR);
  const [search, setSearch] = useState("");
  const [searchAplicado, setSearchAplicado] = useState("");
  const [status, setStatus] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [depositoId, setDepositoId] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [page, setPage] = useState(1);

  const { data: clientesResponse } = useQuery({
    queryKey: vendasQueryKeys.clientesSelect(empresaEfetivaId ?? ""),
    queryFn: () =>
      listarClientes({
        ativo: "true",
        page: 1,
        limit: 100,
      }),
    enabled:
      podeVisualizar &&
      temPermissao(PERMISSAO_CLIENTES_VISUALIZAR) &&
      Boolean(empresaEfetivaId) &&
      !carregando,
  });

  const { data: depositosResponse } = useQuery({
    queryKey: estoqueQueryKeys.depositosSelect(
      empresaEfetivaId ?? "",
      "vendas",
    ),
    queryFn: () =>
      listarDepositos({
        ativo: true,
        page: 1,
        limit: 100,
        sortBy: "nome",
        order: "asc",
      }),
    enabled:
      podeVisualizar &&
      temPermissao(PERMISSAO_DEPOSITOS_VISUALIZAR) &&
      Boolean(empresaEfetivaId) &&
      !carregando,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: vendasQueryKeys.lista(empresaEfetivaId ?? "", {
      search: searchAplicado || undefined,
      status: status ? (status as StatusVenda) : undefined,
      clienteId: clienteId || undefined,
      depositoId: depositoId || undefined,
      dataInicio: dataInicio || undefined,
      dataFim: dataFim || undefined,
      page,
      limit: 10,
      sortBy: "dataVenda",
      order: "desc",
    }),

    queryFn: () =>
      listarVendas({
        search: searchAplicado || undefined,

        status: status ? (status as StatusVenda) : undefined,

        clienteId: clienteId || undefined,

        depositoId: depositoId || undefined,

        dataInicio: dataInicio || undefined,

        dataFim: dataFim || undefined,

        page,
        limit: 10,
        sortBy: "dataVenda",
        order: "desc",
      }),
    enabled:
      podeVisualizar &&
      possuiEmpresaEfetiva &&
      Boolean(empresaEfetivaId) &&
      !carregando,
  });

  function pesquisar() {
    setPage(1);
    setSearchAplicado(search);
  }

  function limparFiltros() {
    setSearch("");
    setSearchAplicado("");
    setStatus("");
    setClienteId("");
    setDepositoId("");
    setDataInicio("");
    setDataFim("");
    setPage(1);
  }

  const vendas = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

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
  if (!possuiEmpresaEfetiva)
    return (
      <AppLayout>
        <EmpresaNaoSelecionada />
      </AppLayout>
    );

  return (
    <AppLayout>
      <div className="min-w-0 space-y-6">
        <PageHeader
          title="Vendas"
          description="Gerencie vendas, aprovações, faturamentos e recebimentos."
          actions={podeCriar ? <NovaVendaModal /> : undefined}
        />

        <VendasDashboard
          clienteId={clienteId}
          depositoId={depositoId}
          dataInicio={dataInicio}
          dataFim={dataFim}
        />

        <CrudCard>
          <CrudToolbar>
            <CrudSearch
              value={search}
              onChange={setSearch}
              onSearch={pesquisar}
              placeholder="Pesquisar por número, cliente, documento ou observação..."
            />
          </CrudToolbar>

          <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);

                setPage(1);
              }}
                className="h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-base md:text-sm"
            >
              <option value="">Todos os status</option>

              <option value="RASCUNHO">Rascunho</option>

              <option value="PENDENTE">Pendente</option>

              <option value="APROVADA">Aprovada</option>

              <option value="FATURADA">Faturada</option>

              <option value="CONCLUIDA">Concluída</option>

              <option value="CANCELADA">Cancelada</option>
            </select>

            <select
              value={clienteId}
              onChange={(event) => {
                setClienteId(event.target.value);

                setPage(1);
              }}
                className="h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-base md:text-sm"
            >
              <option value="">Todos os clientes</option>

              {clientesResponse?.data.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                </option>
              ))}
            </select>

            <select
              value={depositoId}
              onChange={(event) => {
                setDepositoId(event.target.value);

                setPage(1);
              }}
                className="h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-base md:text-sm"
            >
              <option value="">Todos os depósitos</option>

              {depositosResponse?.data.map((deposito) => (
                <option key={deposito.id} value={deposito.id}>
                  {deposito.codigo ? `${deposito.codigo} - ` : ""}

                  {deposito.nome}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={limparFiltros}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Limpar filtros
            </button>
          </div>

            <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Data inicial
              </label>

              <input
                type="date"
                value={dataInicio}
                onChange={(event) => {
                  setDataInicio(event.target.value);

                  setPage(1);
                }}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Data final
              </label>

              <input
                type="date"
                value={dataFim}
                onChange={(event) => {
                  setDataFim(event.target.value);

                  setPage(1);
                }}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              Erro ao carregar as vendas.
            </div>
          )}

          {isLoading ? (
            <CrudLoading />
          ) : (
            <>
          <div className="mt-5 min-w-0 max-w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>

                      <TableHead>Cliente</TableHead>

                      <TableHead>Depósito</TableHead>

                      <TableHead>Status</TableHead>

                      <TableHead>Data</TableHead>

                      <TableHead>Pagamento</TableHead>

                      <TableHead className="text-center">Itens</TableHead>

                      <TableHead className="text-right">Valor total</TableHead>

                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {vendas.map((venda) => {
                      const statusVisual = obterStatusVisual(venda.status);

                      return (
                        <TableRow key={venda.id}>
                          <TableCell className="font-medium">
                            #{String(venda.numero).padStart(5, "0")}
                          </TableCell>

                          <TableCell>
                            <p className="font-medium text-slate-900">
                              {venda.cliente?.nome ?? "-"}
                            </p>

                            {venda.cliente?.documento && (
                              <p className="text-xs text-slate-500">
                                {venda.cliente.documento}
                              </p>
                            )}
                          </TableCell>

                          <TableCell>
                            {venda.deposito
                              ? `${
                                  venda.deposito.codigo
                                    ? `${venda.deposito.codigo} - `
                                    : ""
                                }${venda.deposito.nome}`
                              : "-"}
                          </TableCell>

                          <TableCell>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${statusVisual.classe}`}
                            >
                              {statusVisual.icone}

                              {statusVisual.label}
                            </span>
                          </TableCell>

                          <TableCell>{formatarData(venda.dataVenda)}</TableCell>

                          <TableCell>
                            {formatarCondicaoPagamento(venda.condicaoPagamento)}

                            {venda.formaPagamento && (
                              <p className="text-xs text-slate-500">
                                {formatarFormaPagamento(venda.formaPagamento)}
                              </p>
                            )}
                          </TableCell>

                          <TableCell className="text-center">
                            {venda._count?.itens ?? 0}
                          </TableCell>

                          <TableCell className="text-right font-medium">
                            {formatarMoeda(venda.valorTotal)}
                          </TableCell>

                          <TableCell className="text-right">
                      <div className="flex min-w-max justify-end gap-2">
                              <DetailsButton href={`/vendas/${venda.id}`} />

                              <VendaAcoes
                                vendaId={venda.id}
                                status={venda.status}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {vendas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9}>
                          <CrudEmpty message="Nenhuma venda encontrada." />
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

function obterStatusVisual(status: StatusVenda) {
  switch (status) {
    case "RASCUNHO":
      return {
        label: "Rascunho",
        classe: "bg-slate-100 text-slate-700",
        icone: <FileEdit size={14} />,
      };

    case "PENDENTE":
      return {
        label: "Pendente",
        classe: "bg-amber-100 text-amber-700",
        icone: <Clock3 size={14} />,
      };

    case "APROVADA":
      return {
        label: "Aprovada",
        classe: "bg-blue-100 text-blue-700",
        icone: <CheckCircle2 size={14} />,
      };

    case "FATURADA":
      return {
        label: "Faturada",
        classe: "bg-purple-100 text-purple-700",
        icone: <ReceiptText size={14} />,
      };

    case "CONCLUIDA":
      return {
        label: "Concluída",
        classe: "bg-green-100 text-green-700",
        icone: <BadgeCheck size={14} />,
      };

    case "CANCELADA":
      return {
        label: "Cancelada",
        classe: "bg-red-100 text-red-700",
        icone: <Ban size={14} />,
      };
  }
}

function formatarMoeda(valor: string | number) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(valor: string) {
  return new Date(valor).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
}

function formatarCondicaoPagamento(condicao: "AVISTA" | "APRAZO") {
  return condicao === "AVISTA" ? "À vista" : "A prazo";
}

function formatarFormaPagamento(forma: string) {
  const nomes: Record<string, string> = {
    DINHEIRO: "Dinheiro",
    PIX: "Pix",
    CARTAO_CREDITO: "Cartão de crédito",
    CARTAO_DEBITO: "Cartão de débito",
    BOLETO: "Boleto",
    TRANSFERENCIA: "Transferência",
  };

  return nomes[forma] ?? forma;
}
