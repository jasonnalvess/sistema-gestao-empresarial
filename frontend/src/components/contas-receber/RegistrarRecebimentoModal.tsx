"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HandCoins } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/forms/FormDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_CONTAS_RECEBER_RECEBER } from "@/lib/auth";
import { caixasQueryKeys } from "@/lib/caixas-query-keys";

import {
  ContaReceberDetalhada,
  contasReceberQueryKeys,
  obterMensagemErroContasReceber,
  FormaRecebimento,
  registrarRecebimentoContaReceber,
} from "@/services/contas-receber.service";
import { listarCaixasAbertos } from "@/services/caixas.service";

type Props = {
  conta: ContaReceberDetalhada;
};

export function RegistrarRecebimentoModal({ conta }: Props) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeReceber = temPermissao(PERMISSAO_CONTAS_RECEBER_RECEBER);

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [valor, setValor] = useState(Number(conta.valorAberto).toFixed(2));

  const [desconto, setDesconto] = useState("");
  const [juros, setJuros] = useState("");
  const [multa, setMulta] = useState("");

  const [formaRecebimento, setFormaRecebimento] =
    useState<FormaRecebimento>("PIX");

  const [dataRecebimento, setDataRecebimento] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const [documento, setDocumento] = useState("");
  const [observacao, setObservacao] = useState("");
  const [caixaId, setCaixaId] = useState("");

  const { data: caixasResponse } = useQuery({
    queryKey: caixasQueryKeys.abertosRecebimento(empresaEfetivaId ?? ""),
    queryFn: listarCaixasAbertos,
    enabled: aberto && podeReceber && Boolean(empresaEfetivaId) && !carregando,
  });

  const caixasAbertos = caixasResponse?.data ?? [];

  const saldoAjustado =
    Number(conta.valorAberto) +
    Number(juros || 0) +
    Number(multa || 0) -
    Number(desconto || 0);

  function quitarSaldo() {
    setValor(Math.max(saldoAjustado, 0).toFixed(2));
  }

  async function salvar() {
    if (!podeReceber || !empresaEfetivaId || carregando) {
      toast.error("Você não possui permissão para esta ação.");
      return;
    }
    const valorNumero = Number(valor);

    if (valorNumero <= 0) {
      toast.error("Informe um valor de recebimento válido.");
      return;
    }

    if (saldoAjustado <= 0) {
      toast.error("Os descontos não podem eliminar ou ultrapassar o saldo.");
      return;
    }

    if (valorNumero > saldoAjustado) {
      toast.error(
        `O recebimento não pode superar o saldo de ${formatarMoeda(
          saldoAjustado,
        )}.`,
      );
      return;
    }

    try {
      setSalvando(true);

      await registrarRecebimentoContaReceber(conta.id, {
        valor: valorNumero,
        desconto: Number(desconto || 0),
        juros: Number(juros || 0),
        multa: Number(multa || 0),
        formaRecebimento,

        dataRecebimento: dataRecebimento || undefined,

        caixaId: caixaId || undefined,

        documento: documento.trim() || undefined,

        observacao: observacao.trim() || undefined,
      });

      toast.success("Recebimento registrado com sucesso!");

      setAberto(false);

      await queryClient.invalidateQueries({
        queryKey: contasReceberQueryKeys.detalhe(empresaEfetivaId, conta.id),
      });

      await queryClient.invalidateQueries({
        queryKey: contasReceberQueryKeys.listas(empresaEfetivaId),
      });

      await queryClient.invalidateQueries({
        queryKey: contasReceberQueryKeys.resumo(empresaEfetivaId),
      });

      await queryClient.invalidateQueries({
        queryKey: contasReceberQueryKeys.historico(empresaEfetivaId, conta.id),
      });

      if (caixaId) {
        await queryClient.invalidateQueries({
          queryKey: caixasQueryKeys.listas(empresaEfetivaId),
        });
        await queryClient.invalidateQueries({
          queryKey: caixasQueryKeys.detalhe(empresaEfetivaId, caixaId),
        });
        await queryClient.invalidateQueries({
          queryKey: caixasQueryKeys.resumo(empresaEfetivaId),
        });
        await queryClient.invalidateQueries({
          queryKey: caixasQueryKeys.movimentacoes(empresaEfetivaId),
        });
        await queryClient.invalidateQueries({
          queryKey: caixasQueryKeys.abertosPagamento(empresaEfetivaId),
        });
        await queryClient.invalidateQueries({
          queryKey: caixasQueryKeys.abertosRecebimento(empresaEfetivaId),
        });
      }
    } catch (error: unknown) {
      toast.error(
        obterMensagemErroContasReceber(error, "Erro ao registrar recebimento"),
      );
    } finally {
      setSalvando(false);
    }
  }

  if (!podeReceber || !empresaEfetivaId || carregando) return null;

  return (
    <FormDialog
      open={aberto}
      onOpenChange={setAberto}
      title={`Registrar recebimento da conta #${String(conta.numero).padStart(
        5,
        "0",
      )}`}
      trigger={
        <Button>
          <HandCoins size={16} className="mr-2" />
          Registrar recebimento
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 rounded-lg bg-slate-50 p-4 md:grid-cols-2">
          <Resumo label="Saldo atual" valor={Number(conta.valorAberto)} />

          <Resumo label="Saldo ajustado" valor={saldoAjustado} destaque />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <CampoNumero
            label="Desconto"
            value={desconto}
            onChange={setDesconto}
          />

          <CampoNumero label="Juros" value={juros} onChange={setJuros} />

          <CampoNumero label="Multa" value={multa} onChange={setMulta} />

          <div>
            <label className="text-sm font-medium text-slate-700">
              Valor recebido *
            </label>

            <div className="flex gap-2">
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={valor}
                onChange={(event) => setValor(event.target.value)}
              />

              <Button type="button" variant="outline" onClick={quitarSaldo}>
                Quitar
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Forma de recebimento *
            </label>

            <select
              value={formaRecebimento}
              onChange={(event) =>
                setFormaRecebimento(event.target.value as FormaRecebimento)
              }
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="DINHEIRO">Dinheiro</option>

              <option value="PIX">PIX</option>

              <option value="BOLETO">Boleto</option>

              <option value="TRANSFERENCIA">Transferência</option>

              <option value="CARTAO_CREDITO">Cartão de crédito</option>

              <option value="CARTAO_DEBITO">Cartão de débito</option>

              <option value="CHEQUE">Cheque</option>

              <option value="OUTRA">Outra</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Data do recebimento
            </label>

            <Input
              type="date"
              value={dataRecebimento}
              onChange={(event) => setDataRecebimento(event.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-700">
              Movimentar no caixa
            </label>

            <select
              value={caixaId}
              onChange={(event) => setCaixaId(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Não movimentar caixa</option>

              {caixasAbertos.map((caixa) => (
                <option key={caixa.id} value={caixa.id}>
                  {caixa.nome} — {caixa.codigo} —{" "}
                  {formatarMoeda(Number(caixa.saldoAtual))}
                </option>
              ))}
            </select>

            {caixasAbertos.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                Não existe caixa aberto disponível. O recebimento poderá ser
                registrado sem movimentação no caixa.
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-700">
              Documento
            </label>

            <Input
              value={documento}
              onChange={(event) => setDocumento(event.target.value)}
              placeholder="Ex.: comprovante, PIX ou boleto"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Observação
          </label>

          <Textarea
            value={observacao}
            onChange={(event) => setObservacao(event.target.value)}
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

          <Button onClick={salvar} disabled={salvando}>
            {salvando ? "Registrando..." : "Confirmar recebimento"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}

function CampoNumero({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>

      <Input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function Resumo({
  label,
  valor,
  destaque = false,
}: {
  label: string;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p
        className={
          destaque
            ? "mt-1 text-xl font-bold text-slate-900"
            : "mt-1 font-semibold text-slate-700"
        }
      >
        {formatarMoeda(valor)}
      </p>
    </div>
  );
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
