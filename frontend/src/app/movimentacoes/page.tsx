"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";

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

import { listarMovimentacoes } from "@/services/movimentacoes.service";
import { NovaMovimentacaoModal } from "@/components/produtos/NovaMovimentacaoModal";

export default function MovimentacoesPage() {
  const [search, setSearch] = useState("");
  const [searchAplicado, setSearchAplicado] = useState("");
  const [page, setPage] = useState(1);

const { data, isLoading, error } = useQuery({
  queryKey: ["movimentacoes", searchAplicado, page],
  queryFn: () =>
    listarMovimentacoes({
      search: searchAplicado,
      page,
      limit: 10,
      sortBy: "createdAt",
      order: "desc",
    }),
});

  function pesquisar() {
    setPage(1);
    setSearchAplicado(search);
  }

  const movimentacoes = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  return (
    <AppLayout>
      <div className="space-y-6">
       <PageHeader
  title="Movimentações"
  description="Histórico de entradas e saídas de estoque."
  actions={<NovaMovimentacaoModal />}
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

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              Erro ao carregar movimentações.
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
                      <TableHead>Tipo</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Observação</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {movimentacoes.map((mov) => {
                      const entrada = mov.tipo === "ENTRADA";

                      return (
                        <TableRow key={mov.id}>
                          <TableCell>
                            <span
                              className={
                                entrada
                                  ? "inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700"
                                  : "inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700"
                              }
                            >
                              {entrada ? (
                                <ArrowUp size={14} />
                              ) : (
                                <ArrowDown size={14} />
                              )}
                              {mov.tipo}
                            </span>
                          </TableCell>

                          <TableCell className="font-medium">
                            {mov.produto?.nome ?? "-"}
                          </TableCell>

                          <TableCell>{Number(mov.quantidade)}</TableCell>

                          <TableCell>{mov.observacao || "-"}</TableCell>

                          <TableCell>
                            {new Date(mov.createdAt).toLocaleString("pt-BR")}
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {movimentacoes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5}>
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
