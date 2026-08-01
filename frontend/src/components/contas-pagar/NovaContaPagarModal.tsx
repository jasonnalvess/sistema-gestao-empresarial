"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/forms/FormDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_FORNECEDORES_VISUALIZAR } from "@/lib/auth";

import { listarFornecedores } from "@/services/fornecedores.service";
import { criarContaPagar } from "@/services/contas-pagar.service";

export function NovaContaPagarModal() {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeVisualizarFornecedores = temPermissao(
    PERMISSAO_FORNECEDORES_VISUALIZAR
  );

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [descricao, setDescricao] = useState("");
  const [documento, setDocumento] = useState("");
  const [observacao, setObservacao] = useState("");

  const [fornecedorId, setFornecedorId] = useState("");

  const [dataEmissao, setDataEmissao] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [dataCompetencia, setDataCompetencia] =
    useState("");

  const [dataVencimento, setDataVencimento] =
    useState("");

  const [parcelaAtual, setParcelaAtual] = useState("1");
  const [totalParcelas, setTotalParcelas] = useState("1");

  const [valorOriginal, setValorOriginal] = useState("");
  const [valorDesconto, setValorDesconto] = useState("");
  const [valorJuros, setValorJuros] = useState("");
  const [valorMulta, setValorMulta] = useState("");

  const { data: fornecedoresResponse } = useQuery({
    queryKey: ["fornecedores-select-nova-conta", empresaEfetivaId],
    queryFn: () =>
      listarFornecedores({
        ativo: true,
        page: 1,
        limit: 100,
        sortBy: "razaoSocial",
        order: "asc",
      }),
    enabled:
      aberto && podeVisualizarFornecedores && Boolean(empresaEfetivaId) && !carregando,
  });

  const valorAberto =
    Number(valorOriginal || 0) +
    Number(valorJuros || 0) +
    Number(valorMulta || 0) -
    Number(valorDesconto || 0);

  function limparCampos() {
    setDescricao("");
    setDocumento("");
    setObservacao("");
    setFornecedorId("");

    setDataEmissao(
      new Date().toISOString().slice(0, 10)
    );

    setDataCompetencia("");
    setDataVencimento("");

    setParcelaAtual("1");
    setTotalParcelas("1");

    setValorOriginal("");
    setValorDesconto("");
    setValorJuros("");
    setValorMulta("");
  }

  async function salvar() {
    if (descricao.trim().length < 2) {
      toast.error("Informe a descrição da conta.");
      return;
    }

    if (!dataVencimento) {
      toast.error("Informe a data de vencimento.");
      return;
    }

    if (Number(valorOriginal) <= 0) {
      toast.error("Informe um valor original válido.");
      return;
    }

    if (
      Number(parcelaAtual) >
      Number(totalParcelas)
    ) {
      toast.error(
        "A parcela atual não pode ser maior que o total de parcelas."
      );
      return;
    }

    if (valorAberto <= 0) {
      toast.error(
        "O saldo da conta precisa ser maior que zero."
      );
      return;
    }

    try {
      setSalvando(true);

      await criarContaPagar({
        descricao: descricao.trim(),

        documento:
          documento.trim() || undefined,

        observacao:
          observacao.trim() || undefined,

        origem: "MANUAL",

        dataEmissao:
          dataEmissao || undefined,

        dataCompetencia:
          dataCompetencia || undefined,

        dataVencimento,

        parcelaAtual: Number(parcelaAtual),
        totalParcelas: Number(totalParcelas),

        valorOriginal: Number(valorOriginal),

        valorDesconto: Number(
          valorDesconto || 0
        ),

        valorJuros: Number(
          valorJuros || 0
        ),

        valorMulta: Number(
          valorMulta || 0
        ),

        fornecedorId:
          fornecedorId || undefined,
      });

      toast.success(
        "Conta a pagar criada com sucesso!"
      );

      limparCampos();
      setAberto(false);

      await queryClient.invalidateQueries({
        queryKey: ["contas-pagar"],
      });
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          "Erro ao criar conta a pagar"
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <FormDialog
      open={aberto}
      onOpenChange={setAberto}
      title="Nova conta a pagar"
      trigger={
        <Button>
          <Plus size={16} className="mr-2" />
          Nova conta
        </Button>
      }
    >
      <div className="max-h-[78vh] space-y-6 overflow-y-auto pr-2">
        <section className="space-y-4">
          <h3 className="font-semibold text-slate-900">
            Identificação
          </h3>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Descrição *
            </label>

            <Input
              value={descricao}
              onChange={(event) =>
                setDescricao(event.target.value)
              }
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Documento
              </label>

              <Input
                value={documento}
                onChange={(event) =>
                  setDocumento(event.target.value)
                }
                placeholder="Nota fiscal, boleto ou contrato"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Fornecedor
              </label>

              <select
                value={fornecedorId}
                onChange={(event) =>
                  setFornecedorId(
                    event.target.value
                  )
                }
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">
                  Sem fornecedor
                </option>

                {fornecedoresResponse?.data.map(
                  (fornecedor) => (
                    <option
                      key={fornecedor.id}
                      value={fornecedor.id}
                    >
                      {fornecedor.nomeFantasia ||
                        fornecedor.razaoSocial}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>
        </section>

        <section className="space-y-4 border-t pt-5">
          <h3 className="font-semibold text-slate-900">
            Datas
          </h3>

          <div className="grid gap-4 md:grid-cols-3">
            <CampoData
              label="Emissão"
              value={dataEmissao}
              onChange={setDataEmissao}
            />

            <CampoData
              label="Competência"
              value={dataCompetencia}
              onChange={setDataCompetencia}
            />

            <CampoData
              label="Vencimento *"
              value={dataVencimento}
              onChange={setDataVencimento}
            />
          </div>
        </section>

        <section className="space-y-4 border-t pt-5">
          <h3 className="font-semibold text-slate-900">
            Parcelamento
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <CampoNumero
              label="Parcela atual"
              value={parcelaAtual}
              onChange={setParcelaAtual}
              min="1"
              step="1"
            />

            <CampoNumero
              label="Total de parcelas"
              value={totalParcelas}
              onChange={setTotalParcelas}
              min="1"
              step="1"
            />
          </div>
        </section>

        <section className="space-y-4 border-t pt-5">
          <h3 className="font-semibold text-slate-900">
            Valores
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <CampoNumero
              label="Valor original *"
              value={valorOriginal}
              onChange={setValorOriginal}
            />

            <CampoNumero
              label="Desconto"
              value={valorDesconto}
              onChange={setValorDesconto}
            />

            <CampoNumero
              label="Juros"
              value={valorJuros}
              onChange={setValorJuros}
            />

            <CampoNumero
              label="Multa"
              value={valorMulta}
              onChange={setValorMulta}
            />
          </div>

          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Saldo inicial
            </p>

            <p className="mt-1 text-xl font-bold text-slate-900">
              {formatarMoeda(
                Math.max(valorAberto, 0)
              )}
            </p>
          </div>
        </section>

        <section className="border-t pt-5">
          <label className="text-sm font-medium text-slate-700">
            Observação
          </label>

          <Textarea
            value={observacao}
            onChange={(event) =>
              setObservacao(event.target.value)
            }
          />
        </section>

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
              ? "Criando..."
              : "Criar conta"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}

function CampoData({
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
      <label className="text-sm font-medium text-slate-700">
        {label}
      </label>

      <Input
        type="date"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
      />
    </div>
  );
}

function CampoNumero({
  label,
  value,
  onChange,
  min = "0",
  step = "0.01",
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  min?: string;
  step?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">
        {label}
      </label>

      <Input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
      />
    </div>
  );
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
