"use client";

import { useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/forms/FormDialog";
import {
  regularizarEmpresa,
  type Empresa,
} from "@/services/empresas.service";
import { empresasQueryKeys } from "@/lib/empresas-query-keys";
import { formatarDataUtc, situacaoComercialEmpresa } from "@/lib/empresas-utils";
import { obterMensagemErro } from "@/lib/api-error";

type Props = {
  empresa: Empresa;
};

export function RegularizarEmpresaModal({ empresa }: Props) {
  const diasId = useId();
  const motivoId = useId();
  const queryClient = useQueryClient();

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [diasValidade, setDiasValidade] = useState("30");
  const [motivo, setMotivo] = useState("");

  const dias = Number(diasValidade);
  const diasValido = Number.isInteger(dias) && dias >= 1 && dias <= 3650;
  const motivoAjustado = motivo.trim();
  const motivoValido =
    motivoAjustado.length >= 3 && motivoAjustado.length <= 500;
  const podeSalvar = diasValido && motivoValido && !salvando;

  async function salvar() {
    if (!podeSalvar) return;
    try {
      setSalvando(true);

      await regularizarEmpresa(empresa.id, {
        diasValidade: dias,
        motivo: motivoAjustado,
      });

      toast.success("Validade comercial regularizada com sucesso!");

      setMotivo("");
      setAberto(false);

      queryClient.invalidateQueries({
        queryKey: empresasQueryKeys.todas(),
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao regularizar empresa"));
    } finally {
      setSalvando(false);
    }
  }

  const situacao = situacaoComercialEmpresa(empresa);

  return (
    <FormDialog
      open={aberto}
      onOpenChange={setAberto}
      title={`Regularizar validade comercial de "${empresa.nome}"`}
      trigger={
        <Button variant="outline" size="sm">
          <CalendarClock aria-hidden="true" />
          Regularizar
        </Button>
      }
    >
      <div className="min-w-0 space-y-4">
        <p className="text-sm text-slate-600">
          Situação atual: {situacao.rotulo}
          {empresa.validadeComercialFim
            ? ` (vigência até ${formatarDataUtc(empresa.validadeComercialFim)} UTC)`
            : ""}
          . A nova janela comercial inicia agora, em UTC, e a ação é registrada
          na auditoria com motivo e responsável.
        </p>

        <div>
          <label
            htmlFor={diasId}
            className="text-sm font-medium text-slate-700"
          >
            Dias de validade
          </label>
          <Input
            id={diasId}
            type="number"
            min={1}
            max={3650}
            value={diasValidade}
            onChange={(e) => setDiasValidade(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">
            Informe um valor inteiro entre 1 e 3650 dias.
          </p>
        </div>

        <div>
          <label
            htmlFor={motivoId}
            className="text-sm font-medium text-slate-700"
          >
            Motivo
          </label>
          <Textarea
            id={motivoId}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            placeholder="Ex.: Contrato assinado em 12/11/2026"
          />
          <p className="mt-1 text-xs text-slate-500">
            Entre 3 e 500 caracteres ({motivoAjustado.length}/500).
          </p>
        </div>

        <div className="sticky -bottom-4 -mx-4 flex flex-col-reverse gap-2 border-t bg-white p-4 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => setAberto(false)}
            disabled={salvando}
          >
            Cancelar
          </Button>

          <Button onClick={salvar} disabled={!podeSalvar}>
            {salvando ? "Registrando..." : "Regularizar"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}
