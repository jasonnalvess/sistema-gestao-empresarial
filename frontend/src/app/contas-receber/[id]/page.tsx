"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { ArrowLeft } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { AcessoNegado } from "@/components/common/AcessoNegado";
import { EmpresaNaoSelecionada } from "@/components/common/EmpresaNaoSelecionada";
import { CrudCard } from "@/components/crud/CrudCard";
import { CrudLoading } from "@/components/crud/CrudLoading";
import { Button } from "@/components/ui/button";

import { ContaReceberAcoes } from "@/components/contas-receber/ContaReceberAcoes";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_CONTAS_RECEBER_VISUALIZAR } from "@/lib/auth";

import {
  buscarContaReceber,
  contasReceberQueryKeys,
  FormaRecebimento,
  OrigemContaReceber,
  StatusContaReceber,
} from "@/services/contas-receber.service";

export default function ContaReceberDetalhesPage() {
  const params = useParams();
  const id = String(params.id);
  const { temPermissao } = useAuth();
  const { empresaSelecionadaId, empresaEfetivaId, carregando, requerSelecao } =
    useEmpresaSelecionada();
  const possuiEmpresaEfetiva = !requerSelecao || Boolean(empresaSelecionadaId);
  const podeVisualizar = temPermissao(PERMISSAO_CONTAS_RECEBER_VISUALIZAR);

  const {
    data: conta,
    isLoading,
    error,
  } = useQuery({
    queryKey: contasReceberQueryKeys.detalhe(empresaEfetivaId ?? "", id),
    queryFn: () => buscarContaReceber(id),
    enabled:
      podeVisualizar &&
      possuiEmpresaEfetiva &&
      Boolean(empresaEfetivaId) &&
      !carregando &&
      Boolean(id),
  });

  if (carregando) {
    return (
      <AppLayout>
        <CrudLoading />
      </AppLayout>
    );
  }

  if (!podeVisualizar) {
    return (
      <AppLayout>
        <AcessoNegado />
      </AppLayout>
    );
  }

  if (!possuiEmpresaEfetiva || !empresaEfetivaId) {
    return (
      <AppLayout>
        <EmpresaNaoSelecionada />
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout>
        <CrudLoading />
      </AppLayout>
    );
  }

  if (error || !conta) {
    return (
      <AppLayout>
        <div className="rounded-lg bg-red-50 p-4 text-red-700">
          {error && !(isAxiosError(error) && error.response?.status === 404)
            ? "Erro ao carregar conta a receber."
            : "Conta a receber não encontrada."}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-w-0 space-y-6">
        <PageHeader
          title={`Conta a Receber #${String(conta.numero).padStart(5, "0")}`}
          description={conta.descricao}
          actions={
            <div className="grid w-full min-w-0 grid-cols-1 gap-2 lg:flex lg:w-auto lg:flex-wrap [&>*]:w-full md:[&>*]:w-full lg:[&>*]:w-auto">
              <Button variant="outline" asChild>
                <Link href="/contas-receber">
                  <ArrowLeft size={16} className="mr-2" />
                  Voltar
                </Link>
              </Button>

              <ContaReceberAcoes conta={conta} />
            </div>
          }
        />

        <CrudCard>
          <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            <Campo label="Descrição" valor={conta.descricao} />

            <Campo label="Documento" valor={conta.documento} />

            <Campo label="Cliente" valor={conta.cliente?.nome} />

            <Campo label="Origem" valor={formatarOrigem(conta.origem)} />

            <Campo label="Status" valor={formatarStatus(conta.status)} />

            <Campo label="Emissão" valor={formatarData(conta.dataEmissao)} />

            <Campo
              label="Competência"
              valor={
                conta.dataCompetencia
                  ? formatarData(conta.dataCompetencia)
                  : null
              }
            />

            <Campo
              label="Vencimento"
              valor={formatarData(conta.dataVencimento)}
            />

            <Campo
              label="Parcela"
              valor={`${conta.parcelaAtual}/${conta.totalParcelas}`}
            />

            <Campo label="Criada por" valor={conta.usuarioCriacao?.nome} />

            <Campo
              label="Ordem de serviço"
              valor={
                conta.ordemServico
                  ? `#${String(conta.ordemServico.numero).padStart(5, "0")} - ${
                      conta.ordemServico.titulo
                    }`
                  : null
              }
            />
          </div>

          {conta.observacao && (
            <div className="mt-6 border-t pt-5">
              <CampoTexto label="Observação" valor={conta.observacao} />
            </div>
          )}
        </CrudCard>

        <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
          <CrudCard>
            <h2 className="mb-4 text-lg font-semibold">Valores</h2>

            <div className="space-y-3">
              <LinhaValor label="Valor original" valor={conta.valorOriginal} />

              <LinhaValor label="Desconto" valor={conta.valorDesconto} />

              <LinhaValor label="Juros" valor={conta.valorJuros} />

              <LinhaValor label="Multa" valor={conta.valorMulta} />

              <LinhaValor label="Valor recebido" valor={conta.valorRecebido} />

              <div className="border-t pt-3">
                <LinhaValor
                  label="Saldo em aberto"
                  valor={conta.valorAberto}
                  destaque
                />
              </div>
            </div>
          </CrudCard>

          <CrudCard>
            <h2 className="mb-4 text-lg font-semibold">Datas finais</h2>

            <div className="grid gap-5 md:grid-cols-2">
              <Campo
                label="Data do recebimento"
                valor={
                  conta.dataRecebimento
                    ? formatarDataHora(conta.dataRecebimento)
                    : null
                }
              />

              <Campo
                label="Data do cancelamento"
                valor={
                  conta.dataCancelamento
                    ? formatarDataHora(conta.dataCancelamento)
                    : null
                }
              />

              <Campo
                label="Cancelada por"
                valor={conta.usuarioCancelamento?.nome}
              />
            </div>
          </CrudCard>
        </div>

        <CrudCard>
          <h2 className="mb-4 text-lg font-semibold">Recebimentos</h2>

          <div className="min-w-0 max-w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="p-3">Data</th>

                  <th className="p-3">Forma</th>

                  <th className="p-3">Documento</th>

                  <th className="p-3">Caixa</th>

                  <th className="p-3">Usuário</th>

                  <th className="p-3 text-right">Valor</th>
                </tr>
              </thead>

              <tbody>
                {conta.recebimentos.map((recebimento) => (
                  <tr key={recebimento.id} className="border-b last:border-0">
                    <td className="p-3">
                      {formatarDataHora(recebimento.dataRecebimento)}
                    </td>

                    <td className="p-3">
                      {formatarFormaRecebimento(recebimento.formaRecebimento)}
                    </td>

                    <td className="p-3">{recebimento.documento || "-"}</td>

                    <td className="p-3">
                      {recebimento.movimentacaoCaixa?.caixa
                        ? `${recebimento.movimentacaoCaixa.caixa.nome} — ${recebimento.movimentacaoCaixa.caixa.codigo}`
                        : "Sem movimentação"}
                    </td>

                    <td className="p-3">
                      {recebimento.usuario?.nome || "Sistema"}
                    </td>

                    <td className="p-3 text-right font-medium">
                      {formatarMoeda(recebimento.valor)}
                    </td>
                  </tr>
                ))}

                {conta.recebimentos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-5 text-center text-slate-500">
                      Nenhum recebimento registrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CrudCard>

        <CrudCard>
          <h2 className="mb-4 text-lg font-semibold">Histórico</h2>

          <div className="space-y-3">
            {conta.historicos.map((historico) => (
              <div
                key={historico.id}
                className="rounded-lg border bg-slate-50 p-3"
              >
                <p className="whitespace-pre-line text-sm text-slate-700">
                  {historico.descricao}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  {historico.usuario?.nome || "Sistema"} •{" "}
                  {formatarDataHora(historico.createdAt)}
                </p>
              </div>
            ))}

            {conta.historicos.length === 0 && (
              <p className="text-sm text-slate-500">
                Nenhum histórico registrado.
              </p>
            )}
          </div>
        </CrudCard>
      </div>
    </AppLayout>
  );
}

function Campo({ label, valor }: { label: string; valor?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-sm text-slate-900">{valor || "-"}</p>
    </div>
  );
}

function CampoTexto({
  label,
  valor,
}: {
  label: string;
  valor?: string | null;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
        {valor || "-"}
      </p>
    </div>
  );
}

function LinhaValor({
  label,
  valor,
  destaque = false,
}: {
  label: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-slate-600">{label}</span>

      <span
        className={
          destaque
            ? "text-lg font-bold text-slate-900"
            : "font-medium text-slate-900"
        }
      >
        {formatarMoeda(valor)}
      </span>
    </div>
  );
}

function formatarStatus(status: StatusContaReceber) {
  const mapa: Record<StatusContaReceber, string> = {
    PENDENTE: "Pendente",
    PARCIALMENTE_RECEBIDA: "Parcialmente recebida",
    RECEBIDA: "Recebida",
    VENCIDA: "Vencida",
    CANCELADA: "Cancelada",
  };

  return mapa[status];
}

function formatarOrigem(origem: OrigemContaReceber) {
  const mapa: Record<OrigemContaReceber, string> = {
    MANUAL: "Manual",
    ORDEM_SERVICO: "Ordem de serviço",
    VENDA: "Venda",
    OUTRA: "Outra",
  };

  return mapa[origem];
}

function formatarFormaRecebimento(forma: FormaRecebimento) {
  const mapa: Record<FormaRecebimento, string> = {
    DINHEIRO: "Dinheiro",
    PIX: "PIX",
    BOLETO: "Boleto",
    TRANSFERENCIA: "Transferência",
    CARTAO_CREDITO: "Cartão de crédito",
    CARTAO_DEBITO: "Cartão de débito",
    CHEQUE: "Cheque",
    OUTRA: "Outra",
  };

  return mapa[forma];
}

function formatarMoeda(valor: string | number) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(valor: string) {
  return new Date(valor).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
}

function formatarDataHora(valor: string) {
  return new Date(valor).toLocaleString("pt-BR");
}
