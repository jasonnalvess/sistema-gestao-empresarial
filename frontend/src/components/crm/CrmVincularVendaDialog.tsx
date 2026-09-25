"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CrudEmpty } from "@/components/crud/CrudEmpty";
import { CrudLoading } from "@/components/crud/CrudLoading";
import { CrudPagination } from "@/components/crud/CrudPagination";
import { obterMensagemErro } from "@/lib/api-error";
import { crmQueryKeys } from "@/lib/crm-query-keys";
import { vendasQueryKeys } from "@/lib/vendas-query-keys";
import { vincularVendaCrmOportunidade, type CrmOportunidade } from "@/services/crm.service";
import { listarVendas, type Venda } from "@/services/vendas.service";

type Props = { empresaId: string; oportunidade: CrmOportunidade };
const LIMITE_VENDAS = 10;

function vendaLabel(venda: Venda) {
  return `Venda #${String(venda.numero).padStart(5, "0")} — ${venda.status}`;
}

export function CrmVincularVendaDialog({ empresaId, oportunidade }: Props) {
  const queryClient = useQueryClient();
  const origemRef = useRef(`${empresaId}:${oportunidade.id}`);
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [vendaId, setVendaId] = useState("");
  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const [pagina, setPagina] = useState(1);

  function limpar() {
    setVendaId("");
    setBusca("");
    setBuscaAplicada("");
    setPagina(1);
  }
  function fechar() {
    if (salvando) return;
    setAberto(false);
    limpar();
  }

  useLayoutEffect(() => {
    const origem = `${empresaId}:${oportunidade.id}`;
    if (origemRef.current === origem) return;
    origemRef.current = origem;
    setAberto(false);
    setSalvando(false);
    limpar();
  }, [empresaId, oportunidade.id]);

  const filtros = { clienteId: oportunidade.clienteId, search: buscaAplicada || undefined, page: pagina, limit: LIMITE_VENDAS, sortBy: "dataVenda", order: "desc" as const };
  const vendasQuery = useQuery({
    queryKey: vendasQueryKeys.lista(empresaId, filtros),
    queryFn: () => listarVendas(filtros),
    enabled: aberto && Boolean(empresaId && oportunidade.id && oportunidade.clienteId),
  });
  const vendas = vendasQuery.data?.data ?? [];
  const totalPages = vendasQuery.data?.meta.totalPages;
  const paginaResposta = vendasQuery.data?.meta.page;

  useEffect(() => {
    if (paginaResposta !== pagina || typeof totalPages !== "number" || !Number.isInteger(totalPages) || totalPages < 0) return;
    const paginaValida = Math.max(1, totalPages);
    if (pagina <= paginaValida) return;
    const origemDaResposta = empresaId + ":" + oportunidade.id;
    const timeoutId = window.setTimeout(() => {
      if (origemRef.current !== origemDaResposta) return;
      setPagina((paginaAtual) => paginaAtual === pagina ? paginaValida : paginaAtual);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [empresaId, oportunidade.id, pagina, paginaResposta, totalPages]);

  function pesquisar() {
    setPagina(1);
    setBuscaAplicada(busca);
    setVendaId("");
  }

  async function vincular() {
    if (!vendaId || salvando) return;
    const empresaDaOperacao = empresaId;
    const oportunidadeDaOperacao = oportunidade.id;
    const origemDaOperacao = `${empresaDaOperacao}:${oportunidadeDaOperacao}`;
    try {
      setSalvando(true);
      await vincularVendaCrmOportunidade(oportunidadeDaOperacao, { vendaId, versaoRegistro: oportunidade.versaoRegistro });
      await queryClient.invalidateQueries({ queryKey: crmQueryKeys.detalheOportunidade(empresaDaOperacao, oportunidadeDaOperacao) });
      if (origemRef.current !== origemDaOperacao) return;
      toast.success("Venda vinculada à oportunidade.");
      setAberto(false);
      limpar();
    } catch (error: unknown) {
      await queryClient.invalidateQueries({ queryKey: crmQueryKeys.detalheOportunidade(empresaDaOperacao, oportunidadeDaOperacao) });
      if (origemRef.current !== origemDaOperacao) return;
      if (isAxiosError(error) && error.response?.status === 409) {
        toast.error("Esta venda já está vinculada a outra oportunidade ou o vínculo foi alterado.");
        setAberto(false);
        limpar();
        return;
      }
      toast.error(obterMensagemErro(error, "Não foi possível vincular a venda."));
    } finally {
      if (origemRef.current === origemDaOperacao) setSalvando(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setAberto(true)}><Link2 aria-hidden="true" />Vincular venda existente</Button>
      <Dialog open={aberto} onOpenChange={(open) => (open ? setAberto(true) : fechar())}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Vincular venda existente</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">Oportunidade: {oportunidade.titulo}. Cliente: {oportunidade.cliente.nome}.</p>
          <div className="flex gap-2"><Input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Pesquisar vendas do cliente" /><Button type="button" variant="outline" onClick={pesquisar}>Pesquisar</Button></div>
          {vendasQuery.isLoading && <CrudLoading />}
          {vendasQuery.error && <p className="text-sm text-red-700">Não foi possível carregar as vendas deste cliente.</p>}
          {!vendasQuery.isLoading && !vendasQuery.error && vendas.length === 0 && <CrudEmpty message="Nenhuma venda encontrada para este cliente." />}
          {!vendasQuery.isLoading && !vendasQuery.error && vendas.length > 0 && <div className="max-h-64 space-y-2 overflow-y-auto">{vendas.map((venda) => <label key={venda.id} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3"><input type="radio" name="venda-crm" value={venda.id} checked={vendaId === venda.id} onChange={(event) => setVendaId(event.target.value)} /><span className="min-w-0"><span className="block font-medium">{vendaLabel(venda)}</span><span className="text-sm text-slate-600">{venda.cliente?.nome ?? oportunidade.cliente.nome}</span></span></label>)}</div>}
          {vendasQuery.data && vendasQuery.data.meta.totalPages > 1 && <CrudPagination page={vendasQuery.data.meta.page} totalPages={vendasQuery.data.meta.totalPages} onPageChange={(novaPagina) => { setPagina(novaPagina); setVendaId(""); }} />}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={fechar} disabled={salvando}>Cancelar</Button><Button type="button" onClick={vincular} disabled={!vendaId || salvando}>{salvando ? "Vinculando..." : "Vincular venda"}</Button></div>
        </DialogContent>
      </Dialog>
    </>
  );
}
