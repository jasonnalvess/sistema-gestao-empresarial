"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AppLayout } from "@/components/layout/AppLayout";
import { AcessoNegado } from "@/components/common/AcessoNegado";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { EmpresaNaoSelecionada } from "@/components/common/EmpresaNaoSelecionada";
import {
  PERMISSAO_CLIENTES_CRIAR,
  PERMISSAO_CLIENTES_EDITAR,
  PERMISSAO_CLIENTES_VISUALIZAR,
} from "@/lib/auth";

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

import { DetailsButton } from "@/components/actions/DetailsButton";
import { NewAtendimentoButton } from "@/components/actions/NewAtendimentoButton";
import { listarClientes } from "@/services/clientes.service";
import { NovoClienteModal } from "@/components/clientes/NovoClienteModal";
import { EditarClienteModal } from "@/components/clientes/EditarClienteModal";
import { AlterarStatusClienteButton } from "@/components/clientes/AlterarStatusClienteButton";
import { ClientesSummaryCards } from "@/components/clientes/ClientesSummaryCards";

export default function ClientesPage() {
  const { temPermissao } = useAuth();
  const { empresaSelecionadaId, empresaEfetivaId, carregando, requerSelecao } =
    useEmpresaSelecionada();
  const possuiEmpresaEfetiva = !requerSelecao || Boolean(empresaSelecionadaId);
  const podeVisualizarClientes = temPermissao(PERMISSAO_CLIENTES_VISUALIZAR);
  const podeCriarCliente = temPermissao(PERMISSAO_CLIENTES_CRIAR);
  const podeEditarCliente = temPermissao(PERMISSAO_CLIENTES_EDITAR);
  const [search, setSearch] = useState("");
  const [searchAplicado, setSearchAplicado] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [ativoFiltro, setAtivoFiltro] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "clientes",
      empresaEfetivaId,
      searchAplicado,
      tipoFiltro,
      ativoFiltro,
      page,
    ],
    queryFn: () =>
      listarClientes({
        search: searchAplicado,
        tipo: tipoFiltro ? (tipoFiltro as "PF" | "PJ") : undefined,
        ativo: ativoFiltro ? (ativoFiltro as "true" | "false") : undefined,
        page,
        limit: 10,
      }),
    enabled: podeVisualizarClientes && possuiEmpresaEfetiva && !carregando,
  });

  function pesquisar() {
    setPage(1);
    setSearchAplicado(search);
  }

  const clientes = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  if (!podeVisualizarClientes) {
    return (
      <AppLayout>
        <AcessoNegado />
      </AppLayout>
    );
  }

  if (carregando)
    return (
      <AppLayout>
        <CrudLoading />
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
      <div className="space-y-6">
        <PageHeader
          title="Clientes"
          description="Gerencie clientes, contatos e informações comerciais."
          actions={podeCriarCliente ? <NovoClienteModal /> : undefined}
        />

        <ClientesSummaryCards clientes={clientes} />

        <CrudCard>
          <CrudToolbar>
            <CrudSearch
              value={search}
              onChange={setSearch}
              onSearch={pesquisar}
              placeholder="Pesquisar por nome, documento, e-mail ou celular..."
            />
          </CrudToolbar>

          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Tipo</label>
              <select
                value={tipoFiltro}
                onChange={(e) => {
                  setPage(1);
                  setTipoFiltro(e.target.value);
                }}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                <option value="PF">Pessoa Física</option>
                <option value="PJ">Pessoa Jurídica</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Status
              </label>
              <select
                value={ativoFiltro}
                onChange={(e) => {
                  setPage(1);
                  setAtivoFiltro(e.target.value);
                }}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                <option value="true">Ativos</option>
                <option value="false">Inativos</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              Erro ao carregar clientes.
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
                      <TableHead>Tipo</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Cidade/UF</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {clientes.map((cliente) => (
                      <TableRow key={cliente.id}>
                        <TableCell className="font-medium">
                          {cliente.nome}
                        </TableCell>

                        <TableCell>{cliente.tipo}</TableCell>

                        <TableCell>{cliente.documento || "-"}</TableCell>

                        <TableCell>
                          <div>
                            <p>{cliente.email || "-"}</p>
                            <p className="text-xs text-slate-500">
                              {cliente.celular || cliente.telefone || "-"}
                            </p>
                          </div>
                        </TableCell>

                        <TableCell>
                          {cliente.cidade || "-"}
                          {cliente.estado ? `/${cliente.estado}` : ""}
                        </TableCell>

                        <TableCell>
                          <CrudStatusBadge ativo={cliente.ativo} />
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <DetailsButton href={`/clientes/${cliente.id}`} />
                            <NewAtendimentoButton clienteId={cliente.id} />
                            {podeEditarCliente && (
                              <>
                                <EditarClienteModal cliente={cliente} />
                                <AlterarStatusClienteButton cliente={cliente} />
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                    {clientes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <CrudEmpty message="Nenhum cliente encontrado." />
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
