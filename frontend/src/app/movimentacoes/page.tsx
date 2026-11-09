"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowRightLeft,
  ArrowUp,
  ClipboardCheck,
  RefreshCw,
} from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { AcessoNegado } from "@/components/common/AcessoNegado";
import { EmpresaNaoSelecionada } from "@/components/common/EmpresaNaoSelecionada";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import {
  PERMISSAO_DEPOSITOS_VISUALIZAR,
  PERMISSAO_MOVIMENTACOES_VISUALIZAR,
  PERMISSAO_PRODUTOS_VISUALIZAR,
} from "@/lib/auth";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";

import { CrudCard } from "@/components/crud/CrudCard";
import { CrudToolbar } from "@/components/crud/CrudToolbar";
import { CrudSearch } from "@/components/crud/CrudSearch";
import { CrudPagination } from "@/components/crud/CrudPagination";
import { CrudEmpty } from "@/components/crud/CrudEmpty";
import { CrudLoading } from "@/components/crud/CrudLoading";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { listarProdutos } from "@/services/produtos.service";
import { listarDepositos } from "@/services/depositos.service";
import {
  listarMovimentacoes,
  TipoMovimentacaoEstoque,
} from "@/services/movimentacoes.service";

import { NovaMovimentacaoModal } from "@/components/produtos/NovaMovimentacaoModal";
import { NovaTransferenciaEstoqueModal } from "@/components/produtos/NovaTransferenciaEstoqueModal";

function obterTipoMovimentacao(tipoMovimentacao: TipoMovimentacaoEstoque) {
  switch (tipoMovimentacao) {
    case "ENTRADA":
      return {
        label: "Entrada",
        classe: "bg-green-100 text-green-700",
        icone: <ArrowUp size={14} />,
      };

    case "SAIDA":
      return {
        label: "Saída",
        classe: "bg-red-100 text-red-700",
        icone: <ArrowDown size={14} />,
      };

    case "AJUSTE":
      return {
        label: "Ajuste",
        classe: "bg-amber-100 text-amber-700",
        icone: <RefreshCw size={14} />,
      };

    case "INVENTARIO":
      return {
        label: "Inventário",
        classe: "bg-blue-100 text-blue-700",
        icone: <ClipboardCheck size={14} />,
      };

    case "TRANSFERENCIA_ENTRADA":
      return {
        label: "Transferência — entrada",
        classe: "bg-cyan-100 text-cyan-700",
        icone: <ArrowDownToLine size={14} />,
      };

    case "TRANSFERENCIA_SAIDA":
      return {
        label: "Transferência — saída",
        classe: "bg-purple-100 text-purple-700",
        icone: <ArrowRightLeft size={14} />,
      };
  }
}

