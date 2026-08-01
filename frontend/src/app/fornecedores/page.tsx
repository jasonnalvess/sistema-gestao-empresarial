"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AppLayout } from "@/components/layout/AppLayout";
import { AcessoNegado } from "@/components/common/AcessoNegado";
import { EmpresaNaoSelecionada } from "@/components/common/EmpresaNaoSelecionada";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import {
  PERMISSAO_FORNECEDORES_CRIAR,
  PERMISSAO_FORNECEDORES_EDITAR,
  PERMISSAO_FORNECEDORES_VISUALIZAR,
} from "@/lib/auth";
import { CrudCard } from "@/components/crud/CrudCard";
import { CrudToolbar } from "@/components/crud/CrudToolbar";
import { CrudSearch } from "@/components/crud/CrudSearch";
import { CrudStatusBadge } from "@/components/crud/CrudStatusBadge";
import { CrudPagination } from "@/components/crud/CrudPagination";
import { CrudEmpty } from "@/components/crud/CrudEmpty";
import { CrudLoading } from "@/components/crud/CrudLoading";
import { NovoFornecedorModal } from "@/components/fornecedores/NovoFornecedorModal";
import { EditarFornecedorModal } from "@/components/fornecedores/EditarFornecedorModal";
import { AlterarStatusFornecedorButton } from "@/components/fornecedores/AlterarStatusFornecedorButton";
import { DetailsButton } from "@/components/actions/DetailsButton";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { listarFornecedores } from "@/services/fornecedores.service";

export default function FornecedoresPage() {
  const { temPermissao } = useAuth();
  const { empresaSelecionadaId, empresaEfetivaId, carregando, requerSelecao } =
    useEmpresaSelecionada();
  const possuiEmpresaEfetiva = !requerSelecao || Boolean(empresaSelecionadaId);
  const podeVisualizarFornecedores = temPermissao(
    PERMISSAO_FORNECEDORES_VISUALIZAR
  );
  const podeCriarFornecedor = temPermissao(PERMISSAO_FORNECEDORES_CRIAR);
  const podeEditarFornecedor = temPermissao(PERMISSAO_FORNECEDORES_EDITAR);
  const [search, setSearch] = useState("");
  const [searchAplicado, setSearchAplicado] = useState("");
  const [ativo, setAtivo] = useState("");
  const [estado, setEstado] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "fornecedores",
      empresaEfetivaId,
      searchAplicado,
      ativo,
      estado,
      page,
    ],
    queryFn: () =>
      listarFornecedores({
        search: searchAplicado || undefined,
        ativo: ativo === "" ? undefined : ativo === "true",
        estado: estado || undefined,
        page,
        limit: 10,
        sortBy: "createdAt",
        order: "desc",
      }),
    enabled:
      podeVisualizarFornecedores && possuiEmpresaEfetiva && !carregando,
  });

  function pesquisar() {
    setPage(1);
    setSearchAplicado(search);
  }

  function formatarDocumento(documento: string) {
    if (documento.length === 14) {
      return documento.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        "$1.$2.$3/$4-$5"
      );
    }

    if (documento.length === 11) {
      return documento.replace(
        /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
        "$1.$2.$3-$4"
      );
    }

    return documento;
  }

  const fornecedores = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  if (!podeVisualizarFornecedores) {
    return (
      <AppLayout>
        <AcessoNegado />
      </AppLayout>
    );
  }

  if (carregando) {
    return (
      <AppLayout>
        <CrudLoading />
      </AppLayout>
    );
  }

  if (!possuiEmpresaEfetiva) {
    return (
      <AppLayout>
        <EmpresaNaoSelecionada />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Fornecedores"
          description="Gerencie os fornecedores da empresa."
          actions={podeCriarFornecedor ? <NovoFornecedorModal /> : undefined}
        />

        <CrudCard>
          <CrudToolbar>
            <CrudSearch
              value={search}
              onChange={setSearch}
              onSearch={pesquisar}
              placeholder="Pesquisar por razão social, fantasia, documento ou contato..."
            />
          </CrudToolbar>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <select
              value={ativo}
              onChange={(e) => {
                setAtivo(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Todos os status</option>
              <option value="true">Ativos</option>
              <option value="false">Inativos</option>
            </select>

            <InputEstado
              value={estado}
              onChange={(valor) => {
                setEstado(valor);
                setPage(1);
              }}
            />
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              Erro ao carregar fornecedores.
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
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Cidade/UF</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {fornecedores.map((fornecedor) => (
                      <TableRow key={fornecedor.id}>
                        <TableCell>
                          <p className="font-medium text-slate-900">
                            {fornecedor.nomeFantasia ||
                              fornecedor.razaoSocial}
                          </p>

                          {fornecedor.nomeFantasia && (
                            <p className="text-xs text-slate-500">
                              {fornecedor.razaoSocial}
                            </p>
                          )}
                        </TableCell>

                        <TableCell>
                          {formatarDocumento(
                            fornecedor.documento
                          )}
                        </TableCell>

                        <TableCell>
                          <p>
                            {fornecedor.contato ||
                              fornecedor.email ||
                              "-"}
                          </p>

                          {fornecedor.celular && (
                            <p className="text-xs text-slate-500">
                              {fornecedor.celular}
                            </p>
                          )}
                        </TableCell>

                        <TableCell>
                          {fornecedor.cidade || fornecedor.estado
                            ? `${fornecedor.cidade || "-"} / ${
                                fornecedor.estado || "-"
                              }`
                            : "-"}
                        </TableCell>

                        <TableCell>
                          <CrudStatusBadge
                            ativo={fornecedor.ativo}
                          />
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <DetailsButton
                              href={`/fornecedores/${fornecedor.id}`}
                            />

                            {podeEditarFornecedor && (
                              <>
                                <EditarFornecedorModal fornecedor={fornecedor} />
                                <AlterarStatusFornecedorButton fornecedor={fornecedor} />
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                    {fornecedores.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <CrudEmpty message="Nenhum fornecedor encontrado." />
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

function InputEstado({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      value={value}
      maxLength={2}
      onChange={(e) =>
        onChange(e.target.value.toUpperCase())
      }
      placeholder="Filtrar por UF"
      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
    />
  );
}
