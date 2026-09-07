"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import { AcessoNegado } from "@/components/common/AcessoNegado";
import { EmpresaNaoSelecionada } from "@/components/common/EmpresaNaoSelecionada";
import { PageHeader } from "@/components/common/PageHeader";
import { CrudCard } from "@/components/crud/CrudCard";
import { CrudEmpty } from "@/components/crud/CrudEmpty";
import { CrudLoading } from "@/components/crud/CrudLoading";
import { CrudPagination } from "@/components/crud/CrudPagination";
import { CrudSearch } from "@/components/crud/CrudSearch";
import { CrudToolbar } from "@/components/crud/CrudToolbar";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { obterMensagemErro } from "@/lib/api-error";
import { auditoriaQueryKeys } from "@/lib/auditoria-query-keys";
import {
  PERMISSAO_AUDITORIA_EMPRESA_VISUALIZAR,
  PERMISSAO_AUDITORIA_GLOBAL_VISUALIZAR,
} from "@/lib/auth";
import {
  AuditoriaAcao,
  AuditoriaEntidade,
  AuditoriaFiltrosGlobais,
  listarAuditoriaEmpresa,
  listarAuditoriaGlobal,
} from "@/services/auditoria.service";

type ModoAuditoria = "EMPRESA" | "GLOBAL";

const ACOES: AuditoriaAcao[] = [
  "CRIAR", "ATUALIZAR", "ATIVAR", "DESATIVAR", "EXCLUIR", "LOGIN",
  "ENTRADA_ESTOQUE", "SAIDA_ESTOQUE", "AJUSTE_ESTOQUE", "INVENTARIO_ESTOQUE",
];

const ENTIDADES: AuditoriaEntidade[] = [
  "EMPRESA", "USUARIO", "MODULO", "EMPRESA_MODULO", "CATEGORIA_PRODUTO",
  "PRODUTO", "ESTOQUE", "MOVIMENTACAO_ESTOQUE",
];

const UUID_PATTERN =
  "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}";
const UUID_REGEX = new RegExp(`^${UUID_PATTERN}$`);

function badgeAcao(acao: AuditoriaAcao) {
  const base = "rounded-full px-2 py-1 text-xs font-medium";
  if (acao === "CRIAR") return `${base} bg-green-100 text-green-700`;
  if (acao === "ATUALIZAR") return `${base} bg-blue-100 text-blue-700`;
  if (acao === "DESATIVAR" || acao === "EXCLUIR") return `${base} bg-red-100 text-red-700`;
  if (acao === "ATIVAR") return `${base} bg-emerald-100 text-emerald-700`;
  return `${base} bg-slate-100 text-slate-700`;
}

function formatarSnapshot(valor: unknown | null): string {
  if (valor === null) return "Sem dados";
  const formatado = JSON.stringify(valor, null, 2);
  return formatado ?? String(valor);
}

