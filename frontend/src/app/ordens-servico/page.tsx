"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";

import { CrudCard } from "@/components/crud/CrudCard";
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

import { DetailsButton } from "@/components/actions/DetailsButton";
import { listarOrdensServico } from "@/services/ordens-servico.service";
import { NovaOrdemServicoModal } from "@/components/ordens-servico/NovaOrdemServicoModal";
import { OrdemServicoStatusBadge } from "@/components/ordens-servico/OrdemServicoStatusBadge";
import { OrdemServicoPrioridadeBadge } from "@/components/ordens-servico/OrdemServicoPrioridadeBadge";
import { OrdensServicoSummaryCards } from "@/components/ordens-servico/OrdensServicoSummaryCards";

export default function OrdensServicoPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchAplicado, setSearchAplicado] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [prioridadeFiltro, setPrioridadeFiltro] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "ordens-servico",
      searchAplicado,
      statusFiltro,
      prioridadeFiltro,
      page,
    ],
    queryFn: () =>
      listarOrdensServico({
        search: searchAplicado,
        status: statusFiltro
          ? (statusFiltro as "ABERTA" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA")
          : undefined,
        prioridade: prioridadeFiltro
          ? (prioridadeFiltro as "BAIXA" | "NORMAL" | "ALTA" | "URGENTE")
          : undefined,
        page,
        limit: 10,
      }),
  });

  const ordens = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  function pesquisar() {
    setPage(1);
    setSearchAplicado(search);
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Ordens de Serviço"
          description="Gerencie solicitações técnicas, serviços e atendimentos operacionais."
          actions={<NovaOrdemServicoModal />}
        />

        <OrdensServicoSummaryCards ordens={ordens} />

        <CrudCard>
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              Erro ao carregar ordens de serviço.
            </div>
          )}

          {isLoading ? (
            <CrudLoading />
          ) : (
            <>
              <div className="mb-4 grid gap-3 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Buscar</label>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") pesquisar();
                    }}
                    placeholder="Título, descrição, cliente..."
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Status</label>
                  <select
                    value={statusFiltro}
                    onChange={(e) => {
                      setPage(1);
                      setStatusFiltro(e.target.value);
                    }}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Todos</option>
                    <option value="ABERTA">Aberta</option>
                    <option value="EM_ANDAMENTO">Em andamento</option>
                    <option value="CONCLUIDA">Concluída</option>
                    <option value="CANCELADA">Cancelada</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Prioridade</label>
                  <select
                    value={prioridadeFiltro}
                    onChange={(e) => {
                      setPage(1);
                      setPrioridadeFiltro(e.target.value);
                    }}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Todas</option>
                    <option value="BAIXA">Baixa</option>
                    <option value="NORMAL">Normal</option>
                    <option value="ALTA">Alta</option>
                    <option value="URGENTE">Urgente</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Abertura</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {ordens.map((ordem) => (
                      <TableRow key={ordem.id}>
                        <TableCell className="font-medium">
                          #{ordem.numero}
                        </TableCell>

                        <TableCell>{ordem.titulo}</TableCell>

                        <TableCell>{ordem.cliente?.nome || "-"}</TableCell>

                        <TableCell>
                          <OrdemServicoStatusBadge status={ordem.status} />
                        </TableCell>

                        <TableCell>
                          <OrdemServicoPrioridadeBadge prioridade={ordem.prioridade} />
                        </TableCell>

                        <TableCell>
                          {new Date(ordem.dataAbertura).toLocaleString(
                            "pt-BR"
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          <DetailsButton href={`/ordens-servico/${ordem.id}`} />
                        </TableCell>
                      </TableRow>
                    ))}

                    {ordens.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <CrudEmpty message="Nenhuma ordem de serviço encontrada." />
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
