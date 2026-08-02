"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { AcessoNegado } from "@/components/common/AcessoNegado";
import { EmpresaNaoSelecionada } from "@/components/common/EmpresaNaoSelecionada";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import {
  PERMISSAO_CATEGORIAS_CRIAR,
  PERMISSAO_CATEGORIAS_EDITAR,
  PERMISSAO_CATEGORIAS_VISUALIZAR,
} from "@/lib/auth";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";

import { CrudCard } from "@/components/crud/CrudCard";
import { CrudToolbar } from "@/components/crud/CrudToolbar";
import { CrudSearch } from "@/components/crud/CrudSearch";
import { CrudStatusBadge } from "@/components/crud/CrudStatusBadge";
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

import { listarCategorias } from "@/services/categorias.service";
import { NovaCategoriaModal } from "@/components/produtos/NovaCategoriaModal";
import { EditarCategoriaModal } from "@/components/produtos/EditarCategoriaModal";
import { AlterarStatusCategoriaButton } from "@/components/produtos/AlterarStatusCategoriaButton";

export default function CategoriasPage() {
  const { temPermissao } = useAuth();
  const { empresaSelecionadaId, empresaEfetivaId, carregando, requerSelecao } =
    useEmpresaSelecionada();
  const possuiEmpresaEfetiva = !requerSelecao || Boolean(empresaSelecionadaId);
  const podeVisualizar = temPermissao(PERMISSAO_CATEGORIAS_VISUALIZAR);
  const podeCriar = temPermissao(PERMISSAO_CATEGORIAS_CRIAR);
  const podeEditar = temPermissao(PERMISSAO_CATEGORIAS_EDITAR);
  const [search, setSearch] = useState("");
  const [searchAplicado, setSearchAplicado] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: [
      ...estoqueQueryKeys.categorias(empresaEfetivaId ?? ""),
      searchAplicado,
      page,
    ],
    queryFn: () =>
      listarCategorias({
        search: searchAplicado,
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

  const categorias = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  if (!podeVisualizar) return <AppLayout><AcessoNegado /></AppLayout>;
  if (carregando) return <AppLayout><CrudLoading /></AppLayout>;
  if (!possuiEmpresaEfetiva) return <AppLayout><EmpresaNaoSelecionada /></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Categorias"
          description="Gerencie as categorias de produtos da empresa."
          actions={podeCriar ? <NovaCategoriaModal /> : undefined}
        />

        <CrudCard>
          <CrudToolbar>
            <CrudSearch
              value={search}
              onChange={setSearch}
              onSearch={pesquisar}
              placeholder="Pesquisar por nome ou descrição..."
            />
          </CrudToolbar>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              Erro ao carregar categorias.
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
                      <TableHead>Descrição</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {categorias.map((categoria) => (
                      <TableRow key={categoria.id}>
                        <TableCell className="font-medium">
                          {categoria.nome}
                        </TableCell>

                        <TableCell>{categoria.descricao || "-"}</TableCell>

                        <TableCell>
                          <CrudStatusBadge ativo={categoria.ativo} />
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {podeEditar && (
                              <>
                                <EditarCategoriaModal categoria={categoria} />
                                <AlterarStatusCategoriaButton categoria={categoria} />
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                    {categorias.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <CrudEmpty message="Nenhuma categoria encontrada." />
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
