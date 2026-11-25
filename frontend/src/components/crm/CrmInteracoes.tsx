"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import Link from "next/link";

import { CrmInteracaoDialog } from "@/components/crm/CrmInteracaoDialog";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { CrudEmpty } from "@/components/crud/CrudEmpty";
import { CrudLoading } from "@/components/crud/CrudLoading";
import { CrudPagination } from "@/components/crud/CrudPagination";
import { Button } from "@/components/ui/button";
import { crmQueryKeys } from "@/lib/crm-query-keys";
import {
  listarClienteInteracoes,
  type CrmOportunidade,
  type CrmResponsavel,
  type TipoInteracaoCRM,
} from "@/services/crm.service";

type Props = {
  empresaId: string;
  oportunidade: CrmOportunidade;
  responsaveis: CrmResponsavel[];
  podeCriar: boolean;
  podeEditar: boolean;
  podeAgendar: boolean;
};

const tiposInteracao: Record<TipoInteracaoCRM, string> = {
  LIGACAO: "Ligação",
  EMAIL: "E-mail",
  MENSAGEM: "Mensagem",
  REUNIAO: "Reunião",
  VISITA: "Visita",
  NOTA: "Nota",
  OUTRO: "Outro",
};

const LIMITE_INTERACOES = 10;

function formatarDataHora(valor: string) {
  const data = new Date(valor);
  return Number.isNaN(data.getTime())
    ? valor
    : data.toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      });
}

export function CrmInteracoes({
  empresaId,
  oportunidade,
  responsaveis,
  podeCriar,
  podeEditar,
  podeAgendar,
}: Props) {
  const [pagina, setPagina] = useState(1);
  const origemRef = useRef(`${empresaId}:${oportunidade.id}`);

  useLayoutEffect(() => {
    const origem = `${empresaId}:${oportunidade.id}`;
    if (origemRef.current === origem) return;

    origemRef.current = origem;
    setPagina(1);
  }, [empresaId, oportunidade.id]);

  const filtros = {
    oportunidadeId: oportunidade.id,
    page: pagina,
    limit: LIMITE_INTERACOES,
  };
  const interacoesQuery = useQuery({
    queryKey: crmQueryKeys.listaInteracoes(empresaId, filtros),
    queryFn: () => listarClienteInteracoes(filtros),
    enabled: Boolean(empresaId && oportunidade.id),
  });
  const interacoes = interacoesQuery.data?.data ?? [];

  const totalPages = interacoesQuery.data?.meta.totalPages;
  const paginaResposta = interacoesQuery.data?.meta.page;

  useEffect(() => {
    if (
      paginaResposta !== pagina ||
      typeof totalPages !== "number" ||
      !Number.isInteger(totalPages) ||
      totalPages < 0
    ) {
      return;
    }

    const paginaValida = Math.max(1, totalPages);
    if (pagina <= paginaValida) return;

    const origemDaResposta = empresaId + ":" + oportunidade.id;
    const timeoutId = window.setTimeout(() => {
      if (origemRef.current !== origemDaResposta) return;

      setPagina((paginaAtual) =>
        paginaAtual === pagina ? paginaValida : paginaAtual,
      );
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [empresaId, oportunidade.id, pagina, paginaResposta, totalPages]);

  return (
    <section className="space-y-4" aria-labelledby="interacoes-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            id="interacoes-title"
            className="text-lg font-semibold text-slate-900"
          >
            Interações
          </h2>
          <p className="text-sm text-slate-600">
            Registros de contatos comerciais desta oportunidade.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {podeAgendar && (
            <Button asChild variant="outline">
              <Link
                href={`/agenda?clienteId=${encodeURIComponent(oportunidade.clienteId)}`}
              >
                <CalendarDays aria-hidden="true" />
                Agendar próximo contato
              </Link>
            </Button>
          )}
          {podeCriar && (
            <CrmInteracaoDialog
              empresaId={empresaId}
              clienteId={oportunidade.clienteId}
              oportunidadeId={oportunidade.id}
              responsaveis={responsaveis}
            />
          )}
        </div>
      </div>

      {interacoesQuery.isLoading && <CrudLoading />}
      {interacoesQuery.error && (
        <ErrorMessage message="Não foi possível carregar as interações desta oportunidade." />
      )}
      {!interacoesQuery.isLoading &&
        !interacoesQuery.error &&
        !interacoes.length && (
          <CrudEmpty message="Nenhuma interação registrada para esta oportunidade." />
        )}
      {!interacoesQuery.isLoading &&
        !interacoesQuery.error &&
        interacoes.length > 0 && (
          <div className="space-y-3">
            {interacoes.map((interacao) => (
              <article
                key={interacao.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                        {tiposInteracao[interacao.tipo]}
                      </span>
                      <span className="text-sm text-slate-500">
                        {formatarDataHora(interacao.dataHora)}
                      </span>
                    </div>
                    {interacao.assunto && (
                      <h3 className="break-words font-medium text-slate-900">
                        {interacao.assunto}
                      </h3>
                    )}
                    <p className="whitespace-pre-wrap break-words text-sm text-slate-700">
                      {interacao.descricao}
                    </p>
                    <p className="text-sm text-slate-500">
                      Responsável: {interacao.responsavel.nome}
                    </p>
                    {interacao.agendaEventoId && (
                      <p className="text-sm text-slate-500">
                        Vinculada a evento da Agenda
                        {interacao.agendaEvento?.titulo
                          ? `: ${interacao.agendaEvento.titulo}`
                          : "."}
                      </p>
                    )}
                  </div>
                  {podeEditar && (
                    <CrmInteracaoDialog
                      empresaId={empresaId}
                      clienteId={oportunidade.clienteId}
                      oportunidadeId={oportunidade.id}
                      responsaveis={responsaveis}
                      interacao={interacao}
                    />
                  )}
                </div>
              </article>
            ))}
            {interacoesQuery.data &&
              interacoesQuery.data.meta.totalPages > 1 && (
                <CrudPagination
                  page={interacoesQuery.data.meta.page}
                  totalPages={interacoesQuery.data.meta.totalPages}
                  onPageChange={setPagina}
                />
              )}
          </div>
        )}
    </section>
  );
}
