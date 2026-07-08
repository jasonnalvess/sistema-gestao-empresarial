
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { listarProdutos } from "@/services/produtos.service";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/common/PageHeader";
import { NovoProdutoModal } from "@/components/produtos/NovoProdutoModal";
import { CrudCard } from "@/components/crud/CrudCard";
import { CrudToolbar } from "@/components/crud/CrudToolbar";
import { CrudSearch } from "@/components/crud/CrudSearch";
import { CrudStatusBadge } from "@/components/crud/CrudStatusBadge";
import { CrudPagination } from "@/components/crud/CrudPagination";
import { CrudEmpty } from "@/components/crud/CrudEmpty";
import { CrudLoading } from "@/components/crud/CrudLoading";
import { EditarProdutoModal } from "@/components/produtos/EditarProdutoModal";
import { AlterarStatusProdutoButton } from "@/components/produtos/AlterarStatusProdutoButton";

export default function ProdutosPage() {
  const [search, setSearch] = useState("");
  const [searchAplicado, setSearchAplicado] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["produtos", searchAplicado, page],
    queryFn: () =>
      listarProdutos({
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

  const produtos = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Produtos"
          description="Gerencie os produtos cadastrados no sistema."
          actions={<NovoProdutoModal />}
        />

        <CrudCard>
          <CrudToolbar>
            <CrudSearch
              value={search}
              onChange={setSearch}
              onSearch={pesquisar}
              placeholder="Pesquisar por nome, código ou descrição..."
            />
          </CrudToolbar>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              Erro ao carregar produtos.
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
                      <TableHead>Nome</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {produtos.map((produto) => (
                      <TableRow key={produto.id}>
                        <TableCell className="font-medium">
                          {produto.nome}
                        </TableCell>
                        <TableCell>{produto.codigo || "-"}</TableCell>
                        <TableCell>{produto.categoria?.nome || "-"}</TableCell>
                        <TableCell>
                          R$ {Number(produto.precoVenda).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <CrudStatusBadge ativo={produto.ativo} />
                        </TableCell>

<TableCell className="text-right">
  <div className="flex justify-end gap-2">
    <EditarProdutoModal produto={produto} />
    <AlterarStatusProdutoButton produto={produto} />
  </div>
</TableCell>                       

                      </TableRow>
                    ))}

                    {produtos.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <CrudEmpty message="Nenhum produto encontrado." />
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
