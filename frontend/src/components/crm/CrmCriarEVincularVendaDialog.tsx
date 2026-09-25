"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { VendaForm, type VendaFormPayload } from "@/components/vendas/VendaForm";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/forms/FormDialog";
import { obterMensagemErro } from "@/lib/api-error";
import { crmQueryKeys } from "@/lib/crm-query-keys";
import { vendasQueryKeys } from "@/lib/vendas-query-keys";
import { criarVenda, type VendaCriada } from "@/services/vendas.service";
import { vincularVendaCrmOportunidade, type CrmOportunidade } from "@/services/crm.service";

type Props = { empresaId: string; oportunidade: CrmOportunidade };
type VendaCriadaForaDoContexto = { venda: VendaCriada; empresaId: string; clienteId: string };

export function CrmCriarEVincularVendaDialog({ empresaId, oportunidade }: Props) {
  const queryClient = useQueryClient();
  const origemRef = useRef(`${empresaId}:${oportunidade.id}`);
  const operacaoRef = useRef(0);
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [formularioKey, setFormularioKey] = useState(0);
  const [vendaCriada, setVendaCriada] = useState<VendaCriada | null>(null);
  const [vendaCriadaForaDoContexto, setVendaCriadaForaDoContexto] = useState<VendaCriadaForaDoContexto | null>(null);

  function limpar() {
    setFormularioKey((valor) => valor + 1);
    setVendaCriada(null);
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
    operacaoRef.current += 1;
    setAberto(false);
    setSalvando(false);
    limpar();
  }, [empresaId, oportunidade.id]);

  async function criarEVincular(dados: VendaFormPayload) {
    if (salvando || vendaCriada) return;
    const empresaDaOperacao = empresaId;
    const oportunidadeDaOperacao = oportunidade.id;
    const clienteDaOperacao = oportunidade.clienteId;
    const versaoRegistroDaOperacao = oportunidade.versaoRegistro;
    const origemDaOperacao = `${empresaDaOperacao}:${oportunidadeDaOperacao}`;
    const operacao = operacaoRef.current + 1;
    operacaoRef.current = operacao;
    const operacaoAindaAtual = () => operacaoRef.current === operacao && origemRef.current === origemDaOperacao;
    try {
      setSalvando(true);
      const venda = await criarVenda(dados);
      await queryClient.invalidateQueries({ queryKey: vendasQueryKeys.listas(empresaDaOperacao) });
      if (!operacaoAindaAtual()) {
        setVendaCriadaForaDoContexto({ venda, empresaId: empresaDaOperacao, clienteId: clienteDaOperacao });
        toast.warning(`Venda nº ${venda.numero} foi criada, mas não foi vinculada porque a empresa ou oportunidade ativa mudou durante a operação.`);
        return;
      }
      setVendaCriada(venda);

      try {
        await vincularVendaCrmOportunidade(oportunidadeDaOperacao, { vendaId: venda.id, versaoRegistro: versaoRegistroDaOperacao });
        await queryClient.invalidateQueries({ queryKey: crmQueryKeys.detalheOportunidade(empresaDaOperacao, oportunidadeDaOperacao) });
        if (!operacaoAindaAtual()) return;
        toast.success(`Venda nº ${venda.numero} criada e vinculada à oportunidade.`);
        setAberto(false);
        limpar();
      } catch (error: unknown) {
        await queryClient.invalidateQueries({ queryKey: crmQueryKeys.detalheOportunidade(empresaDaOperacao, oportunidadeDaOperacao) });
        if (!operacaoAindaAtual()) return;
        if (isAxiosError(error) && error.response?.status === 409) {
          toast.error(`Venda nº ${venda.numero} foi criada, mas o vínculo foi alterado por outra operação.`);
        } else {
          toast.error(`Venda nº ${venda.numero} foi criada, mas não foi possível vinculá-la à oportunidade.`);
        }
      }
    } catch (error: unknown) {
      if (!operacaoAindaAtual()) return;
      toast.error(obterMensagemErro(error, "Não foi possível criar a venda."));
    } finally {
      if (operacaoAindaAtual()) setSalvando(false);
    }
  }

  return (
    <>
      {vendaCriadaForaDoContexto && (
        <div className="mb-4 space-y-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" role="status">
          <p>Venda nº {String(vendaCriadaForaDoContexto.venda.numero).padStart(5, "0")} foi criada, mas não foi vinculada porque a empresa ou oportunidade ativa mudou durante a operação.</p>
          {empresaId === vendaCriadaForaDoContexto.empresaId ? (
            <Button asChild size="sm"><Link href={`/vendas/${vendaCriadaForaDoContexto.venda.id}`}>Abrir venda</Link></Button>
          ) : (
            <p>Retorne à empresa de origem para abrir ou vincular esta Venda.</p>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => setVendaCriadaForaDoContexto(null)}>Dispensar</Button>
        </div>
      )}
      <FormDialog
        open={aberto}
        onOpenChange={(open) => (open ? setAberto(true) : fechar())}
        title="Criar e vincular Venda"
        contentClassName="max-w-4xl"
        trigger={<Button><Plus aria-hidden="true" />Criar e vincular Venda</Button>}
      >
        {vendaCriada ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-700">Venda nº {String(vendaCriada.numero).padStart(5, "0")} foi criada, mas o vínculo CRM não foi concluído. A Venda continua existente e pode ser vinculada posteriormente como Venda existente.</p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={fechar}>Fechar</Button>
              <Button asChild><Link href={`/vendas/${vendaCriada.id}`}>Abrir venda</Link></Button>
            </div>
          </div>
        ) : (
          <VendaForm
            key={formularioKey}
            ativo={aberto}
            salvando={salvando}
            textoBotao={salvando ? "Criando venda..." : "Criar e vincular Venda"}
            initialData={{ clienteId: oportunidade.clienteId }}
            clienteBloqueado
            clienteInicial={oportunidade.cliente}
            onSubmit={criarEVincular}
            onCancelar={fechar}
          />
        )}
      </FormDialog>
    </>
  );
}
