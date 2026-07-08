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

import { listarAuditoria } from "@/services/auditoria.service";

function badgeAcao(acao: string) {
  const base = "rounded-full px-2 py-1 text-xs font-medium";

  if (acao === "CRIAR") return `${base} bg-green-100 text-green-700`;
  if (acao === "ATUALIZAR") return `${base} bg-blue-100 text-blue-700`;
  if (acao === "DESATIVAR") return `${base} bg-red-100 text-red-700`;
  if (acao === "ATIVAR") return `${base} bg-emerald-100 text-emerald-700`;

  return `${base} bg-slate-100 text-slate-700`;
}

export default function AuditoriaPage() {
  const [search, setSearch] = useState("");
  const [searchAplicado, setSearchAplicado] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["auditoria", searchAplicado, page],
    queryFn: () =>
      listarAuditoria({
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

  const logs = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Auditoria"
          description="Acompanhe as ações realizadas no sistema."
        />

        <CrudCard>
          <CrudToolbar>
            <CrudSearch
              value={search}
              onChange={setSearch}
              onSearch={pesquisar}
              placeholder="Pesquisar por ação, entidade ou usuário..."
            />
          </CrudToolbar>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              Erro ao carregar auditoria.
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
                      <TableHead>Ação</TableHead>
                      <TableHead>Entidade</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>IP</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <span className={badgeAcao(log.acao)}>
                            {log.acao}
                          </span>
                        </TableCell>

                        <TableCell className="font-medium">
                          {log.entidade}
                        </TableCell>

                        <TableCell>
                          {log.usuario?.nome ?? "-"}
                        </TableCell>

                        <TableCell>
                          {log.empresa?.nome ?? "-"}
                        </TableCell>

                        <TableCell>
                          {new Date(log.createdAt).toLocaleString("pt-BR")}
                        </TableCell>

                        <TableCell>{log.ip || "-"}</TableCell>
                      </TableRow>
                    ))}

                    {logs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <CrudEmpty message="Nenhum registro de auditoria encontrado." />
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
