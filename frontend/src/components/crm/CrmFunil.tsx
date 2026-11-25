"use client";

import Link from "next/link";
import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatarDataCivil } from "@/lib/crm-data";
import type { CrmEtapa, CrmOportunidade } from "@/services/crm.service";

type Props = {
  etapas: CrmEtapa[];
  oportunidades: CrmOportunidade[];
};

type EtapaExibida = Pick<CrmEtapa, "id" | "nome" | "tipo" | "ativo">;

function formatarMoeda(valor: string | null) {
  if (!valor) return null;
  const numero = Number(valor);
  if (Number.isNaN(numero)) return valor;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numero);
}

function formatarData(valor: string | null) {
  return valor ? formatarDataCivil(valor) : null;
}

function OportunidadeCard({ oportunidade }: { oportunidade: CrmOportunidade }) {
  const valor = formatarMoeda(oportunidade.valorEstimado);
  const previsao = formatarData(oportunidade.previsaoFechamento);

  return (
    <Link
      href={"/crm/oportunidades/" + oportunidade.id}
      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      aria-label={"Ver detalhes da oportunidade " + oportunidade.titulo}
    >
      <article className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50">
        <h3 className="break-words text-sm font-semibold text-slate-900">
          {oportunidade.titulo}
        </h3>
        <p className="mt-1 break-words text-sm text-slate-600">
          {oportunidade.cliente.nome}
        </p>
        <dl className="mt-3 space-y-1 text-xs text-slate-600">
          <div className="flex min-w-0 justify-between gap-3">
            <dt>Responsável</dt>
            <dd className="min-w-0 truncate text-right font-medium text-slate-800">
              {oportunidade.responsavel.nome}
            </dd>
          </div>
          {valor && (
            <div className="flex min-w-0 justify-between gap-3">
              <dt>Estimativa</dt>
              <dd className="font-medium text-slate-800">{valor}</dd>
            </div>
          )}
          {previsao && (
            <div className="flex min-w-0 justify-between gap-3">
              <dt>Previsão</dt>
              <dd className="font-medium text-slate-800">{previsao}</dd>
            </div>
          )}
        </dl>
      </article>
    </Link>
  );
}

function EtapaColuna({
  etapa,
  oportunidades,
}: {
  etapa: EtapaExibida;
  oportunidades: CrmOportunidade[];
}) {
  return (
    <section className="flex min-h-52 min-w-72 flex-col rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="min-w-0">
          <h2 className="break-words text-sm font-semibold text-slate-900">
            {etapa.nome}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {etapa.tipo} · {oportunidades.length} oportunidade
            {oportunidades.length === 1 ? "" : "s"}
          </p>
        </div>
        {!etapa.ativo && (
          <span className="shrink-0 rounded-full bg-slate-200 px-2 py-1 text-xs font-medium text-slate-600">
            Inativa
          </span>
        )}
      </div>
      <div className="mt-3 space-y-3">
        {oportunidades.map((oportunidade) => (
          <OportunidadeCard key={oportunidade.id} oportunidade={oportunidade} />
        ))}
        {!oportunidades.length && (
          <p className="py-5 text-center text-xs text-slate-500">
            Nenhuma oportunidade nesta etapa.
          </p>
        )}
      </div>
    </section>
  );
}

function CrmFunilMobile({
  colunas,
  oportunidadesDaEtapa,
}: {
  colunas: EtapaExibida[];
  oportunidadesDaEtapa: (etapaId: string) => CrmOportunidade[];
}) {
  const [etapaSelecionada, setEtapaSelecionada] = useState(
    () => colunas[0]?.id ?? "",
  );
  const etapaSelecionadaValida = colunas.some(
    (etapa) => etapa.id === etapaSelecionada,
  )
    ? etapaSelecionada
    : (colunas[0]?.id ?? "");

  return (
    <Tabs
      value={etapaSelecionadaValida}
      onValueChange={setEtapaSelecionada}
      className="lg:hidden"
    >
      <TabsList aria-label="Etapas do funil" className="w-full">
        {colunas.map((etapa) => (
          <TabsTrigger key={etapa.id} value={etapa.id}>
            {etapa.nome}
          </TabsTrigger>
        ))}
      </TabsList>
      {colunas.map((etapa) => (
        <TabsContent key={etapa.id} value={etapa.id} className="pt-3">
          <EtapaColuna
            etapa={etapa}
            oportunidades={oportunidadesDaEtapa(etapa.id)}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}

export function CrmFunil({ etapas, oportunidades }: Props) {
  const idsEtapas = new Set(etapas.map((etapa) => etapa.id));
  const oportunidadesSemEtapa = oportunidades.filter(
    (oportunidade) => !idsEtapas.has(oportunidade.etapaId),
  );
  const colunas: EtapaExibida[] = [
    ...etapas,
    ...(oportunidadesSemEtapa.length
      ? [
          {
            id: "sem-etapa-listada",
            nome: "Etapa não listada",
            tipo: "ABERTA" as const,
            ativo: false,
          },
        ]
      : []),
  ];
  const oportunidadesDaEtapa = (etapaId: string) =>
    etapaId === "sem-etapa-listada"
      ? oportunidadesSemEtapa
      : oportunidades.filter(
          (oportunidade) => oportunidade.etapaId === etapaId,
        );

  if (!colunas.length) return null;

  return (
    <>
      <div className="hidden overflow-x-auto pb-2 lg:block">
        <div className="flex min-w-max gap-4">
          {colunas.map((etapa) => (
            <EtapaColuna
              key={etapa.id}
              etapa={etapa}
              oportunidades={oportunidadesDaEtapa(etapa.id)}
            />
          ))}
        </div>
      </div>

      <CrmFunilMobile
        colunas={colunas}
        oportunidadesDaEtapa={oportunidadesDaEtapa}
      />
    </>
  );
}
