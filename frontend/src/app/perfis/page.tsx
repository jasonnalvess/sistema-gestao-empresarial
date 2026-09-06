"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LockKeyhole } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { AcessoNegado } from "@/components/common/AcessoNegado";
import { EmpresaNaoSelecionada } from "@/components/common/EmpresaNaoSelecionada";
import { PageHeader } from "@/components/common/PageHeader";
import { CrudCard } from "@/components/crud/CrudCard";
import { CrudToolbar } from "@/components/crud/CrudToolbar";
import { CrudSearch } from "@/components/crud/CrudSearch";
import { CrudPagination } from "@/components/crud/CrudPagination";
import { CrudEmpty } from "@/components/crud/CrudEmpty";
import { CrudLoading } from "@/components/crud/CrudLoading";
import { CrudStatusBadge } from "@/components/crud/CrudStatusBadge";
import { NovoPerfilModal } from "@/components/perfis/NovoPerfilModal";
import { EditarPerfilModal } from "@/components/perfis/EditarPerfilModal";
import { AlterarStatusPerfilButton } from "@/components/perfis/AlterarStatusPerfilButton";
import { PermissoesPerfilModal } from "@/components/perfis/PermissoesPerfilModal";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_PERFIS_VISUALIZAR } from "@/lib/auth";
import { perfisQueryKeys } from "@/lib/perfis-query-keys";
import { listarPerfis } from "@/services/perfis.service";

export default function PerfisPage() {
  const { temPermissao } = useAuth();

  const { empresaSelecionadaId, empresaEfetivaId, carregando, requerSelecao } =
    useEmpresaSelecionada();

  const possuiEmpresa = !requerSelecao || Boolean(empresaSelecionadaId);
  const podeVisualizar = temPermissao(PERMISSAO_PERFIS_VISUALIZAR);

  const [search, setSearch] = useState("");
  const [searchAplicado, setSearchAplicado] = useState("");
  const [ativo, setAtivo] = useState("");
  const [sistema, setSistema] = useState("");
  const [page, setPage] = useState(1);

  const filtros = {
    search: searchAplicado || undefined,
    ativo: ativo === "" ? undefined : ativo === "true",
    sistema: sistema === "" ? undefined : sistema === "true",
    page,
    limit: 10,
  };

  const { data, isLoading, error } = useQuery({
    queryKey: perfisQueryKeys.lista(empresaEfetivaId ?? "", filtros),
    queryFn: () => listarPerfis(filtros),
    enabled:
      !carregando &&
      possuiEmpresa &&
      podeVisualizar &&
      Boolean(empresaEfetivaId),
  });

  const perfis = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  function pesquisar() {
    setPage(1);
    setSearchAplicado(search.trim());
  }

  function limparFiltros() {
    setSearch("");
    setSearchAplicado("");
    setAtivo("");
    setSistema("");
    setPage(1);
  }

  if (carregando) {
    return (
      <AppLayout>
        <CrudLoading />
      </AppLayout>
    );
  }

  if (!podeVisualizar) {
    return (
      <AppLayout>
        <AcessoNegado />
      </AppLayout>
    );
  }

  if (!possuiEmpresa) {
    return (
      <AppLayout>
        <EmpresaNaoSelecionada />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-w-0 space-y-6">
        <PageHeader
          title="Perfis e Permissões"
          description="Gerencie os perfis de acesso e permissões da empresa."
        />

        <CrudCard>
          <CrudToolbar>
            <CrudSearch
              value={search}
              onChange={setSearch}
              onSearch={pesquisar}
              placeholder="Pesquisar por nome ou chave..."
            />

            <NovoPerfilModal />
          </CrudToolbar>

          <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3">
            <select
              value={ativo}
              onChange={(event) => {
                setAtivo(event.target.value);
                setPage(1);
              }}
              aria-label="Filtrar perfis por situação"
              className="h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-base md:text-sm"
            >
              <option value="">Todas as situações</option>
              <option value="true">Ativos</option>
              <option value="false">Inativos</option>
            </select>

            <select
              value={sistema}
              onChange={(event) => {
                setSistema(event.target.value);
                setPage(1);
              }}
              aria-label="Filtrar perfis por tipo"
              className="h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-base md:text-sm"
            >
              <option value="">Todos os tipos</option>
              <option value="true">Perfis padrão</option>
              <option value="false">Perfis personalizados</option>
            </select>

            <button
              type="button"
              onClick={limparFiltros}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Limpar filtros
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              Erro ao carregar os perfis.
            </div>
          )}

          {isLoading ? (
            <CrudLoading />
          ) : (
            <>
              <div className="mt-5 min-w-0 max-w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Chave</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {perfis.map((perfil) => (
                      <TableRow key={perfil.id}>
                        <TableCell>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-900">
                                {perfil.nome}
                              </span>

                              {perfil.sistema && (
                                <LockKeyhole
                                  size={15}
                                  className="shrink-0 text-slate-500"
                                  aria-label="Perfil padrão protegido"
                                />
                              )}
                            </div>

                            {perfil.descricao && (
                              <p className="mt-1 max-w-lg text-xs text-slate-500">
                                {perfil.descricao}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                            {perfil.chave}
                          </code>
                        </TableCell>

                        <TableCell>
                          <span
                            className={
                              perfil.sistema
                                ? "inline-flex rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"
                                : "inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
                            }
                          >
                            {perfil.sistema ? "Padrão" : "Personalizado"}
                          </span>
                        </TableCell>

                        <TableCell>
                          <CrudStatusBadge ativo={perfil.ativo} />
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <PermissoesPerfilModal perfil={perfil} />

                            {perfil.sistema ? (
                              <span className="inline-flex items-center text-xs text-slate-500">
                                Protegido
                              </span>
                            ) : (
                              <>
                                <EditarPerfilModal perfil={perfil} />
                                <AlterarStatusPerfilButton perfil={perfil} />
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                    {!error && perfis.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <CrudEmpty message="Nenhum perfil encontrado." />
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
