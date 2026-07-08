"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

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

import { listarEstoque } from "@/services/estoque.service";

function statusEstoque(atual: string, minimo: string, maximo?: string) {
  const quantidadeAtual = Number(atual);
  const estoqueMinimo = Number(minimo);
  const estoqueMaximo = maximo ? Number(maximo) : null;

  if (quantidadeAtual <= estoqueMinimo) {
    return (
      <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700">
        Baixo
      </span>
    );
  }

  if (estoqueMaximo && quantidadeAtual >= estoqueMaximo) {
    return (
      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
        Cheio
      </span>
    );
  }

  return (
    <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
      Normal
    </span>
  );
}

export default function EstoquePage() {
  const [search, setSearch] = useState("");
  const [searchAplicado, setSearchAplicado] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["estoque", searchAplicado, page],
    queryFn: () =>
      listarEstoque({
        search: searchAplicado,
        page,
        limit: 10,
        sortBy: "quantidadeAtual",
        order: "asc",
      }),
  });

  function pesquisar() {
    setPage(1);
    setSearchAplicado(search);
  }

  const itens = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Estoque"
          description="Acompanhe os saldos atuais dos produtos."
        />

        <CrudCard>
          <CrudToolbar>
            <CrudSearch
              value={search}
              onChange={setSearch}
              onSearch={pesquisar}
              placeholder="Pesquisar por produto ou código..."
            />
          </CrudToolbar>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              Erro ao carregar estoque.
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
                      <TableHead>Produto</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Atual</TableHead>
                      <TableHead>Mínimo</TableHead>
                      <TableHead>Máximo</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {itens.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.produto?.nome ?? "-"}
                        </TableCell>

                        <TableCell>{item.produto?.codigo || "-"}</TableCell>

                        <TableCell>{Number(item.quantidadeAtual)}</TableCell>

                        <TableCell>{Number(item.estoqueMinimo)}</TableCell>

                        <TableCell>
                          {item.estoqueMaximo
                            ? Number(item.estoqueMaximo)
                            : "-"}
                        </TableCell>

                        <TableCell>
                          {statusEstoque(
                            item.quantidadeAtual,
                            item.estoqueMinimo,
                            item.estoqueMaximo
                          )}
                        </TableCell>
                      </TableRow>
                    ))}

                    {itens.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <CrudEmpty message="Nenhum item de estoque encontrado." />
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
