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

import { PedidoCompraAcoes } from "@/components/pedidos-compra/PedidoCompraAcoes";

import {
  buscarPedidoCompra,
  PedidoCompraStatus,
} from "@/services/pedidos-compra.service";

export default function PedidoCompraDetalhesPage() {
  const params = useParams();
  const id = String(params.id);

  const {
    data: pedido,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["pedido-compra", id],
    queryFn: () => buscarPedidoCompra(id),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <AppLayout>
        <CrudLoading />
      </AppLayout>
    );
  }

  if (error || !pedido) {
    return (
      <AppLayout>
        <div className="rounded-lg bg-red-50 p-4 text-red-700">
          Pedido de compra não encontrado.
        </div>
      </AppLayout>
    );
  }

  const statusVisual = obterStatusVisual(pedido.status);

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title={`Pedido de Compra #${String(
            pedido.numero
          ).padStart(5, "0")}`}
          description="Ficha completa do pedido de compra."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link href="/pedidos-compra">
                  <ArrowLeft size={16} className="mr-2" />
                  Voltar
                </Link>
              </Button>

              <PedidoCompraAcoes pedido={pedido} />
            </div>
          }
        />

        <CrudCard>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <Campo
              label="Fornecedor"
              valor={
                pedido.fornecedor?.nomeFantasia ||
                pedido.fornecedor?.razaoSocial
              }
            />

            <Campo
              label="Depósito"
              valor={
                pedido.deposito
                  ? `${
                      pedido.deposito.codigo
                        ? `${pedido.deposito.codigo} - `
                        : ""
                    }${pedido.deposito.nome}`
                  : null
              }
            />

            <Campo
              label="Data do pedido"
              valor={formatarData(pedido.dataPedido)}
            />

            <Campo
              label="Previsão de entrega"
              valor={
                pedido.dataPrevistaEntrega
                  ? formatarData(
                      pedido.dataPrevistaEntrega
                    )
                  : null
              }
            />

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Status
              </p>

              <span
                className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusVisual.classe}`}
              >
                {statusVisual.label}
              </span>
            </div>

            <Campo
              label="Criado por"
              valor={pedido.usuarioCriacao?.nome}
            />

            <Campo
              label="Aprovado por"
              valor={pedido.usuarioAprovacao?.nome}
            />

            <Campo
              label="Recebido por"
              valor={pedido.usuarioRecebimento?.nome}
            />
          </div>
        </CrudCard>

        <CrudCard>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Itens do pedido
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="p-3">Produto</th>
                  <th className="p-3 text-right">Solicitado</th>
                  <th className="p-3 text-right">Recebido</th>
                  <th className="p-3 text-right">Valor unitário</th>
                  <th className="p-3 text-right">Desconto</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>

              <tbody>
                {pedido.itens.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b last:border-0"
                  >
                    <td className="p-3">
                      <p className="font-medium">
                        {item.produto.nome}
                      </p>

                      {item.produto.codigo && (
                        <p className="text-xs text-slate-500">
                          {item.produto.codigo}
                        </p>
                      )}
                    </td>

                    <td className="p-3 text-right">
                      {formatarQuantidade(
                        item.quantidadeSolicitada
                      )}
                    </td>

                    <td className="p-3 text-right">
                      {formatarQuantidade(
                        item.quantidadeRecebida
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

                    <td className="p-3">
                      {formatarStatusItem(item.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CrudCard>

        <div className="grid gap-6 lg:grid-cols-2">
          <CrudCard>
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Valores
            </h2>

            <div className="space-y-3">
              <LinhaValor
                label="Produtos"
                valor={pedido.valorProdutos}
              />
              <LinhaValor
                label="Desconto"
                valor={pedido.valorDesconto}
              />
              <LinhaValor
                label="Frete"
                valor={pedido.valorFrete}
              />
              <LinhaValor
                label="Outros valores"
                valor={pedido.valorOutros}
              />

              <div className="border-t pt-3">
                <LinhaValor
                  label="Total"
                  valor={pedido.valorTotal}
                  destaque
                />
              </div>
            </div>
          </CrudCard>

          <CrudCard>
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Observações
            </h2>

            <CampoTexto
              label="Observação para o fornecedor"
              valor={pedido.observacao}
            />

            <div className="mt-5">
              <CampoTexto
                label="Observação interna"
                valor={pedido.observacaoInterna}
              />
            </div>
          </CrudCard>
        </div>

        <CrudCard>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Histórico
          </h2>

          <div className="space-y-3">
            {pedido.historicos.map((historico) => (
              <div
                key={historico.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <p className="whitespace-pre-line text-sm text-slate-700">
                  {historico.descricao}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  {historico.usuario?.nome || "Sistema"} •{" "}
                  {new Date(
                    historico.createdAt
                  ).toLocaleString("pt-BR")}
                </p>
              </div>
            ))}

            {pedido.historicos.length === 0 && (
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

function obterStatusVisual(status: PedidoCompraStatus) {
  const mapa = {
    RASCUNHO: {
      label: "Rascunho",
      classe: "bg-slate-100 text-slate-700",
    },
    PENDENTE_APROVACAO: {
      label: "Pendente de aprovação",
      classe: "bg-amber-100 text-amber-700",
    },
    APROVADO: {
      label: "Aprovado",
      classe: "bg-blue-100 text-blue-700",
    },
    PARCIALMENTE_RECEBIDO: {
      label: "Parcialmente recebido",
      classe: "bg-purple-100 text-purple-700",
    },
    RECEBIDO: {
      label: "Recebido",
      classe: "bg-green-100 text-green-700",
    },
    CANCELADO: {
      label: "Cancelado",
      classe: "bg-red-100 text-red-700",
    },
  };

  return mapa[status];
}

function formatarStatusItem(status: string) {
  const mapa: Record<string, string> = {
    PENDENTE: "Pendente",
    PARCIALMENTE_RECEBIDO: "Parcial",
    RECEBIDO: "Recebido",
    CANCELADO: "Cancelado",
  };

  return mapa[status] || status;
}

function formatarMoeda(valor: string | number) {
  return Number(valor).toLocaleString("pt-BR", {
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