export default function MovimentacoesPage() {
  const { temPermissao } = useAuth();
  const { empresaSelecionadaId, empresaEfetivaId, carregando, requerSelecao } =
    useEmpresaSelecionada();
  const possuiEmpresaEfetiva = !requerSelecao || Boolean(empresaSelecionadaId);
  const podeVisualizar = temPermissao(PERMISSAO_MOVIMENTACOES_VISUALIZAR);
  const podeVisualizarProdutos = temPermissao(PERMISSAO_PRODUTOS_VISUALIZAR);
  const podeVisualizarDepositos = temPermissao(PERMISSAO_DEPOSITOS_VISUALIZAR);
  const [search, setSearch] = useState("");
  const [searchAplicado, setSearchAplicado] = useState("");
  const [page, setPage] = useState(1);
  const [produtoId, setProdutoId] = useState("");
  const [depositoId, setDepositoId] = useState("");
  const [tipo, setTipo] = useState("");

  const { data: produtosResponse } = useQuery({
    queryKey: estoqueQueryKeys.produtosSelect(
      empresaEfetivaId ?? "",
      "filtro-movimentacoes",
    ),
    queryFn: () =>
      listarProdutos({
        page: 1,
        limit: 100,
        sortBy: "nome",
        order: "asc",
      }),
    enabled:
      podeVisualizar &&
      podeVisualizarProdutos &&
      possuiEmpresaEfetiva &&
      Boolean(empresaEfetivaId) &&
      !carregando,
  });

  const { data: depositosResponse } = useQuery({
    queryKey: estoqueQueryKeys.depositosSelect(
      empresaEfetivaId ?? "",
      "filtro-movimentacoes",
    ),
    queryFn: () =>
      listarDepositos({
        page: 1,
        limit: 100,
        sortBy: "nome",
        order: "asc",
      }),
    enabled:
      podeVisualizar &&
      podeVisualizarDepositos &&
      possuiEmpresaEfetiva &&
      Boolean(empresaEfetivaId) &&
      !carregando,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: [
      ...estoqueQueryKeys.movimentacoes(empresaEfetivaId ?? ""),
      searchAplicado,
      produtoId,
      depositoId,
      tipo,
      page,
    ],
    queryFn: () =>
      listarMovimentacoes({
        search: searchAplicado || undefined,
        produtoId: produtoId || undefined,
        depositoId: depositoId || undefined,
        tipo: tipo ? (tipo as TipoMovimentacaoEstoque) : undefined,
        page,
        limit: 10,
        sortBy: "createdAt",
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

  const movimentacoes = data?.data ?? [];
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
          title="Movimentações de Estoque"
          description="Controle entradas, saídas, ajustes, inventários e transferências."
          actions={
            <div className="grid w-full min-w-0 grid-cols-1 gap-2 lg:flex lg:w-auto lg:flex-wrap [&>*]:w-full md:[&>*]:w-full lg:[&>*]:w-auto">
              <NovaMovimentacaoModal />
              <NovaTransferenciaEstoqueModal />
            </div>
          }
        />

        <CrudCard>
          <CrudToolbar>
            <CrudSearch
              value={search}
              onChange={setSearch}
              onSearch={pesquisar}
              placeholder="Pesquisar por produto ou observação..."
            />
          </CrudToolbar>

          <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3">
            <select
              value={produtoId}
              onChange={(e) => {
                setProdutoId(e.target.value);
                setPage(1);
              }}
              aria-label="Filtrar movimentações por tipo"
              className="h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-base md:text-sm"
            >
              <option value="">Todos os produtos</option>

              {produtosResponse?.data.map((produto) => (
                <option key={produto.id} value={produto.id}>
                  {produto.nome}
                </option>
              ))}
            </select>

            <select
              value={depositoId}
              onChange={(e) => {
                setDepositoId(e.target.value);
                setPage(1);
              }}
              aria-label="Filtrar movimentações por produto"
              className="h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-base md:text-sm"
            >
              <option value="">Todos os depósitos</option>

              {depositosResponse?.data.map((deposito) => (
                <option key={deposito.id} value={deposito.id}>
                  {deposito.codigo} - {deposito.nome}
                </option>
              ))}
            </select>

            <select
              value={tipo}
              onChange={(e) => {
                setTipo(e.target.value);
                setPage(1);
              }}
              aria-label="Filtrar movimentações por depósito"
              className="h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-base md:text-sm"
            >
              <option value="">Todos os tipos</option>
              <option value="ENTRADA">Entrada</option>
              <option value="SAIDA">Saída</option>
              <option value="AJUSTE">Ajuste</option>
              <option value="INVENTARIO">Inventário</option>
              <option value="TRANSFERENCIA_ENTRADA">
                Transferência — entrada
              </option>
              <option value="TRANSFERENCIA_SAIDA">Transferência — saída</option>
            </select>
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              Erro ao carregar movimentações.
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
                      <TableHead>Tipo</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Depósito</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Saldo anterior</TableHead>
                      <TableHead>Saldo posterior</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {movimentacoes.map((mov) => {
                      const tipoVisual = obterTipoMovimentacao(mov.tipo);

                      return (
                        <TableRow key={mov.id}>
                          <TableCell>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${tipoVisual.classe}`}
                            >
                              {tipoVisual.icone}
                              {tipoVisual.label}
                            </span>
                          </TableCell>

                          <TableCell>
                            <p className="font-medium text-slate-900">
                              {mov.produto?.nome ?? "-"}
                            </p>

                            {mov.produto?.codigo && (
                              <p className="text-xs text-slate-500">
                                {mov.produto.codigo}
                              </p>
                            )}
                          </TableCell>

                          <TableCell>
                            {mov.deposito
                              ? `${mov.deposito.codigo} - ${mov.deposito.nome}`
                              : "-"}
                          </TableCell>

                          <TableCell>
                            {Number(mov.quantidade).toFixed(2)}
                          </TableCell>

                          <TableCell>
                            {mov.saldoAnterior !== null &&
                            mov.saldoAnterior !== undefined
                              ? Number(mov.saldoAnterior).toFixed(2)
                              : "-"}
                          </TableCell>

                          <TableCell>
                            {mov.saldoPosterior !== null &&
                            mov.saldoPosterior !== undefined
                              ? Number(mov.saldoPosterior).toFixed(2)
                              : "-"}
                          </TableCell>

                          <TableCell>
                            <div>
                              <p>{mov.documentoReferencia || "-"}</p>

                              {mov.observacao && (
                                <p className="max-w-xs truncate text-xs text-slate-500">
                                  {mov.observacao}
                                </p>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>
                            {mov.usuario?.nome || "Sistema"}
                          </TableCell>

                          <TableCell>
                            {new Date(mov.createdAt).toLocaleString("pt-BR")}
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {!error && movimentacoes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9}>
                          <CrudEmpty message="Nenhuma movimentação encontrada." />
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
