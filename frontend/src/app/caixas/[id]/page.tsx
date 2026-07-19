"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import {
  ArrowDownCircle,
  ArrowLeft,
  ArrowUpCircle,
  LockKeyhole,
  LockKeyholeOpen,
} from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { CrudCard } from "@/components/crud/CrudCard";
import { CrudLoading } from "@/components/crud/CrudLoading";
import { Button } from "@/components/ui/button";

import { AbrirCaixaModal } from "@/components/caixas/AbrirCaixaModal";
import { FecharCaixaModal } from "@/components/caixas/FecharCaixaModal";
import { NovaMovimentacaoCaixaModal } from "@/components/caixas/NovaMovimentacaoCaixaModal";
import { AlterarStatusCaixaButton } from "@/components/caixas/AlterarStatusCaixaButton";

import {
  buscarCaixa,
  OrigemMovimentacaoCaixa,
  StatusCaixa,
  TipoMovimentacaoCaixa,
} from "@/services/caixas.service";

export default function CaixaDetalhesPage() {
  const params = useParams();
  const id = String(params.id);

  const {
    data: caixa,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["caixa", id],
    queryFn: () => buscarCaixa(id),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <AppLayout>
        <CrudLoading />
      </AppLayout>
    );
  }

  if (error || !caixa) {
    return (
      <AppLayout>
        <div className="rounded-lg bg-red-50 p-4 text-red-700">
          Caixa não encontrado.
        </div>
      </AppLayout>
    );
  }

  const aberto =
    caixa.status === "ABERTO" &&
    caixa.ativo;

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title={caixa.nome}
          description={`${caixa.codigo}${
            caixa.descricao
              ? ` — ${caixa.descricao}`
              : ""
          }`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                asChild
              >
                <Link href="/caixas">
                  <ArrowLeft
                    size={16}
                    className="mr-2"
                  />
                  Voltar
                </Link>
              </Button>

              {aberto && (
                <>
                  <NovaMovimentacaoCaixaModal
                    caixa={caixa}
                    tipo="ENTRADA"
                  />

                  <NovaMovimentacaoCaixaModal
                    caixa={caixa}
                    tipo="SAIDA"
                  />

                  <FecharCaixaModal
                    caixa={caixa}
                  />
                </>
              )}

              {!aberto &&
                caixa.ativo &&
                caixa.status === "FECHADO" && (
                  <AbrirCaixaModal
                    caixa={caixa}
                  />
                )}

              {caixa.status !== "ABERTO" && (
                <AlterarStatusCaixaButton
                  caixa={caixa}
                />
              )}
            </div>
          }
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ResumoCard
            titulo="Saldo atual"
            valor={formatarMoeda(
              caixa.saldoAtual
            )}
          />

          <ResumoCard
            titulo="Status"
            valor={formatarStatus(
              caixa.status
            )}
          />

          <ResumoCard
            titulo="Situação"
            valor={
              caixa.ativo
                ? "Ativo"
                : "Inativo"
            }
          />

          <ResumoCard
            titulo="Sessões registradas"
            valor={String(
              caixa.aberturas?.length ?? 0
            )}
          />
        </div>

        <CrudCard>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Dados do caixa
          </h2>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <Campo
              label="Nome"
              valor={caixa.nome}
            />

            <Campo
              label="Código"
              valor={caixa.codigo}
            />

            <Campo
              label="Status"
              valor={formatarStatus(
                caixa.status
              )}
            />

            <Campo
              label="Saldo atual"
              valor={formatarMoeda(
                caixa.saldoAtual
              )}
            />

            <Campo
              label="Criado por"
              valor={
                caixa.usuarioCriacao?.nome
              }
            />

            <Campo
              label="Criado em"
              valor={formatarDataHora(
                caixa.createdAt
              )}
            />

            <Campo
              label="Atualizado em"
              valor={formatarDataHora(
                caixa.updatedAt
              )}
            />
          </div>
        </CrudCard>

        <CrudCard>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Movimentações recentes
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="p-3">Data</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Origem</th>
                  <th className="p-3">
                    Descrição
                  </th>
                  <th className="p-3">
                    Documento
                  </th>
                  <th className="p-3">
                    Usuário
                  </th>
                  <th className="p-3 text-right">
                    Valor
                  </th>
                  <th className="p-3 text-right">
                    Saldo
                  </th>
                </tr>
              </thead>

              <tbody>
                {(caixa.movimentacoes ?? []).map(
                  (movimentacao) => (
                    <tr
                      key={movimentacao.id}
                      className="border-b last:border-0"
                    >
                      <td className="p-3">
                        {formatarDataHora(
                          movimentacao.dataMovimentacao
                        )}
                      </td>

                      <td className="p-3">
                        <TipoMovimentacaoBadge
                          tipo={
                            movimentacao.tipo
                          }
                        />
                      </td>

                      <td className="p-3">
                        {formatarOrigem(
                          movimentacao.origem
                        )}
                      </td>

                      <td className="p-3">
                        {movimentacao.descricao}
                      </td>

                      <td className="p-3">
                        {movimentacao.documento ||
                          "-"}
                      </td>

                      <td className="p-3">
                        {movimentacao.usuario
                          ?.nome || "Sistema"}
                      </td>

                      <td className="p-3 text-right font-medium">
                        {formatarMoeda(
                          movimentacao.valor
                        )}
                      </td>

                      <td className="p-3 text-right">
                        {formatarMoeda(
                          movimentacao.saldoPosterior
                        )}
                      </td>
                    </tr>
                  )
                )}

                {(caixa.movimentacoes?.length ??
                  0) === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-5 text-center text-slate-500"
                    >
                      Nenhuma movimentação registrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CrudCard>

        <CrudCard>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Histórico de aberturas
          </h2>

          <div className="space-y-4">
            {(caixa.aberturas ?? []).map(
              (abertura) => (
                <div
                  key={abertura.id}
                  className="rounded-lg border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={
                          abertura.aberto
                            ? "rounded-lg bg-green-50 p-2 text-green-700"
                            : "rounded-lg bg-slate-100 p-2 text-slate-700"
                        }
                      >
                        {abertura.aberto ? (
                          <LockKeyholeOpen
                            size={18}
                          />
                        ) : (
                          <LockKeyhole
                            size={18}
                          />
                        )}
                      </div>

                      <div>
                        <p className="font-medium text-slate-900">
                          {abertura.aberto
                            ? "Sessão aberta"
                            : "Sessão encerrada"}
                        </p>

                        <p className="text-xs text-slate-500">
                          Abertura:{" "}
                          {formatarDataHora(
                            abertura.dataAbertura
                          )}
                        </p>
                      </div>
                    </div>

                    <span
                      className={
                        abertura.aberto
                          ? "rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700"
                          : "rounded-full bg-slate-200 px-2 py-1 text-xs font-medium text-slate-700"
                      }
                    >
                      {abertura.aberto
                        ? "Aberta"
                        : "Fechada"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Campo
                      label="Saldo inicial"
                      valor={formatarMoeda(
                        abertura.saldoInicial
                      )}
                    />

                    <Campo
                      label="Saldo do sistema"
                      valor={
                        abertura.saldoSistema !==
                        null &&
                        abertura.saldoSistema !==
                          undefined
                          ? formatarMoeda(
                              abertura.saldoSistema
                            )
                          : null
                      }
                    />

                    <Campo
                      label="Saldo informado"
                      valor={
                        abertura.saldoInformado !==
                        null &&
                        abertura.saldoInformado !==
                          undefined
                          ? formatarMoeda(
                              abertura.saldoInformado
                            )
                          : null
                      }
                    />

                    <Campo
                      label="Diferença"
                      valor={
                        abertura.diferenca !==
                          null &&
                        abertura.diferenca !==
                          undefined
                          ? formatarMoeda(
                              abertura.diferenca
                            )
                          : null
                      }
                    />

                    <Campo
                      label="Aberto por"
                      valor={
                        abertura.usuarioAbertura
                          ?.nome
                      }
                    />

                    <Campo
                      label="Fechado por"
                      valor={
                        abertura
                          .usuarioFechamento
                          ?.nome
                      }
                    />

                    <Campo
                      label="Fechamento"
                      valor={
                        abertura.dataFechamento
                          ? formatarDataHora(
                              abertura.dataFechamento
                            )
                          : null
                      }
                    />

                    <Campo
                      label="Movimentações"
                      valor={String(
                        abertura._count
                          ?.movimentacoes ?? 0
                      )}
                    />
                  </div>

                  {(abertura.observacaoAbertura ||
                    abertura.observacaoFechamento) && (
                    <div className="mt-4 space-y-2 border-t pt-4 text-sm text-slate-600">
                      {abertura.observacaoAbertura && (
                        <p>
                          <strong>
                            Abertura:
                          </strong>{" "}
                          {
                            abertura.observacaoAbertura
                          }
                        </p>
                      )}

                      {abertura.observacaoFechamento && (
                        <p>
                          <strong>
                            Fechamento:
                          </strong>{" "}
                          {
                            abertura.observacaoFechamento
                          }
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            )}

            {(caixa.aberturas?.length ?? 0) ===
              0 && (
              <p className="text-sm text-slate-500">
                Nenhuma abertura registrada.
              </p>
            )}
          </div>
        </CrudCard>
      </div>
    </AppLayout>
  );
}

function ResumoCard({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">
        {titulo}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-900">
        {valor}
      </p>
    </div>
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

function TipoMovimentacaoBadge({
  tipo,
}: {
  tipo: TipoMovimentacaoCaixa;
}) {
  const entrada = tipo === "ENTRADA";

  return (
    <span
      className={
        entrada
          ? "inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700"
          : "inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700"
      }
    >
      {entrada ? (
        <ArrowUpCircle size={13} />
      ) : (
        <ArrowDownCircle size={13} />
      )}

      {entrada ? "Entrada" : "Saída"}
    </span>
  );
}

function formatarStatus(
  status: StatusCaixa
) {
  const mapa: Record<
    StatusCaixa,
    string
  > = {
    ABERTO: "Aberto",
    FECHADO: "Fechado",
    INATIVO: "Inativo",
  };

  return mapa[status];
}

function formatarOrigem(
  origem: OrigemMovimentacaoCaixa
) {
  const mapa: Record<
    OrigemMovimentacaoCaixa,
    string
  > = {
    MANUAL: "Manual",
    CONTA_PAGAR: "Conta a pagar",
    CONTA_RECEBER: "Conta a receber",
    VENDA: "Venda",
    AJUSTE: "Ajuste",
    OUTRA: "Outra",
  };

  return mapa[origem];
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

function formatarDataHora(valor: string) {
  return new Date(valor).toLocaleString(
    "pt-BR"
  );
}
