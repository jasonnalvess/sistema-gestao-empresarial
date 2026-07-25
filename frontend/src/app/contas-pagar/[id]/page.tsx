"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { CrudCard } from "@/components/crud/CrudCard";
import { CrudLoading } from "@/components/crud/CrudLoading";
import { Button } from "@/components/ui/button";

import { ContaPagarAcoes } from "@/components/contas-pagar/ContaPagarAcoes";

import {
  buscarContaPagar,
  FormaPagamento,
  OrigemContaPagar,
  StatusContaPagar,
} from "@/services/contas-pagar.service";

export default function ContaPagarDetalhesPage() {
  const params = useParams();
  const id = String(params.id);

  const {
    data: conta,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["conta-pagar", id],
    queryFn: () => buscarContaPagar(id),
    enabled: Boolean(id),
  });

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
          Conta a pagar não encontrada.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title={`Conta a Pagar #${String(
            conta.numero
          ).padStart(5, "0")}`}
          description={conta.descricao}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                asChild
              >
                <Link href="/contas-pagar">
                  <ArrowLeft
                    size={16}
                    className="mr-2"
                  />
                  Voltar
                </Link>
              </Button>

              <ContaPagarAcoes conta={conta} />
            </div>
          }
        />

        <CrudCard>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <Campo
              label="Descrição"
              valor={conta.descricao}
            />

            <Campo
              label="Documento"
              valor={conta.documento}
            />

            <Campo
              label="Fornecedor"
              valor={
                conta.fornecedor
                  ? conta.fornecedor
                      .nomeFantasia ||
                    conta.fornecedor
                      .razaoSocial
                  : null
              }
            />

            <Campo
              label="Origem"
              valor={formatarOrigem(
                conta.origem
              )}
            />

            <Campo
              label="Status"
              valor={formatarStatus(
                conta.status
              )}
            />

            <Campo
              label="Emissão"
              valor={formatarData(
                conta.dataEmissao
              )}
            />

            <Campo
              label="Competência"
              valor={
                conta.dataCompetencia
                  ? formatarData(
                      conta.dataCompetencia
                    )
                  : null
              }
            />

            <Campo
              label="Vencimento"
              valor={formatarData(
                conta.dataVencimento
              )}
            />

            <Campo
              label="Parcela"
              valor={`${conta.parcelaAtual}/${conta.totalParcelas}`}
            />

            <Campo
              label="Criada por"
              valor={
                conta.usuarioCriacao?.nome
              }
            />

            <Campo
              label="Pedido de compra"
              valor={
                conta.pedidoCompra
                  ? `#${String(
                      conta.pedidoCompra
                        .numero
                    ).padStart(5, "0")}`
                  : null
              }
            />
          </div>

          {conta.observacao && (
            <div className="mt-6 border-t pt-5">
              <CampoTexto
                label="Observação"
                valor={conta.observacao}
              />
            </div>
          )}
        </CrudCard>

        <div className="grid gap-6 lg:grid-cols-2">
          <CrudCard>
            <h2 className="mb-4 text-lg font-semibold">
              Valores
            </h2>

            <div className="space-y-3">
              <LinhaValor
                label="Valor original"
                valor={conta.valorOriginal}
              />

              <LinhaValor
                label="Desconto"
                valor={conta.valorDesconto}
              />

              <LinhaValor
                label="Juros"
                valor={conta.valorJuros}
              />

              <LinhaValor
                label="Multa"
                valor={conta.valorMulta}
              />

              <LinhaValor
                label="Valor pago"
                valor={conta.valorPago}
              />

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
            <h2 className="mb-4 text-lg font-semibold">
              Datas finais
            </h2>

            <div className="grid gap-5 md:grid-cols-2">
              <Campo
                label="Data do pagamento"
                valor={
                  conta.dataPagamento
                    ? formatarDataHora(
                        conta.dataPagamento
                      )
                    : null
                }
              />

              <Campo
                label="Data do cancelamento"
                valor={
                  conta.dataCancelamento
                    ? formatarDataHora(
                        conta.dataCancelamento
                      )
                    : null
                }
              />

              <Campo
                label="Cancelada por"
                valor={
                  conta
                    .usuarioCancelamento
                    ?.nome
                }
              />
            </div>
          </CrudCard>
        </div>

        <CrudCard>
          <h2 className="mb-4 text-lg font-semibold">
            Pagamentos
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="p-3">Data</th>
                  <th className="p-3">
                    Forma
                  </th>
                  <th className="p-3">
                    Documento
                  </th>
                  <th className="p-3">
                    Caixa
                  </th>
                  <th className="p-3">
                    Usuário
                  </th>
                  <th className="p-3 text-right">
                    Valor
                  </th>
                </tr>
              </thead>

              <tbody>
                {conta.pagamentos.map(
                  (pagamento) => (
                    <tr
                      key={pagamento.id}
                      className="border-b last:border-0"
                    >
                      <td className="p-3">
                        {formatarDataHora(
                          pagamento.dataPagamento
                        )}
                      </td>

                      <td className="p-3">
                        {formatarFormaPagamento(
                          pagamento.formaPagamento
                        )}
                      </td>

                      <td className="p-3">
                        {pagamento.documento ||
                          "-"}
                      </td>

                      <td className="p-3">
                        {pagamento.movimentacaoCaixa?.caixa
                          ? `${pagamento.movimentacaoCaixa.caixa.nome} — ${pagamento.movimentacaoCaixa.caixa.codigo}`
                          : "Sem movimentação"}
                      </td>

                      <td className="p-3">
                        {pagamento.usuario
                          ?.nome || "Sistema"}
                      </td>

                      <td className="p-3 text-right font-medium">
                        {formatarMoeda(
                          pagamento.valor
                        )}
                      </td>
                    </tr>
                  )
                )}

                {conta.pagamentos.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-5 text-center text-slate-500"
                    >
                      Nenhum pagamento registrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CrudCard>

        <CrudCard>
          <h2 className="mb-4 text-lg font-semibold">
            Histórico
          </h2>

          <div className="space-y-3">
            {conta.historicos.map(
              (historico) => (
                <div
                  key={historico.id}
                  className="rounded-lg border bg-slate-50 p-3"
                >
                  <p className="whitespace-pre-line text-sm text-slate-700">
                    {historico.descricao}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    {historico.usuario
                      ?.nome || "Sistema"}{" "}
                    •{" "}
                    {formatarDataHora(
                      historico.createdAt
                    )}
                  </p>
                </div>
              )
            )}
          </div>
        </CrudCard>
      </div>
    </AppLayout>
  );
}

