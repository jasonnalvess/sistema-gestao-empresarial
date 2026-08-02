"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { AcessoNegado } from "@/components/common/AcessoNegado";
import { EmpresaNaoSelecionada } from "@/components/common/EmpresaNaoSelecionada";
import { CrudCard } from "@/components/crud/CrudCard";
import { CrudEmpty } from "@/components/crud/CrudEmpty";
import { CrudLoading } from "@/components/crud/CrudLoading";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InventarioStatusBadge } from "@/components/inventarios/InventarioStatusBadge";
import { EditarInventarioModal } from "@/components/inventarios/EditarInventarioModal";
import { ContarItemInventarioModal } from "@/components/inventarios/ContarItemInventarioModal";
import { CancelarInventarioButton } from "@/components/inventarios/CancelarInventarioButton";
import { FinalizarInventarioButton } from "@/components/inventarios/FinalizarInventarioButton";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_INVENTARIOS_VISUALIZAR } from "@/lib/auth";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";
import { buscarInventario } from "@/services/inventarios.service";

function formatarQuantidade(valor?: string | null) {
  return valor === null || valor === undefined ? "-" : Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: 4 });
}
function Campo({ label, valor }: { label: string; valor?: string | null }) {
  return <div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-sm text-slate-900">{valor || "-"}</p></div>;
}

export default function InventarioDetalhesPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { temPermissao } = useAuth();
  const { empresaSelecionadaId, empresaEfetivaId, carregando, requerSelecao } = useEmpresaSelecionada();
  const possuiEmpresa = !requerSelecao || Boolean(empresaSelecionadaId);
  const podeVisualizar = temPermissao(PERMISSAO_INVENTARIOS_VISUALIZAR);
  const { data: inventario, isLoading, error } = useQuery({
    queryKey: estoqueQueryKeys.inventario(empresaEfetivaId ?? "", id),
    queryFn: () => buscarInventario(id),
    enabled: podeVisualizar && possuiEmpresa && Boolean(empresaEfetivaId) && !carregando && Boolean(id),
  });

  if (carregando) return <AppLayout><CrudLoading /></AppLayout>;
  if (!podeVisualizar) return <AppLayout><AcessoNegado /></AppLayout>;
  if (!possuiEmpresa) return <AppLayout><EmpresaNaoSelecionada /></AppLayout>;
  if (isLoading) return <AppLayout><CrudLoading /></AppLayout>;
  if (error || !inventario) return <AppLayout><div className="rounded-lg bg-red-50 p-4 text-red-700">Inventário não encontrado.</div></AppLayout>;

  const itens = inventario.itens ?? [];
  return <AppLayout><div className="space-y-6">
    <PageHeader title={`Inventário #${String(inventario.numero).padStart(5, "0")}`} description="Detalhes, contagens e resultado persistido do inventário." actions={<div className="flex flex-wrap gap-2"><Button variant="outline" asChild><Link href="/inventarios"><ArrowLeft />Voltar</Link></Button><EditarInventarioModal inventario={inventario} /><CancelarInventarioButton inventario={inventario} /><FinalizarInventarioButton inventario={inventario} /></div>} />
    <CrudCard><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4"><div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</p><div className="mt-1"><InventarioStatusBadge status={inventario.status} /></div></div><Campo label="Depósito" valor={`${inventario.deposito.codigo} - ${inventario.deposito.nome}`} /><Campo label="Abertura" valor={new Date(inventario.dataAbertura).toLocaleString("pt-BR")} /><Campo label="Conclusão" valor={inventario.dataConclusao ? new Date(inventario.dataConclusao).toLocaleString("pt-BR") : null} /><Campo label="Aberto por" valor={inventario.usuarioAbertura?.nome} /><Campo label="Concluído por" valor={inventario.usuarioConclusao?.nome} /><Campo label="Descrição" valor={inventario.descricao} /><Campo label="Observação" valor={inventario.observacao} /></div></CrudCard>
    <CrudCard><h2 className="text-lg font-semibold">Itens do inventário</h2><div className="mt-4 overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Produto</TableHead><TableHead>Unidade</TableHead><TableHead className="text-right">Esperado</TableHead><TableHead className="text-right">Contado</TableHead><TableHead className="text-right">Diferença</TableHead><TableHead>Observação</TableHead><TableHead>Status</TableHead><TableHead>Ação</TableHead></TableRow></TableHeader>
    <TableBody>{itens.map((item) => <TableRow key={item.id}><TableCell><p className="font-medium">{item.produto.nome}</p>{item.produto.codigo && <p className="text-xs text-slate-500">{item.produto.codigo}</p>}</TableCell><TableCell>{item.produto.unidadeMedida?.sigla ?? "-"}</TableCell><TableCell className="text-right">{formatarQuantidade(item.quantidadeSistema)}</TableCell><TableCell className="text-right">{formatarQuantidade(item.quantidadeContada)}</TableCell><TableCell className="text-right">{formatarQuantidade(item.diferenca)}</TableCell><TableCell>{item.observacao || "-"}</TableCell><TableCell>{item.status === "CONTADO" ? "Contado" : "Pendente"}</TableCell><TableCell><ContarItemInventarioModal inventario={inventario} item={item} /></TableCell></TableRow>)}{!itens.length && <TableRow><TableCell colSpan={8}><CrudEmpty message="Este inventário não possui itens." /></TableCell></TableRow>}</TableBody></Table></div></CrudCard>
  </div></AppLayout>;
}
