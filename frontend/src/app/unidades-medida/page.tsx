"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";

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
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["unidades-medida", page],
    queryFn: () =>
      listarUnidadesMedida({
        page,
        limit: 10,
      }),
  });

  const unidades = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Unidades de Medida"
          description="Gerencie unidades como UN, CX, KG, LT, M e outras."
          actions={<NovaUnidadeMedidaModal />}
        />

        <CrudCard>
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              Erro ao carregar unidades de medida.
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
                          <div className="flex justify-end gap-2">
                            <EditarUnidadeMedidaModal unidade={unidade} />
                            <AlterarStatusUnidadeMedidaButton unidade={unidade} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                    {unidades.length === 0 && (
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
