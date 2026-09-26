"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { Unlink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { obterMensagemErro } from "@/lib/api-error";
import { crmQueryKeys } from "@/lib/crm-query-keys";
import { desvincularVendaCrmOportunidade, type CrmOportunidade } from "@/services/crm.service";

type Props = { empresaId: string; oportunidade: CrmOportunidade };

export function CrmDesvincularVendaDialog({ empresaId, oportunidade }: Props) {
  const queryClient = useQueryClient();
  const origemRef = useRef(`${empresaId}:${oportunidade.id}`);
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  function fechar() {
    if (salvando) return;
    setAberto(false);
  }
  useLayoutEffect(() => {
    const origem = `${empresaId}:${oportunidade.id}`;
    if (origemRef.current === origem) return;
    origemRef.current = origem;
    setAberto(false);
    setSalvando(false);
  }, [empresaId, oportunidade.id]);

  async function desvincular() {
    if (salvando) return;
    const empresaDaOperacao = empresaId;
    const oportunidadeDaOperacao = oportunidade.id;
    const origemDaOperacao = `${empresaDaOperacao}:${oportunidadeDaOperacao}`;
    try {
      setSalvando(true);
      await desvincularVendaCrmOportunidade(oportunidadeDaOperacao, { versaoRegistro: oportunidade.versaoRegistro });
      await queryClient.invalidateQueries({ queryKey: crmQueryKeys.detalheOportunidade(empresaDaOperacao, oportunidadeDaOperacao) });
      if (origemRef.current !== origemDaOperacao) return;
      toast.success("Venda desvinculada da oportunidade.");
      setAberto(false);
    } catch (error: unknown) {
      await queryClient.invalidateQueries({ queryKey: crmQueryKeys.detalheOportunidade(empresaDaOperacao, oportunidadeDaOperacao) });
      if (origemRef.current !== origemDaOperacao) return;
      if (isAxiosError(error) && error.response?.status === 409) {
        toast.error("O vínculo foi alterado por outra operação. Revise os dados atualizados.");
        setAberto(false);
        return;
      }
      toast.error(obterMensagemErro(error, "Não foi possível desvincular a venda."));
    } finally {
      if (origemRef.current === origemDaOperacao) setSalvando(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setAberto(true)}><Unlink aria-hidden="true" />Desvincular venda</Button>
      <Dialog open={aberto} onOpenChange={(open) => (open ? setAberto(true) : fechar())}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Desvincular venda</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-700">Esta ação remove apenas o vínculo entre a oportunidade e a Venda. A Venda não será excluída nem cancelada.</p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={fechar} disabled={salvando}>Cancelar</Button><Button type="button" variant="destructive" onClick={desvincular} disabled={salvando}>{salvando ? "Desvinculando..." : "Desvincular venda"}</Button></div>
        </DialogContent>
      </Dialog>
    </>
  );
}
