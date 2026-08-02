"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { AcessoNegado } from "@/components/common/AcessoNegado";
import { EmpresaNaoSelecionada } from "@/components/common/EmpresaNaoSelecionada";
import { CrudCard } from "@/components/crud/CrudCard";
import { CrudToolbar } from "@/components/crud/CrudToolbar";
import { CrudSearch } from "@/components/crud/CrudSearch";
import { CrudPagination } from "@/components/crud/CrudPagination";
import { CrudEmpty } from "@/components/crud/CrudEmpty";
import { CrudLoading } from "@/components/crud/CrudLoading";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NovoInventarioModal } from "@/components/inventarios/NovoInventarioModal";
import { InventarioStatusBadge } from "@/components/inventarios/InventarioStatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_DEPOSITOS_VISUALIZAR, PERMISSAO_INVENTARIOS_VISUALIZAR } from "@/lib/auth";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";
import { listarDepositos } from "@/services/depositos.service";
import { listarInventarios, StatusInventarioEstoque } from "@/services/inventarios.service";

const limite = 10;
const sortBy = "createdAt" as const;
const order = "desc" as const;

export default function InventariosPage() {
  const { temPermissao } = useAuth();
  const { empresaSelecionadaId, empresaEfetivaId, carregando, requerSelecao } = useEmpresaSelecionada();
  const possuiEmpresa = !requerSelecao || Boolean(empresaSelecionadaId);
  const podeVisualizar = temPermissao(PERMISSAO_INVENTARIOS_VISUALIZAR);
  const podeVerDepositos = temPermissao(PERMISSAO_DEPOSITOS_VISUALIZAR);
  const [search, setSearch] = useState("");
  const [searchAplicado, setSearchAplicado] = useState("");
  const [status, setStatus] = useState<StatusInventarioEstoque | "">("");
  const [depositoId, setDepositoId] = useState("");
  const [page, setPage] = useState(1);

  const { data: depositos } = useQuery({
    queryKey: estoqueQueryKeys.depositosSelect(empresaEfetivaId ?? "", "filtro-inventarios"),
    queryFn: () => listarDepositos({ page: 1, limit: 100, sortBy: "nome", order: "asc" }),
    enabled: podeVisualizar && podeVerDepositos && possuiEmpresa && Boolean(empresaEfetivaId) && !carregando,
  });
  const { data, isLoading, error } = useQuery({
    queryKey: [...estoqueQueryKeys.inventarios(empresaEfetivaId ?? ""), searchAplicado, status, depositoId, page, limite, sortBy, order],
    queryFn: () => listarInventarios({ search: searchAplicado || undefined, status: status || undefined, depositoId: depositoId || undefined, page, limit: limite, sortBy, order }),
    enabled: podeVisualizar && possuiEmpresa && Boolean(empresaEfetivaId) && !carregando,
  });

  if (carregando) return <AppLayout><CrudLoading /></AppLayout>;
  if (!podeVisualizar) return <AppLayout><AcessoNegado /></AppLayout>;
  if (!possuiEmpresa) return <AppLayout><EmpresaNaoSelecionada /></AppLayout>;

  return <AppLayout><div className="space-y-6">
    <PageHeader title="Inventários" description="Consulte históricos e realize contagens físicas de estoque." actions={<NovoInventarioModal />} />
    <CrudCard>
      <CrudToolbar><CrudSearch value={search} onChange={setSearch} onSearch={() => { setPage(1); setSearchAplicado(search); }} placeholder="Pesquisar por número, descrição ou depósito..." /></CrudToolbar>
      <div className={`mt-4 grid gap-4 ${podeVerDepositos ? "md:grid-cols-2" : ""}`}>
        <select value={status} onChange={(e) => { setStatus(e.target.value as StatusInventarioEstoque | ""); setPage(1); }} className="rounded-md border bg-white px-3 py-2 text-sm">
          <option value="">Todos os status</option><option value="ABERTO">Aberto</option><option value="EM_CONTAGEM">Em contagem</option><option value="FINALIZADO">Finalizado</option><option value="CANCELADO">Cancelado</option>
        </select>
        {podeVerDepositos && <select value={depositoId} onChange={(e) => { setDepositoId(e.target.value); setPage(1); }} className="rounded-md border bg-white px-3 py-2 text-sm"><option value="">Todos os depósitos</option>{depositos?.data.map((d) => <option key={d.id} value={d.id}>{d.codigo} - {d.nome}</option>)}</select>}
      </div>
      {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">Erro ao carregar inventários.</div>}
      {isLoading ? <CrudLoading /> : <>
        <div className="mt-5 overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Número</TableHead><TableHead>Status</TableHead><TableHead>Depósito</TableHead><TableHead>Descrição</TableHead><TableHead>Itens</TableHead><TableHead>Abertura</TableHead><TableHead>Conclusão</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
        <TableBody>{data?.data.map((item) => <TableRow key={item.id}><TableCell className="font-medium">#{String(item.numero).padStart(5, "0")}</TableCell><TableCell><InventarioStatusBadge status={item.status} /></TableCell><TableCell>{item.deposito.codigo} - {item.deposito.nome}</TableCell><TableCell>{item.descricao || "-"}</TableCell><TableCell>{item._count?.itens ?? "-"}</TableCell><TableCell>{new Date(item.dataAbertura).toLocaleString("pt-BR")}</TableCell><TableCell>{item.dataConclusao ? new Date(item.dataConclusao).toLocaleString("pt-BR") : "-"}</TableCell><TableCell><Button size="sm" variant="outline" asChild><Link href={`/inventarios/${item.id}`}><Eye />Detalhes</Link></Button></TableCell></TableRow>)}
        {!data?.data.length && <TableRow><TableCell colSpan={8}><CrudEmpty message="Nenhum inventário encontrado." /></TableCell></TableRow>}</TableBody></Table></div>
        <CrudPagination page={page} totalPages={data?.meta.totalPages ?? 1} onPageChange={setPage} />
      </>}
    </CrudCard>
  </div></AppLayout>;
}
