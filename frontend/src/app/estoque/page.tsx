"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_ESTOQUE_VISUALIZAR } from "@/lib/auth";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";
import { listarEstoque } from "@/services/estoque.service";

function statusEstoque(atual: string, minimo: string, maximo?: string) {
  const quantidadeAtual = Number(atual); const estoqueMinimo = Number(minimo); const estoqueMaximo = maximo ? Number(maximo) : null;
  if (quantidadeAtual <= estoqueMinimo) return <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700">Baixo</span>;
  if (estoqueMaximo && quantidadeAtual >= estoqueMaximo) return <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">Cheio</span>;
  return <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">Normal</span>;
}
export default function EstoquePage() {
  const { temPermissao } = useAuth();
  const { empresaSelecionadaId, empresaEfetivaId, carregando, requerSelecao } = useEmpresaSelecionada();
  const podeVisualizar = temPermissao(PERMISSAO_ESTOQUE_VISUALIZAR);
  const possuiEmpresa = !requerSelecao || Boolean(empresaSelecionadaId);
  const [search, setSearch] = useState(""); const [searchAplicado, setSearchAplicado] = useState(""); const [page, setPage] = useState(1);
  const { data, isLoading, error } = useQuery({
    queryKey: estoqueQueryKeys.estoque(empresaEfetivaId ?? "", searchAplicado, page, 10, "quantidadeAtual", "asc"),
    queryFn: () => listarEstoque({ search: searchAplicado, page, limit: 10, sortBy: "quantidadeAtual", order: "asc" }),
    enabled: podeVisualizar && possuiEmpresa && Boolean(empresaEfetivaId) && !carregando,
  });
  if (carregando) return <AppLayout><CrudLoading /></AppLayout>;
  if (!podeVisualizar) return <AppLayout><AcessoNegado /></AppLayout>;
  if (!possuiEmpresa) return <AppLayout><EmpresaNaoSelecionada /></AppLayout>;
  const itens = data?.data ?? [];
  return <AppLayout><div className="min-w-0 space-y-6"><PageHeader title="Estoque" description="Acompanhe os saldos atuais dos produtos." /><CrudCard><CrudToolbar><CrudSearch value={search} onChange={setSearch} onSearch={() => { setPage(1); setSearchAplicado(search); }} placeholder="Pesquisar por produto ou código..." /></CrudToolbar>
    {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">Erro ao carregar estoque.</div>}
    {isLoading ? <CrudLoading /> : <><div className="mt-5 min-w-0 max-w-full overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Produto</TableHead><TableHead>Código</TableHead><TableHead>Atual</TableHead><TableHead>Mínimo</TableHead><TableHead>Máximo</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>
      {itens.map((item) => <TableRow key={item.id}><TableCell className="font-medium">{item.produto?.nome ?? "-"}</TableCell><TableCell>{item.produto?.codigo || "-"}</TableCell><TableCell>{Number(item.quantidadeAtual)}</TableCell><TableCell>{Number(item.estoqueMinimo)}</TableCell><TableCell>{item.estoqueMaximo ? Number(item.estoqueMaximo) : "-"}</TableCell><TableCell>{statusEstoque(item.quantidadeAtual, item.estoqueMinimo, item.estoqueMaximo)}</TableCell></TableRow>)}
      {!error && !itens.length && <TableRow><TableCell colSpan={6}><CrudEmpty message="Nenhum item de estoque encontrado." /></TableCell></TableRow>}
    </TableBody></Table></div><CrudPagination page={page} totalPages={data?.meta.totalPages ?? 1} onPageChange={setPage} /></>}
  </CrudCard></div></AppLayout>;
}
