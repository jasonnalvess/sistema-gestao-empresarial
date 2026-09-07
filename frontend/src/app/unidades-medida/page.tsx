"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { AcessoNegado } from "@/components/common/AcessoNegado";
import { EmpresaNaoSelecionada } from "@/components/common/EmpresaNaoSelecionada";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_UNIDADES_CRIAR, PERMISSAO_UNIDADES_EDITAR, PERMISSAO_UNIDADES_VISUALIZAR } from "@/lib/auth";
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

import { listarUnidadesMedida } from "@/services/unidades-medida.service";
import { NovaUnidadeMedidaModal } from "@/components/unidades-medida/NovaUnidadeMedidaModal";
import { EditarUnidadeMedidaModal } from "@/components/unidades-medida/EditarUnidadeMedidaModal";
import { AlterarStatusUnidadeMedidaButton } from "@/components/unidades-medida/AlterarStatusUnidadeMedidaButton";

export default function UnidadesMedidaPage() {
  const { temPermissao } = useAuth();
  const { empresaSelecionadaId, empresaEfetivaId, carregando, requerSelecao } = useEmpresaSelecionada();
  const possuiEmpresaEfetiva = !requerSelecao || Boolean(empresaSelecionadaId);
  const podeVisualizar = temPermissao(PERMISSAO_UNIDADES_VISUALIZAR);
  const podeCriar = temPermissao(PERMISSAO_UNIDADES_CRIAR);
  const podeEditar = temPermissao(PERMISSAO_UNIDADES_EDITAR);
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: [...estoqueQueryKeys.unidades(empresaEfetivaId ?? ""), page],
    queryFn: () =>
      listarUnidadesMedida({
        page,
        limit: 10,
      }),
    enabled: podeVisualizar && possuiEmpresaEfetiva && Boolean(empresaEfetivaId) && !carregando,
  });

  const unidades = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  if (!podeVisualizar) return <AppLayout><AcessoNegado /></AppLayout>;
  if (carregando) return <AppLayout><CrudLoading /></AppLayout>;
  if (!possuiEmpresaEfetiva) return <AppLayout><EmpresaNaoSelecionada /></AppLayout>;

  return (
    <AppLayout>
      <div className="min-w-0 space-y-6">
        <PageHeader
          title="Unidades de Medida"
          description="Gerencie unidades como UN, CX, KG, LT, M e outras."
          actions={podeCriar ? <NovaUnidadeMedidaModal /> : undefined}
        />

        <CrudCard>
          {error && (
            <ErrorMessage message="Erro ao carregar unidades de medida." />
          )}

          {isLoading ? (
            <CrudLoading />
          ) : (
            <>
              <div className="min-w-0 max-w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Sigla</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {unidades.map((unidade) => (
                      <TableRow key={unidade.id}>
                        <TableCell className="font-medium">
                          {unidade.nome}
                        </TableCell>

                        <TableCell>{unidade.sigla}</TableCell>

                        <TableCell>
                          <CrudStatusBadge ativo={unidade.ativo} />
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex min-w-max justify-end gap-2">
                            {podeEditar && <><EditarUnidadeMedidaModal unidade={unidade} /><AlterarStatusUnidadeMedidaButton unidade={unidade} /></>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                    {!error && unidades.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <CrudEmpty message="Nenhuma unidade de medida encontrada." />
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
