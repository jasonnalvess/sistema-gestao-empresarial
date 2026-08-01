"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock3,
  FileEdit,
  PackageCheck,
  PackageOpen,
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
import { NovoPedidoCompraModal } from "@/components/pedidos-compra/NovoPedidoCompraModal";
import { DetailsButton } from "@/components/actions/DetailsButton";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  listarPedidosCompra,
  PedidoCompraStatus,
  pedidosCompraQueryKeys,
} from "@/services/pedidos-compra.service";

import { listarFornecedores } from "@/services/fornecedores.service";
import { listarDepositos } from "@/services/depositos.service";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import {
  PERMISSAO_FORNECEDORES_VISUALIZAR,
  PERMISSAO_PEDIDOS_COMPRA_CRIAR,
  PERMISSAO_PEDIDOS_COMPRA_VISUALIZAR,
} from "@/lib/auth";

export default function PedidosCompraPage() {
  const { temPermissao } = useAuth();
  const { empresaSelecionadaId, empresaEfetivaId, carregando, requerSelecao } =
    useEmpresaSelecionada();
  const possuiEmpresaEfetiva = !requerSelecao || Boolean(empresaSelecionadaId);
  const podeVisualizarPedidos = temPermissao(
    PERMISSAO_PEDIDOS_COMPRA_VISUALIZAR,
  );
  const podeCriarPedido = temPermissao(PERMISSAO_PEDIDOS_COMPRA_CRIAR);
  const podeVisualizarFornecedores = temPermissao(
    PERMISSAO_FORNECEDORES_VISUALIZAR,
  );
  const [search, setSearch] = useState("");
  const [searchAplicado, setSearchAplicado] = useState("");
  const [status, setStatus] = useState("");
  const [fornecedorId, setFornecedorId] = useState("");
  const [depositoId, setDepositoId] = useState("");
  const [page, setPage] = useState(1);

  const { data: fornecedoresResponse } = useQuery({
    queryKey: ["fornecedores-select-pedidos-compra", empresaEfetivaId],
    queryFn: () =>
      listarFornecedores({
        ativo: true,
        page: 1,
        limit: 100,
        sortBy: "razaoSocial",
        order: "asc",
      }),
    enabled:
      podeVisualizarPedidos &&
      podeVisualizarFornecedores &&
      possuiEmpresaEfetiva &&
      Boolean(empresaEfetivaId) &&
      !carregando,
  });

  const { data: depositosResponse } = useQuery({
    queryKey: ["depositos-select-pedidos-compra", empresaEfetivaId],
    queryFn: () =>
      listarDepositos({
        ativo: true,
        page: 1,
        limit: 100,
        sortBy: "nome",
        order: "asc",
      }),
    enabled:
      podeVisualizarPedidos &&
      possuiEmpresaEfetiva &&
      Boolean(empresaEfetivaId) &&
      !carregando,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: [
      ...pedidosCompraQueryKeys.listas(empresaEfetivaId ?? ""),
      searchAplicado,
      status,
      fornecedorId,
      depositoId,
      page,
      10,
      "createdAt",
      "desc",
    ],
    queryFn: () =>
      listarPedidosCompra({
        search: searchAplicado || undefined,
        status: status ? (status as PedidoCompraStatus) : undefined,
        fornecedorId: fornecedorId || undefined,
        depositoId: depositoId || undefined,
        page,
        limit: 10,
        sortBy: "createdAt",
        order: "desc",
      }),
    enabled:
      podeVisualizarPedidos &&
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
    setFornecedorId("");
    setDepositoId("");
    setPage(1);
  }

  const pedidos = data?.data ?? [];

  if (!podeVisualizarPedidos) {
    return (
      <AppLayout>
        <AcessoNegado />
      </AppLayout>
    );
  }

  if (carregando) {
    return (
      <AppLayout>
        <CrudLoading />
      </AppLayout>
    );
  }

  if (!possuiEmpresaEfetiva) {
    return (
      <AppLayout>
        <EmpresaNaoSelecionada />
      </AppLayout>
    );
  }
  const totalPages = data?.meta.totalPages ?? 1;

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Pedidos de Compra"
          description="Gerencie solicitações, aprovações e recebimentos de compras."
          actions={podeCriarPedido ? <NovoPedidoCompraModal /> : undefined}
        />

        <CrudCard>
          <CrudToolbar>
            <CrudSearch
              value={search}
              onChange={setSearch}
              onSearch={pesquisar}
              placeholder="Pesquisar por número, fornecedor, documento ou observação..."
            />
          </CrudToolbar>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Todos os status</option>
              <option value="RASCUNHO">Rascunho</option>
              <option value="PENDENTE_APROVACAO">Pendente de aprovação</option>
              <option value="APROVADO">Aprovado</option>
              <option value="PARCIALMENTE_RECEBIDO">
                Parcialmente recebido
              </option>
              <option value="RECEBIDO">Recebido</option>
              <option value="CANCELADO">Cancelado</option>
            </select>

            <select
              value={fornecedorId}
              onChange={(e) => {
                setFornecedorId(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Todos os fornecedores</option>

              {fornecedoresResponse?.data.map((fornecedor) => (
                <option key={fornecedor.id} value={fornecedor.id}>
                  {fornecedor.nomeFantasia || fornecedor.razaoSocial}
                </option>
              ))}
            </select>

            <select
              value={depositoId}
              onChange={(e) => {
                setDepositoId(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Todos os depósitos</option>

              {depositosResponse?.data.map((deposito) => (
                <option key={deposito.id} value={deposito.id}>
                  {deposito.codigo} - {deposito.nome}
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

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              Erro ao carregar pedidos de compra.
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
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Depósito</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Previsão</TableHead>
                      <TableHead className="text-right">Valor total</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {pedidos.map((pedido) => {
                      const statusVisual = obterStatusVisual(pedido.status);

                      return (
                        <TableRow key={pedido.id}>
                          <TableCell className="font-medium">
                            #{String(pedido.numero).padStart(5, "0")}
                          </TableCell>

                          <TableCell>
                            <p className="font-medium text-slate-900">
                              {pedido.fornecedor?.nomeFantasia ||
                                pedido.fornecedor?.razaoSocial ||
                                "-"}
                            </p>

                            {pedido.fornecedor?.nomeFantasia && (
                              <p className="text-xs text-slate-500">
                                {pedido.fornecedor.razaoSocial}
                              </p>
                            )}
                          </TableCell>

                          <TableCell>
                            {pedido.deposito
                              ? `${
                                  pedido.deposito.codigo
                                    ? `${pedido.deposito.codigo} - `
                                    : ""
                                }${pedido.deposito.nome}`
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

                          <TableCell>
                            {formatarData(pedido.dataPedido)}
                          </TableCell>

                          <TableCell>
                            {pedido.dataPrevistaEntrega
                              ? formatarData(pedido.dataPrevistaEntrega)
                              : "-"}
                          </TableCell>

                          <TableCell className="text-right font-medium">
                            {formatarMoeda(pedido.valorTotal)}
                          </TableCell>

                          <TableCell className="text-right">
                            <DetailsButton
                              href={`/pedidos-compra/${pedido.id}`}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {pedidos.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8}>
                          <CrudEmpty message="Nenhum pedido de compra encontrado." />
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

function obterStatusVisual(status: PedidoCompraStatus) {
  switch (status) {
    case "RASCUNHO":
      return {
        label: "Rascunho",
        classe: "bg-slate-100 text-slate-700",
        icone: <FileEdit size={14} />,
      };

    case "PENDENTE_APROVACAO":
      return {
        label: "Pendente",
        classe: "bg-amber-100 text-amber-700",
        icone: <Clock3 size={14} />,
      };

    case "APROVADO":
      return {
        label: "Aprovado",
        classe: "bg-blue-100 text-blue-700",
        icone: <CheckCircle2 size={14} />,
      };

    case "PARCIALMENTE_RECEBIDO":
      return {
        label: "Recebimento parcial",
        classe: "bg-purple-100 text-purple-700",
        icone: <PackageOpen size={14} />,
      };

    case "RECEBIDO":
      return {
        label: "Recebido",
        classe: "bg-green-100 text-green-700",
        icone: <PackageCheck size={14} />,
      };

    case "CANCELADO":
      return {
        label: "Cancelado",
        classe: "bg-red-100 text-red-700",
        icone: <XCircle size={14} />,
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
