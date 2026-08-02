"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BadgeDollarSign } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/forms/FormDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_CONTAS_RECEBER_CRIAR } from "@/lib/auth";
import { ordensServicoQueryKeys } from "@/lib/ordens-servico-query-keys";

import {
  contasReceberQueryKeys,
  gerarContaPorOrdemServico,
  obterMensagemErroContasReceber,
} from "@/services/contas-receber.service";

type OrdemServicoConta = {
  id: string;
  numero: number;
  titulo: string;
  status: string;

  cliente?: {
    id: string;
    nome: string;
  } | null;
};

type Props = {
  ordem: OrdemServicoConta;
};

export function GerarContaReceberModal({
  ordem,
}: Props) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeCriarConta = temPermissao(PERMISSAO_CONTAS_RECEBER_CRIAR);

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [valorOriginal, setValorOriginal] =
    useState("");

  const [dataVencimento, setDataVencimento] =
    useState("");

  const [dataCompetencia, setDataCompetencia] =
    useState(
      new Date().toISOString().slice(0, 7) +
        "-01"
    );

  const [documento, setDocumento] =
    useState("");

  const [observacao, setObservacao] =
    useState("");

  async function salvar() {
    if (!podeCriarConta || !empresaEfetivaId || carregando) {
      toast.error("Você não possui permissão para esta ação.");
      return;
    }
    if (Number(valorOriginal) <= 0) {
      toast.error(
        "Informe o valor da conta."
      );
      return;
    }

    if (!dataVencimento) {
      toast.error(
        "Informe a data de vencimento."
      );
      return;
    }

    try {
      setSalvando(true);

      await gerarContaPorOrdemServico(
        ordem.id,
        {
          valorOriginal:
            Number(valorOriginal),

          dataVencimento,

          dataCompetencia:
            dataCompetencia || undefined,

          documento:
            documento.trim() || undefined,

          observacao:
            observacao.trim() || undefined,
        }
      );

      toast.success(
        "Conta a receber gerada com sucesso!"
      );

      setAberto(false);

      await queryClient.invalidateQueries({
        queryKey: contasReceberQueryKeys.listas(empresaEfetivaId),
      });

      await queryClient.invalidateQueries({
        queryKey: contasReceberQueryKeys.resumo(empresaEfetivaId),
      });

      await queryClient.invalidateQueries({
        queryKey: ordensServicoQueryKeys.detalhe(empresaEfetivaId, ordem.id),
      });
    } catch (error: unknown) {
      toast.error(
        obterMensagemErroContasReceber(error, "Erro ao gerar conta a receber"),
      );
    } finally {
      setSalvando(false);
    }
  }

  if (!podeCriarConta || !empresaEfetivaId || carregando) return null;

  return (
    <FormDialog
      open={aberto}
      onOpenChange={setAberto}
      title={`Gerar conta da OS #${String(
        ordem.numero
      ).padStart(5, "0")}`}
      trigger={
        <Button variant="outline">
          <BadgeDollarSign
            size={16}
            className="mr-2"
          />
          Gerar conta a receber
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Ordem de serviço
          </p>

          <p className="mt-1 font-semibold text-slate-900">
            #{String(ordem.numero).padStart(
              5,
              "0"
            )}{" "}
            - {ordem.titulo}
          </p>

          <p className="mt-1 text-sm text-slate-600">
            Cliente:{" "}
            {ordem.cliente?.nome || "-"}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Valor da conta *
          </label>

          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={valorOriginal}
            onChange={(event) =>
              setValorOriginal(
                event.target.value
              )
            }
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">
              Vencimento *
            </label>

            <Input
              type="date"
              value={dataVencimento}
              onChange={(event) =>
                setDataVencimento(
                  event.target.value
                )
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Competência
            </label>

            <Input
              type="date"
              value={dataCompetencia}
              onChange={(event) =>
                setDataCompetencia(
                  event.target.value
                )
              }
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Documento
          </label>

          <Input
            value={documento}
            onChange={(event) =>
              setDocumento(event.target.value)
            }
            placeholder={`ORDEM-SERVICO-${ordem.numero}`}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Observação
          </label>

          <Textarea
            value={observacao}
            onChange={(event) =>
              setObservacao(event.target.value)
            }
          />
        </div>

        <div className="flex justify-end gap-3 border-t pt-5">
          <Button
            variant="outline"
            onClick={() => setAberto(false)}
            disabled={salvando}
          >
            Cancelar
          </Button>

          <Button
            onClick={salvar}
            disabled={salvando}
          >
            {salvando
              ? "Gerando..."
              : "Gerar conta"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}
