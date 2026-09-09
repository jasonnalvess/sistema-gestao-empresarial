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
import { PERMISSAO_DEPOSITOS_CRIAR, PERMISSAO_DEPOSITOS_EDITAR, PERMISSAO_DEPOSITOS_VISUALIZAR } from "@/lib/auth";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";
import { CrudCard } from "@/components/crud/CrudCard";
import { CrudToolbar } from "@/components/crud/CrudToolbar";
import { CrudSearch } from "@/components/crud/CrudSearch";
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

import { listarDepositos } from "@/services/depositos.service";

import { NovoDepositoModal } from "@/components/depositos/NovoDepositoModal";
import { EditarDepositoModal } from "@/components/depositos/EditarDepositoModal";
import { AlterarStatusDepositoButton } from "@/components/depositos/AlterarStatusDepositoButton";

export default function DepositosPage() {
  const { temPermissao } = useAuth();
  const { empresaSelecionadaId, empresaEfetivaId, carregando, requerSelecao } = useEmpresaSelecionada();
  const possuiEmpresaEfetiva = !requerSelecao || Boolean(empresaSelecionadaId);
  const podeVisualizar = temPermissao(PERMISSAO_DEPOSITOS_VISUALIZAR);
  const podeCriar = temPermissao(PERMISSAO_DEPOSITOS_CRIAR);
  const podeEditar = temPermissao(PERMISSAO_DEPOSITOS_EDITAR);
  const [search, setSearch] = useState("");
  const [searchAplicado, setSearchAplicado] = useState("");
  const [ativo, setAtivo] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: [...estoqueQueryKeys.depositos(empresaEfetivaId ?? ""), searchAplicado, ativo, page],
    queryFn: () =>
      listarDepositos({
        search: searchAplicado || undefined,
        ativo: ativo === "" ? undefined : ativo === "true",
        page,
        limit: 10,
        sortBy: "createdAt",
        order: "desc",
      }),
    enabled: podeVisualizar && possuiEmpresaEfetiva && Boolean(empresaEfetivaId) && !carregando,
  });

  function pesquisar() {
    setPage(1);
    setSearchAplicado(search);
  }

  const depositos = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  if (!podeVisualizar) return <AppLayout><AcessoNegado /></AppLayout>;
  if (carregando) return <AppLayout><CrudLoading /></AppLayout>;
  if (!possuiEmpresaEfetiva) return <AppLayout><EmpresaNaoSelecionada /></AppLayout>;

  return (
    <AppLayout>
      <div className="min-w-0 space-y-6">
        <PageHeader
          title="Depósitos"
          description="Gerencie depósitos, almoxarifados e locais de armazenamento."
          actions={podeCriar ? <NovoDepositoModal /> : undefined}
        />

        <CrudCard>
          <CrudToolbar>
            <CrudSearch
              value={search}
              onChange={setSearch}
              onSearch={pesquisar}
              placeholder="Pesquisar por nome ou código..."
            />
          </CrudToolbar>

          <div className="mt-4 w-full min-w-0 md:max-w-xs">
            <select
              value={ativo}
              onChange={(e) => {
                setAtivo(e.target.value);
                setPage(1);
              }}
              aria-label="Filtrar depósitos por status"
              className="h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-base md:text-sm"
            >
              <option value="">Todos os status</option>
              <option value="true">Ativos</option>
              <option value="false">Inativos</option>
            </select>
          </div>

          {error && (
            <ErrorMessage
              className="mt-4"
              message="Erro ao carregar depósitos."
            />
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
                      <TableHead>Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Endereço</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {depositos.map((deposito) => (
                      <TableRow key={deposito.id}>
                        <TableCell className="font-medium">
                          {deposito.nome}
                        </TableCell>

                        <TableCell>{deposito.codigo}</TableCell>

                        <TableCell>
                          {deposito.descricao || "-"}
                        </TableCell>

                        <TableCell>
                          {deposito.endereco || "-"}
                        </TableCell>

                        <TableCell>
                          <CrudStatusBadge ativo={deposito.ativo} />
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex min-w-max justify-end gap-2">
                            {podeEditar && <><EditarDepositoModal deposito={deposito} /><AlterarStatusDepositoButton deposito={deposito} /></>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                    {!error && depositos.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <CrudEmpty
                            message={
                              searchAplicado || ativo
                                ? "Nenhum depósito encontrado para os filtros aplicados."
                                : "Nenhum depósito encontrado."
                            }
                          />
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
