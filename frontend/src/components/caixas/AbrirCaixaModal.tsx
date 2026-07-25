"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LockKeyholeOpen } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/forms/FormDialog";

import {
  abrirCaixa,
  Caixa,
} from "@/services/caixas.service";

type Props = {
  caixa: Caixa;
};

export function AbrirCaixaModal({
  caixa,
}: Props) {
  const queryClient = useQueryClient();

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [saldoInicial, setSaldoInicial] =
    useState(
      Number(caixa.saldoAtual).toFixed(2)
    );

  const [observacao, setObservacao] =
    useState("");

  async function salvar() {
    const saldo = Number(saldoInicial);

    if (saldo < 0) {
      toast.error(
        "O saldo inicial não pode ser negativo."
      );
      return;
    }

    try {
      setSalvando(true);

      await abrirCaixa(caixa.id, {
        saldoInicial: saldo,

        observacao:
          observacao.trim() || undefined,
      });

      toast.success(
        "Caixa aberto com sucesso!"
      );

      setAberto(false);

      await queryClient.invalidateQueries({
        queryKey: ["caixa", caixa.id],
      });

      await queryClient.invalidateQueries({
        queryKey: ["caixas"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["caixas-abertos-pagamento"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["caixas-abertos-recebimento"],
      });
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          "Erro ao abrir caixa"
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <FormDialog
      open={aberto}
      onOpenChange={setAberto}
      title={`Abrir ${caixa.nome}`}
      trigger={
        <Button>
          <LockKeyholeOpen
            size={16}
            className="mr-2"
          />
          Abrir caixa
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Último saldo registrado
          </p>

          <p className="mt-1 text-xl font-bold text-slate-900">
            {formatarMoeda(caixa.saldoAtual)}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Saldo inicial *
          </label>

          <Input
            type="number"
            min="0"
            step="0.01"
            value={saldoInicial}
            onChange={(event) =>
              setSaldoInicial(event.target.value)
            }
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
              ? "Abrindo..."
              : "Confirmar abertura"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}

function formatarMoeda(
  valor: string | number
) {
  return Number(valor).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );
}
