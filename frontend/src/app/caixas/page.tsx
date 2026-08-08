"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import {
  CircleDollarSign,
  LockKeyhole,
  LockKeyholeOpen,
  WalletCards,
  ListFilter,
} from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { AcessoNegado } from "@/components/common/AcessoNegado";
import { EmpresaNaoSelecionada } from "@/components/common/EmpresaNaoSelecionada";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_CAIXA_CRIAR, PERMISSAO_CAIXA_VISUALIZAR } from "@/lib/auth";
import { caixasQueryKeys } from "@/lib/caixas-query-keys";
import { PageHeader } from "@/components/common/PageHeader";
import { CrudCard } from "@/components/crud/CrudCard";
import { CrudToolbar } from "@/components/crud/CrudToolbar";
import { CrudSearch } from "@/components/crud/CrudSearch";
import { CrudPagination } from "@/components/crud/CrudPagination";
import { CrudEmpty } from "@/components/crud/CrudEmpty";
import { CrudLoading } from "@/components/crud/CrudLoading";
import { DetailsButton } from "@/components/actions/DetailsButton";
import { Button } from "@/components/ui/button";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { NovoCaixaModal } from "@/components/caixas/NovoCaixaModal";

import {
  listarCaixas,
  buscarResumoCaixas,
  StatusCaixa,
} from "@/services/caixas.service";