export default function AuditoriaPage() {
  const { temPermissao, carregando: carregandoAuth } = useAuth();
  const { empresaEfetivaId, carregando: carregandoEmpresa } =
    useEmpresaSelecionada();
  const podeEmpresa = temPermissao(PERMISSAO_AUDITORIA_EMPRESA_VISUALIZAR);
  const podeGlobal = temPermissao(PERMISSAO_AUDITORIA_GLOBAL_VISUALIZAR);
  const [modoEscolhido, setModoEscolhido] = useState<ModoAuditoria | null>(null);
  const [search, setSearch] = useState("");
  const [searchAplicado, setSearchAplicado] = useState("");
  const [acao, setAcao] = useState<AuditoriaAcao | "">("");
  const [entidade, setEntidade] = useState<AuditoriaEntidade | "">("");
  const [usuarioId, setUsuarioId] = useState("");
  const [entidadeId, setEntidadeId] = useState("");
  const [empresaId, setEmpresaId] = useState("");
  const [usuarioIdAplicado, setUsuarioIdAplicado] = useState("");
  const [entidadeIdAplicado, setEntidadeIdAplicado] = useState("");
  const [empresaIdAplicado, setEmpresaIdAplicado] = useState("");
  const [erroFiltros, setErroFiltros] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"createdAt" | "acao" | "entidade">("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const limit = 10;

  const modoPadrao: ModoAuditoria = podeEmpresa && empresaEfetivaId
    ? "EMPRESA"
    : podeGlobal
      ? "GLOBAL"
      : "EMPRESA";
  const modo =
    (modoEscolhido === "EMPRESA" && podeEmpresa) ||
    (modoEscolhido === "GLOBAL" && podeGlobal)
      ? modoEscolhido
      : modoPadrao;

  const filtros: AuditoriaFiltrosGlobais = {
    search: searchAplicado || undefined,
    acao: acao || undefined,
    entidade: entidade || undefined,
    usuarioId: usuarioIdAplicado || undefined,
    entidadeId: entidadeIdAplicado || undefined,
    empresaId: modo === "GLOBAL" ? empresaIdAplicado || undefined : undefined,
    page,
    limit,
    sortBy,
    order,
  };
  const modoPermitido = modo === "EMPRESA" ? podeEmpresa : podeGlobal;
  const possuiEmpresa = Boolean(empresaEfetivaId);
  const queryHabilitada =
    !carregandoAuth &&
    !carregandoEmpresa &&
    modoPermitido &&
    (modo === "GLOBAL" || possuiEmpresa);

  const query = useQuery({
    queryKey:
      modo === "EMPRESA"
        ? auditoriaQueryKeys.empresa(empresaEfetivaId ?? "", filtros)
        : auditoriaQueryKeys.global(filtros),
    queryFn: () =>
      modo === "EMPRESA"
        ? listarAuditoriaEmpresa(filtros)
        : listarAuditoriaGlobal(filtros),
    enabled: queryHabilitada,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  function aplicarFiltros() {
    const identificadores = [usuarioId.trim(), entidadeId.trim()];
    if (modo === "GLOBAL") identificadores.push(empresaId.trim());
    if (identificadores.some((id) => id && !UUID_REGEX.test(id))) {
      setErroFiltros("Informe identificadores UUID válidos.");
      return;
    }

    setErroFiltros(null);
    setPage(1);
    setSearchAplicado(search.trim());
    setUsuarioIdAplicado(usuarioId.trim());
    setEntidadeIdAplicado(entidadeId.trim());
    setEmpresaIdAplicado(empresaId.trim());
  }

  function trocarModo(novoModo: ModoAuditoria) {
    setModoEscolhido(novoModo);
    setPage(1);
  }

  const logs = query.data?.data ?? [];
  const totalPages = query.data?.meta.totalPages ?? 1;

  if (carregandoAuth || carregandoEmpresa) return <AppLayout><CrudLoading /></AppLayout>;
  if (!podeEmpresa && !podeGlobal) return <AppLayout><AcessoNegado /></AppLayout>;
  if (!modoPermitido) return <AppLayout><AcessoNegado /></AppLayout>;
  if (modo === "EMPRESA" && !possuiEmpresa) {
    return <AppLayout><EmpresaNaoSelecionada /></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="min-w-0 space-y-6">
        <PageHeader
          title="Auditoria"
          description="Acompanhe as ações realizadas no sistema."
          actions={
            <Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>
              <RefreshCw aria-hidden="true" /> Atualizar
            </Button>
          }
        />

        {podeEmpresa && podeGlobal && (
          <div className="grid w-full grid-cols-2 gap-2 rounded-lg border bg-white p-1 sm:w-fit" aria-label="Escopo da auditoria">
            <Button variant={modo === "EMPRESA" ? "default" : "ghost"} onClick={() => trocarModo("EMPRESA")}>Empresa</Button>
            <Button variant={modo === "GLOBAL" ? "default" : "ghost"} onClick={() => trocarModo("GLOBAL")}>Global</Button>
          </div>
        )}

        <CrudCard>
          <CrudToolbar>
            <CrudSearch
              value={search}
              onChange={setSearch}
              onSearch={aplicarFiltros}
              placeholder="Pesquisar por entidade, usuário, empresa ou IP..."
            />
          </CrudToolbar>

          <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <select value={acao} onChange={(e) => { setAcao(e.target.value as AuditoriaAcao | ""); setPage(1); }} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="">Todas as ações</option>
              {ACOES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={entidade} onChange={(e) => { setEntidade(e.target.value as AuditoriaEntidade | ""); setPage(1); }} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="">Todas as entidades</option>
              {ENTIDADES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <Input value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)} placeholder="UUID do usuário" pattern={UUID_PATTERN} />
            <Input value={entidadeId} onChange={(e) => setEntidadeId(e.target.value)} placeholder="UUID da entidade" pattern={UUID_PATTERN} />
            {modo === "GLOBAL" && <Input value={empresaId} onChange={(e) => setEmpresaId(e.target.value)} placeholder="UUID da empresa" pattern={UUID_PATTERN} />}
            <select value={sortBy} onChange={(e) => { setSortBy(e.target.value as typeof sortBy); setPage(1); }} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="createdAt">Ordenar por data</option><option value="acao">Ordenar por ação</option><option value="entidade">Ordenar por entidade</option>
            </select>
            <select value={order} onChange={(e) => { setOrder(e.target.value as typeof order); setPage(1); }} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="desc">Decrescente</option><option value="asc">Crescente</option>
            </select>
            <Button variant="outline" onClick={aplicarFiltros}>Aplicar filtros</Button>
          </div>

          {erroFiltros && <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{erroFiltros}</div>}
          {query.error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{obterMensagemErro(query.error, "Erro ao carregar auditoria.")}</div>}

          {query.isLoading ? <CrudLoading /> : (
            <>
              <div className="mt-5 min-w-0 max-w-full overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Ação</TableHead><TableHead>Entidade</TableHead><TableHead>Recurso</TableHead><TableHead>Usuário</TableHead><TableHead>Empresa</TableHead><TableHead>Data</TableHead><TableHead>IP</TableHead><TableHead>Dados</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell><span className={badgeAcao(log.acao)}>{log.acao}</span></TableCell>
                        <TableCell className="font-medium">{log.entidade}</TableCell>
                        <TableCell className="font-mono text-xs">{log.entidadeId ?? "-"}</TableCell>
                        <TableCell>{log.usuario ? <span>{log.usuario.nome}<span className="block text-xs text-slate-500">{log.usuario.email}</span></span> : "-"}</TableCell>
                        <TableCell>{log.empresa?.nome ?? "-"}</TableCell>
                        <TableCell>{new Date(log.createdAt).toLocaleString("pt-BR")}</TableCell>
                        <TableCell>{log.ip ?? "-"}</TableCell>
                        <TableCell>
                          <details className="w-64 max-w-[75vw] text-xs"><summary className="cursor-pointer font-medium">Ver snapshots</summary>
                            <p className="mt-2 font-semibold">Dados anteriores</p><pre className="mt-1 max-h-48 max-w-full overflow-auto whitespace-pre-wrap break-all rounded bg-slate-50 p-2">{formatarSnapshot(log.dadosAntigos)}</pre>
                            <p className="mt-2 font-semibold">Dados posteriores</p><pre className="mt-1 max-h-48 max-w-full overflow-auto whitespace-pre-wrap break-all rounded bg-slate-50 p-2">{formatarSnapshot(log.dadosNovos)}</pre>
                          </details>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!query.error && logs.length === 0 && <TableRow><TableCell colSpan={8}><CrudEmpty message="Nenhum registro de auditoria encontrado." /></TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
              <CrudPagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
        </CrudCard>
      </div>
    </AppLayout>
  );
}
