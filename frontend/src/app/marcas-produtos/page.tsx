"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { AcessoNegado } from "@/components/common/AcessoNegado";
import { EmpresaNaoSelecionada } from "@/components/common/EmpresaNaoSelecionada";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_MARCAS_CRIAR, PERMISSAO_MARCAS_EDITAR, PERMISSAO_MARCAS_VISUALIZAR } from "@/lib/auth";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";

import { CrudCard } from "@/components/crud/CrudCard";
import { CrudPagination } from "@/components/crud/CrudPagination";
import { CrudEmpty } from "@/components/crud/CrudEmpty";
import { CrudLoading } from "@/components/crud/CrudLoading";
import { CrudStatusBadge } from "@/components/crud/CrudStatusBadge";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { listarMarcasProdutos } from "@/services/marcas-produtos.service";
import { NovaMarcaProdutoModal } from "@/components/marcas-produtos/NovaMarcaProdutoModal";
import { EditarMarcaProdutoModal } from "@/components/marcas-produtos/EditarMarcaProdutoModal";
import { AlterarStatusMarcaProdutoButton } from "@/components/marcas-produtos/AlterarStatusMarcaProdutoButton";

export default function MarcasProdutosPage() {
  const { temPermissao } = useAuth();
  const { empresaSelecionadaId, empresaEfetivaId, carregando, requerSelecao } = useEmpresaSelecionada();
  const possuiEmpresaEfetiva = !requerSelecao || Boolean(empresaSelecionadaId);
  const podeVisualizar = temPermissao(PERMISSAO_MARCAS_VISUALIZAR);
  const podeCriar = temPermissao(PERMISSAO_MARCAS_CRIAR);
  const podeEditar = temPermissao(PERMISSAO_MARCAS_EDITAR);
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: [...estoqueQueryKeys.marcas(empresaEfetivaId ?? ""), page],
    queryFn: () =>
      listarMarcasProdutos({
        page,
        limit: 10,
      }),
    enabled: podeVisualizar && possuiEmpresaEfetiva && Boolean(empresaEfetivaId) && !carregando,
  });

  const marcas = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  if (!podeVisualizar) return <AppLayout><AcessoNegado /></AppLayout>;
  if (carregando) return <AppLayout><CrudLoading /></AppLayout>;
  if (!possuiEmpresaEfetiva) return <AppLayout><EmpresaNaoSelecionada /></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Marcas de Produto"
          description="Gerencie marcas e fabricantes vinculados aos produtos."
          actions={podeCriar ? <NovaMarcaProdutoModal /> : undefined}
        />

        <CrudCard>
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              Erro ao carregar marcas de produto.
            </div>
          )}

          {isLoading ? (
            <CrudLoading />
          ) : (
            <>
              <div className="overflow-x-auto">
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
                    {marcas.map((marca) => (
                      <TableRow key={marca.id}>
                        <TableCell className="font-medium">
                          {marca.nome}
                        </TableCell>

                        <TableCell>{marca.descricao || "-"}</TableCell>

                        <TableCell>
                          <CrudStatusBadge ativo={marca.ativo} />
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {podeEditar && <><EditarMarcaProdutoModal marca={marca} /><AlterarStatusMarcaProdutoButton marca={marca} /></>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                    {marcas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <CrudEmpty message="Nenhuma marca encontrada." />
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