export default function CaixasPage() {
  const { temPermissao } = useAuth();
  const { empresaSelecionadaId, empresaEfetivaId, carregando, requerSelecao } =
    useEmpresaSelecionada();
  const possuiEmpresa = !requerSelecao || Boolean(empresaSelecionadaId);
  const podeVisualizar = temPermissao(PERMISSAO_CAIXA_VISUALIZAR);
  const podeCriar = temPermissao(PERMISSAO_CAIXA_CRIAR);
  const [search, setSearch] = useState("");
  const [searchAplicado, setSearchAplicado] = useState("");

  const [status, setStatus] = useState("");
  const [ativo, setAtivo] = useState("");

  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: caixasQueryKeys.lista(empresaEfetivaId ?? "", {
      search: searchAplicado || undefined,
      status: status ? (status as StatusCaixa) : undefined,
      ativo: ativo === "" ? undefined : ativo === "true",
      page,
      limit: 10,
      sortBy: "nome",
      order: "asc",
    }),

    queryFn: () =>
      listarCaixas({
        search: searchAplicado || undefined,

        status: status ? (status as StatusCaixa) : undefined,

        ativo: ativo === "" ? undefined : ativo === "true",

        page,
        limit: 10,
        sortBy: "nome",
        order: "asc",
      }),
    enabled:
      !carregando &&
      possuiEmpresa &&
      podeVisualizar &&
      Boolean(empresaEfetivaId),
  });

  const { data: resumoGlobal } = useQuery({
    queryKey: caixasQueryKeys.resumo(empresaEfetivaId ?? ""),
    queryFn: () => buscarResumoCaixas(),
    enabled:
      !carregando &&
      possuiEmpresa &&
      podeVisualizar &&
      Boolean(empresaEfetivaId),
  });

  const caixas = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  function pesquisar() {
    setPage(1);
    setSearchAplicado(search);
  }

  function limparFiltros() {
    setSearch("");
    setSearchAplicado("");
    setStatus("");
    setAtivo("");
    setPage(1);
  }

  if (carregando)
    return (
      <AppLayout>
        <CrudLoading />
      </AppLayout>
    );
  if (!podeVisualizar)
    return (
      <AppLayout>
        <AcessoNegado />
      </AppLayout>
    );
  if (!possuiEmpresa)
    return (
      <AppLayout>
        <EmpresaNaoSelecionada />
      </AppLayout>
    );

  return (
    <AppLayout>
      <div className="min-w-0 space-y-6">
        <PageHeader
          title="Caixas"
          description="Controle de caixas, saldos, aberturas, fechamentos e movimentações."
          actions={
            <div className="grid w-full min-w-0 grid-cols-1 gap-2 lg:flex lg:w-auto lg:flex-wrap [&>*]:w-full md:[&>*]:w-full lg:[&>*]:w-auto">
              <Button variant="outline" asChild>
                <Link href="/caixas/movimentacoes">
                  <ListFilter size={16} className="mr-2" />
                  Movimentações
                </Link>
              </Button>

              {podeCriar ? <NovoCaixaModal /> : null}
            </div>
          }
        />

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ResumoCard
            titulo="Saldo exibido"
            valor={formatarMoeda(resumoGlobal?.caixas.saldoTotal ?? 0)}
            icone={<CircleDollarSign size={20} />}
          />

          <ResumoCard
            titulo="Caixas abertos"
            valor={String(resumoGlobal?.caixas.abertos ?? 0)}
            icone={<LockKeyholeOpen size={20} />}
          />

          <ResumoCard
            titulo="Caixas fechados"
            valor={String(resumoGlobal?.caixas.fechados ?? 0)}
            icone={<LockKeyhole size={20} />}
          />

          <ResumoCard
            titulo="Caixas inativos"
            valor={String(resumoGlobal?.caixas.inativos ?? 0)}
            icone={<WalletCards size={20} />}
          />
        </div>

        <CrudCard>
          <CrudToolbar>
            <CrudSearch
              value={search}
              onChange={setSearch}
              onSearch={pesquisar}
              placeholder="Pesquisar por nome, código ou descrição..."
            />
          </CrudToolbar>

          <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3">
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-base md:text-sm"
            >
              <option value="">Todos os status</option>

              <option value="ABERTO">Aberto</option>

              <option value="FECHADO">Fechado</option>

              <option value="INATIVO">Inativo</option>
            </select>

            <select
              value={ativo}
              onChange={(event) => {
                setAtivo(event.target.value);
                setPage(1);
              }}
              className="h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-base md:text-sm"
            >
              <option value="">Todos</option>

              <option value="true">Ativos</option>

              <option value="false">Inativos</option>
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
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              Erro ao carregar caixas.
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
                      <TableHead>Código</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Situação</TableHead>

                      <TableHead className="text-right">Saldo atual</TableHead>

                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {caixas.map((caixa) => (
                      <TableRow key={caixa.id}>
                        <TableCell>
                          <p className="font-medium text-slate-900">
                            {caixa.nome}
                          </p>

                          {caixa.descricao && (
                            <p className="text-xs text-slate-500">
                              {caixa.descricao}
                            </p>
                          )}
                        </TableCell>

                        <TableCell>{caixa.codigo}</TableCell>

                        <TableCell>
                          <StatusBadge status={caixa.status} />
                        </TableCell>

                        <TableCell>
                          <span
                            className={
                              caixa.ativo
                                ? "inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700"
                                : "inline-flex rounded-full bg-slate-200 px-2 py-1 text-xs font-medium text-slate-700"
                            }
                          >
                            {caixa.ativo ? "Ativo" : "Inativo"}
                          </span>
                        </TableCell>

                        <TableCell className="text-right font-medium">
                          {formatarMoeda(caixa.saldoAtual)}
                        </TableCell>

                        <TableCell className="text-right">
                          <DetailsButton href={`/caixas/${caixa.id}`} />
                        </TableCell>
                      </TableRow>
                    ))}

                    {caixas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <CrudEmpty message="Nenhum caixa encontrado." />
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

function ResumoCard({
  titulo,
  valor,
  icone,
}: {
  titulo: string;
  valor: string;
  icone: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{titulo}</p>

          <p className="mt-2 text-2xl font-bold text-slate-900">{valor}</p>
        </div>

        <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
          {icone}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: StatusCaixa }) {
  const configuracoes: Record<
    StatusCaixa,
    {
      label: string;
      classe: string;
    }
  > = {
    ABERTO: {
      label: "Aberto",
      classe: "bg-green-100 text-green-700",
    },

    FECHADO: {
      label: "Fechado",
      classe: "bg-amber-100 text-amber-700",
    },

    INATIVO: {
      label: "Inativo",
      classe: "bg-slate-200 text-slate-700",
    },
  };

  const configuracao = configuracoes[status];

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${configuracao.classe}`}
    >
      {configuracao.label}
    </span>
  );
}

function formatarMoeda(valor: string | number) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
