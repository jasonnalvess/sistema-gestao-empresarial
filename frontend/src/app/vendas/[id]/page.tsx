"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  CheckCircle2,
  Clock3,
  FileEdit,
  ReceiptText,
} from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { AcessoNegado } from "@/components/common/AcessoNegado";
import { EmpresaNaoSelecionada } from "@/components/common/EmpresaNaoSelecionada";
import { CrudCard } from "@/components/crud/CrudCard";
import { CrudLoading } from "@/components/crud/CrudLoading";
import { Button } from "@/components/ui/button";
import { VendaAcoes } from "@/components/vendas/VendaAcoes";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_VENDAS_VISUALIZAR } from "@/lib/auth";
import { vendasQueryKeys } from "@/lib/vendas-query-keys";

import { buscarVenda, StatusVenda } from "@/services/vendas.service";

export default function VendaDetalhesPage() {
  const params = useParams();
  const id = String(params.id);
  const { temPermissao } = useAuth();
  const { empresaSelecionadaId, empresaEfetivaId, carregando, requerSelecao } =
    useEmpresaSelecionada();
  const possuiEmpresaEfetiva = !requerSelecao || Boolean(empresaSelecionadaId);
  const podeVisualizar = temPermissao(PERMISSAO_VENDAS_VISUALIZAR);

  const {
    data: venda,
    isLoading,
    error,
  } = useQuery({
    queryKey: vendasQueryKeys.detalhe(empresaEfetivaId ?? "", id),
    queryFn: () => buscarVenda(id),
    enabled:
      podeVisualizar &&
      possuiEmpresaEfetiva &&
      Boolean(empresaEfetivaId) &&
      Boolean(id) &&
      !carregando,
  });

  if (carregando)
    return (
      <AppLayout>
        <CrudLoading />
      </AppLayout>
    );
  if (!podeVisualizar)
    return (
      <AppLayout>
        <AcessoNegado />
      </AppLayout>
    );
  if (!possuiEmpresaEfetiva)
    return (
      <AppLayout>
        <EmpresaNaoSelecionada />
      </AppLayout>
    );

  if (isLoading) {
    return (
      <AppLayout>
        <CrudLoading />
      </AppLayout>
    );
  }

  if (error || !venda) {
    return (
      <AppLayout>
        <div className="rounded-lg bg-red-50 p-4 text-red-700">
          Venda não encontrada.
        </div>
      </AppLayout>
    );
  }

  const statusVisual = obterStatusVisual(venda.status);

  return (
    <AppLayout>
      <div className="min-w-0 space-y-6">
        <PageHeader
          title={`Venda #${String(venda.numero).padStart(5, "0")}`}
          description="Ficha completa da venda."
          actions={
            <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 md:flex md:w-auto md:flex-wrap">
              <Button variant="outline" asChild>
                <Link href="/vendas">
                  <ArrowLeft size={16} className="mr-2" />
                  Voltar
                </Link>
              </Button>

              <VendaAcoes vendaId={venda.id} status={venda.status} />
            </div>
          }
        />

        <CrudCard>
          <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            <Campo label="Cliente" valor={venda.cliente?.nome} />

            <Campo label="Documento" valor={venda.cliente?.documento} />

            <Campo
              label="Depósito"
              valor={
                venda.deposito
                  ? `${
                      venda.deposito.codigo ? `${venda.deposito.codigo} - ` : ""
                    }${venda.deposito.nome}`
                  : null
              }
            />

            <Campo
              label="Data da venda"
              valor={formatarData(venda.dataVenda)}
            />

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Status
              </p>

              <span
                className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${statusVisual.classe}`}
              >
                {statusVisual.icone}
                {statusVisual.label}
              </span>
            </div>

            <Campo
              label="Condição de pagamento"
              valor={formatarCondicaoPagamento(venda.condicaoPagamento)}
            />

            <Campo
              label="Forma de pagamento"
              valor={
                venda.formaPagamento
                  ? formatarFormaPagamento(venda.formaPagamento)
                  : null
              }
            />

            <Campo
              label="Quantidade de parcelas"
              valor={String(venda.quantidadeParcelas ?? 1)}
            />

            <Campo
              label="Intervalo das parcelas"
              valor={`${String(venda.intervaloParcelas ?? 30)} dias`}
            />

            <Campo
              label="Primeiro vencimento"
              valor={
                venda.primeiroVencimento
                  ? formatarData(venda.primeiroVencimento)
                  : null
              }
            />

            <Campo label="Criado por" valor={venda.usuarioCriacao?.nome} />

            <Campo label="Aprovado por" valor={venda.usuarioAprovacao?.nome} />

            <Campo
              label="Cancelado por"
              valor={venda.usuarioCancelamento?.nome}
            />

            <Campo label="Concluído por" valor={venda.usuarioConclusao?.nome} />

            <Campo
              label="Data de aprovação"
              valor={
                venda.dataAprovacao
                  ? formatarDataHora(venda.dataAprovacao)
                  : null
              }
            />

            <Campo
              label="Data de faturamento"
              valor={
                venda.dataFaturamento
                  ? formatarDataHora(venda.dataFaturamento)
                  : null
              }
            />

            <Campo
              label="Data de cancelamento"
              valor={
                venda.dataCancelamento
                  ? formatarDataHora(venda.dataCancelamento)
                  : null
              }
            />

            <Campo
              label="Data de conclusão"
              valor={
                venda.dataConclusao
                  ? formatarDataHora(venda.dataConclusao)
                  : null
              }
            />
          </div>
        </CrudCard>

        <CrudCard>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Itens da venda
          </h2>

          <div className="min-w-0 max-w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="p-3">Produto</th>

                  <th className="p-3">Categoria</th>

                  <th className="p-3">Marca</th>

                  <th className="p-3 text-right">Quantidade</th>

                  <th className="p-3 text-right">Valor unitário</th>

                  <th className="p-3 text-right">Desconto</th>

                  <th className="p-3 text-right">Total</th>

                  <th className="p-3">Status</th>
                </tr>
              </thead>

              <tbody>
                {venda.itens.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="p-3">
                      <p className="font-medium text-slate-900">
                        {item.produto?.nome ?? "-"}
                      </p>

                      {item.produto?.codigo && (
                        <p className="text-xs text-slate-500">
                          {item.produto.codigo}
                        </p>
                      )}

                      {item.observacao && (
                        <p className="mt-1 text-xs text-slate-500">
                          {item.observacao}
                        </p>
                      )}
                    </td>

                    <td className="p-3">
                      {item.produto?.categoria?.nome ?? "-"}
                    </td>

                    <td className="p-3">{item.produto?.marca?.nome ?? "-"}</td>

                    <td className="p-3 text-right">
                      {formatarQuantidade(item.quantidade)}

                      {item.produto?.unidadeMedida?.sigla && (
                        <span className="ml-1 text-xs text-slate-500">
                          {item.produto.unidadeMedida.sigla}
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-right">
                      {formatarMoeda(item.valorUnitario)}
                    </td>

                    <td className="p-3 text-right">
                      {formatarMoeda(item.valorDesconto)}
                    </td>

                    <td className="p-3 text-right font-medium">
                      {formatarMoeda(item.valorTotal)}
                    </td>

                    <td className="p-3">{formatarStatusItem(item.status)}</td>
                  </tr>
                ))}

                {venda.itens.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-4 text-center text-sm text-slate-500"
                    >
                      Nenhum item cadastrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CrudCard>

        <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
          <CrudCard>
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Valores
            </h2>

            <div className="space-y-3">
              <LinhaValor label="Produtos" valor={venda.valorProdutos} />

              <LinhaValor label="Desconto geral" valor={venda.valorDesconto} />

              <LinhaValor label="Frete" valor={venda.valorFrete} />

              <LinhaValor label="Outros valores" valor={venda.valorOutros} />

              <div className="border-t pt-3">
                <LinhaValor label="Total" valor={venda.valorTotal} destaque />
              </div>
            </div>
          </CrudCard>

          <CrudCard>
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Observações
            </h2>

            <CampoTexto label="Observação" valor={venda.observacao} />

            <div className="mt-5">
              <CampoTexto
                label="Observação interna"
                valor={venda.observacaoInterna}
              />
            </div>
          </CrudCard>
        </div>

        <CrudCard>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Contas a receber
          </h2>

          <div className="min-w-0 max-w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="p-3">Parcela</th>

                  <th className="p-3">Vencimento</th>

                  <th className="p-3">Status</th>

                  <th className="p-3 text-right">Valor</th>

                  <th className="p-3 text-right">Valor recebido</th>

                  <th className="p-3">Recebimento</th>
                </tr>
              </thead>

              <tbody>
                {venda.contasReceber.map((conta) => (
                  <tr key={conta.id} className="border-b last:border-0">
                    <td className="p-3">
                      {conta.parcelaAtual ?? "-"}
                      {conta.totalParcelas ? `/${conta.totalParcelas}` : ""}
                    </td>

                    <td className="p-3">
                      {conta.dataVencimento
                        ? formatarData(conta.dataVencimento)
                        : "-"}
                    </td>

                    <td className="p-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${obterClasseStatusConta(
                          conta.status,
                        )}`}
                      >
                        {formatarStatusConta(conta.status)}
                      </span>
                    </td>

                    <td className="p-3 text-right">
                      {formatarMoeda(conta.valorOriginal ?? conta.valor)}
                    </td>

                    <td className="p-3 text-right">
                      {formatarMoeda(conta.valorRecebido ?? 0)}
                    </td>

                    <td className="p-3">
                      {conta.dataRecebimento
                        ? formatarDataHora(conta.dataRecebimento)
                        : "-"}
                    </td>
                  </tr>
                ))}

                {venda.contasReceber.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-4 text-center text-sm text-slate-500"
                    >
                      Nenhuma conta a receber gerada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CrudCard>

        <CrudCard>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Histórico
          </h2>

          <div className="space-y-3">
            {venda.historicos.map((historico) => (
              <div
                key={historico.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3"
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

            {venda.historicos.length === 0 && (
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
    <div className="flex items-center justify-between">
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

function obterStatusVisual(status: StatusVenda) {
  const mapa = {
    RASCUNHO: {
      label: "Rascunho",
      classe: "bg-slate-100 text-slate-700",
      icone: <FileEdit size={14} />,
    },

    PENDENTE: {
      label: "Pendente",
      classe: "bg-amber-100 text-amber-700",
      icone: <Clock3 size={14} />,
    },

    APROVADA: {
      label: "Aprovada",
      classe: "bg-blue-100 text-blue-700",
      icone: <CheckCircle2 size={14} />,
    },

    FATURADA: {
      label: "Faturada",
      classe: "bg-purple-100 text-purple-700",
      icone: <ReceiptText size={14} />,
    },

    CONCLUIDA: {
      label: "Concluída",
      classe: "bg-green-100 text-green-700",
      icone: <BadgeCheck size={14} />,
    },

    CANCELADA: {
      label: "Cancelada",
      classe: "bg-red-100 text-red-700",
      icone: <Ban size={14} />,
    },
  };

  return mapa[status];
}

function formatarCondicaoPagamento(condicao: "AVISTA" | "APRAZO") {
  return condicao === "AVISTA" ? "À vista" : "A prazo";
}

function formatarFormaPagamento(forma: string) {
  const mapa: Record<string, string> = {
    DINHEIRO: "Dinheiro",
    PIX: "Pix",
    CARTAO_CREDITO: "Cartão de crédito",
    CARTAO_DEBITO: "Cartão de débito",
    BOLETO: "Boleto",
    TRANSFERENCIA: "Transferência",
  };

  return mapa[forma] ?? forma;
}

function formatarStatusItem(status?: string) {
  const mapa: Record<string, string> = {
    PENDENTE: "Pendente",
    FATURADO: "Faturado",
    CANCELADO: "Cancelado",
  };

  return status ? (mapa[status] ?? status) : "-";
}

function formatarStatusConta(status?: string) {
  const mapa: Record<string, string> = {
    PENDENTE: "Pendente",
    PARCIAL: "Parcial",
    RECEBIDA: "Recebida",
    VENCIDA: "Vencida",
    CANCELADA: "Cancelada",
  };

  return status ? (mapa[status] ?? status) : "-";
}

function obterClasseStatusConta(status?: string) {
  const mapa: Record<string, string> = {
    PENDENTE: "bg-amber-100 text-amber-700",
    PARCIAL: "bg-blue-100 text-blue-700",
    RECEBIDA: "bg-green-100 text-green-700",
    VENCIDA: "bg-red-100 text-red-700",
    CANCELADA: "bg-slate-100 text-slate-700",
  };

  return mapa[status ?? ""] ?? "bg-slate-100 text-slate-700";
}

function formatarMoeda(valor: string | number | null | undefined) {
  return Number(valor ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarQuantidade(valor: string | number) {
  return Number(valor).toLocaleString("pt-BR", {
    maximumFractionDigits: 3,
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