function Campo({
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

      <p className="mt-1 text-sm text-slate-900">
        {valor || "-"}
      </p>
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
      <span className="text-sm text-slate-600">
        {label}
      </span>

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

function formatarStatus(
  status: StatusContaPagar
) {
  const mapa: Record<
    StatusContaPagar,
    string
  > = {
    PENDENTE: "Pendente",
    PARCIALMENTE_PAGA:
      "Parcialmente paga",
    PAGA: "Paga",
    VENCIDA: "Vencida",
    CANCELADA: "Cancelada",
  };

  return mapa[status];
}

function formatarOrigem(
  origem: OrigemContaPagar
) {
  const mapa: Record<
    OrigemContaPagar,
    string
  > = {
    MANUAL: "Manual",
    PEDIDO_COMPRA: "Pedido de compra",
    OUTRA: "Outra",
  };

  return mapa[origem];
}

function formatarFormaPagamento(
  forma: FormaPagamento
) {
  const mapa: Record<
    FormaPagamento,
    string
  > = {
    DINHEIRO: "Dinheiro",
    PIX: "PIX",
    BOLETO: "Boleto",
    TRANSFERENCIA: "Transferência",
    CARTAO_CREDITO:
      "Cartão de crédito",
    CARTAO_DEBITO:
      "Cartão de débito",
    CHEQUE: "Cheque",
    OUTRA: "Outra",
  };

  return mapa[forma];
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

function formatarData(valor: string) {
  return new Date(valor).toLocaleDateString(
    "pt-BR",
    {
      timeZone: "UTC",
    }
  );
}

function formatarDataHora(valor: string) {
  return new Date(valor).toLocaleString(
    "pt-BR"
  );
}