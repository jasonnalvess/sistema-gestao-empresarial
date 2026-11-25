"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Blocks } from "lucide-react";

import { CrmFiltros } from "@/components/crm/CrmFiltros";
import { CrmFunil } from "@/components/crm/CrmFunil";
import { CrmGerenciarEtapas } from "@/components/crm/CrmGerenciarEtapas";
import { CrmOportunidadeDialog } from "@/components/crm/CrmOportunidadeDialog";
import { AcessoNegado } from "@/components/common/AcessoNegado";
import { EmpresaNaoSelecionada } from "@/components/common/EmpresaNaoSelecionada";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { PageHeader } from "@/components/common/PageHeader";
import { CrudCard } from "@/components/crud/CrudCard";
import { CrudEmpty } from "@/components/crud/CrudEmpty";
import { CrudLoading } from "@/components/crud/CrudLoading";
import { CrudPagination } from "@/components/crud/CrudPagination";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import {
  PERMISSAO_CRM_FUNIL_GERENCIAR,
  PERMISSAO_CRM_OPORTUNIDADES_CRIAR,
  PERMISSAO_CRM_VISUALIZAR,
} from "@/lib/auth";
import { crmQueryKeys } from "@/lib/crm-query-keys";
import { empresaModulosQueryKeys } from "@/lib/empresa-modulos-query-keys";
import {
  listarCrmEtapas,
  listarCrmOportunidades,
  listarCrmResponsaveis,
  type FiltrosCrmOportunidades,
  type TipoEtapaCRM,
} from "@/services/crm.service";
import { listarModulosAtivosDaEmpresa } from "@/services/empresa-modulos.service";

const LIMITE_FUNIL = 100;

export default function CrmPage() {
  const { temPermissao } = useAuth();
  const { empresaSelecionadaId, empresaEfetivaId, carregando, requerSelecao } =
    useEmpresaSelecionada();
  const [page, setPage] = useState(1);
  const [etapaId, setEtapaId] = useState<string>();
  const [responsavelId, setResponsavelId] = useState<string>();
  const [tipoEtapa, setTipoEtapa] = useState<TipoEtapaCRM>();
  const possuiEmpresaEfetiva = !requerSelecao || Boolean(empresaSelecionadaId);
  const podeVisualizar = temPermissao(PERMISSAO_CRM_VISUALIZAR);
  const podeGerenciarFunil = temPermissao(PERMISSAO_CRM_FUNIL_GERENCIAR);
  const podeCriarOportunidade = temPermissao(
    PERMISSAO_CRM_OPORTUNIDADES_CRIAR,
  );
  const consultaBaseHabilitada =
    !carregando &&
    possuiEmpresaEfetiva &&
    podeVisualizar &&
    Boolean(empresaEfetivaId);

  const {
    data: modulosAtivos,
    isLoading: carregandoModulos,
    error: erroModulos,
  } = useQuery({
    queryKey: empresaModulosQueryKeys.ativos(empresaEfetivaId ?? ""),
    queryFn: listarModulosAtivosDaEmpresa,
    enabled: consultaBaseHabilitada,
  });

  const crmAtivo = modulosAtivos?.modulos.some(
    (modulo) => modulo.chave === "crm",
  );
  const consultasCrmHabilitadas = consultaBaseHabilitada && crmAtivo === true;
  const filtrosOportunidades = useMemo<FiltrosCrmOportunidades>(
    () => ({
      page,
      limit: LIMITE_FUNIL,
      etapaId,
      responsavelId,
      tipoEtapa,
    }),
    [etapaId, page, responsavelId, tipoEtapa],
  );

  const etapasQuery = useQuery({
    queryKey: crmQueryKeys.listaEtapas(empresaEfetivaId ?? "", {
      page: 1,
      limit: LIMITE_FUNIL,
    }),
    queryFn: () => listarCrmEtapas({ page: 1, limit: LIMITE_FUNIL }),
    enabled: consultasCrmHabilitadas,
  });

  const oportunidadesQuery = useQuery({
    queryKey: crmQueryKeys.listaOportunidades(
      empresaEfetivaId ?? "",
      filtrosOportunidades,
    ),
    queryFn: () => listarCrmOportunidades(filtrosOportunidades),
    enabled: consultasCrmHabilitadas,
  });

  const responsaveisQuery = useQuery({
    queryKey: crmQueryKeys.responsaveis(empresaEfetivaId ?? ""),
    queryFn: listarCrmResponsaveis,
    enabled: consultasCrmHabilitadas,
  });

  const etapasAdministrativas = etapasQuery.data?.data;
  const oportunidades = oportunidadesQuery.data?.data ?? [];
  const metaOportunidades = oportunidadesQuery.data?.meta;
  const etapasFunil = useMemo(
    () =>
      (etapasAdministrativas ?? []).filter(
        (etapa) =>
          (!etapaId || etapa.id === etapaId) &&
          (!tipoEtapa || etapa.tipo === tipoEtapa),
      ),
    [etapaId, etapasAdministrativas, tipoEtapa],
  );

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

  if (carregandoModulos)
    return (
      <AppLayout>
        <CrudLoading />
      </AppLayout>
    );

  return (
    <AppLayout>
      <div className="min-w-0 space-y-6">
        <PageHeader
          title="CRM"
          description="Acompanhe oportunidades e o relacionamento comercial da empresa."
          actions={
            podeCriarOportunidade &&
            crmAtivo === true &&
            empresaEfetivaId ? (
              <CrmOportunidadeDialog
                empresaId={empresaEfetivaId}
                etapas={etapasAdministrativas ?? []}
                responsaveis={responsaveisQuery.data ?? []}
              />
            ) : undefined
          }
        />

        {erroModulos ? (
          <ErrorMessage message="Não foi possível verificar os módulos ativos da empresa." />
        ) : !crmAtivo ? (
          <CrudCard>
            <div className="flex min-h-48 min-w-0 flex-col items-center justify-center px-4 py-8 text-center">
              <Blocks aria-hidden="true" className="text-slate-400" size={36} />
              <h2 className="mt-4 text-lg font-semibold text-slate-900">
                Módulo CRM indisponível
              </h2>
              <p className="mt-2 max-w-md text-sm text-slate-600">
                O CRM não está ativo para a empresa selecionada.
              </p>
            </div>
          </CrudCard>
        ) : etapasQuery.isLoading || oportunidadesQuery.isLoading ? (
          <CrudLoading />
        ) : etapasQuery.error || oportunidadesQuery.error ? (
          <ErrorMessage message="Não foi possível carregar o funil CRM. Tente novamente." />
        ) : (
          <>
            <CrudCard>
              <CrmFiltros
                etapas={etapasAdministrativas ?? []}
                responsaveis={responsaveisQuery.data ?? []}
                etapaId={etapaId}
                responsavelId={responsavelId}
                tipoEtapa={tipoEtapa}
                disabled={responsaveisQuery.isLoading}
                onEtapaChange={(valor) => {
                  setPage(1);
                  setEtapaId(valor);
                }}
                onResponsavelChange={(valor) => {
                  setPage(1);
                  setResponsavelId(valor);
                }}
                onTipoChange={(valor) => {
                  setPage(1);
                  setTipoEtapa(valor);
                }}
              />
            </CrudCard>

            {responsaveisQuery.error && (
              <ErrorMessage message="Não foi possível carregar os responsáveis CRM para o filtro." />
            )}
            {(etapasQuery.data?.meta.total ?? 0) > LIMITE_FUNIL && (
              <ErrorMessage message="O funil exibe as primeiras 100 etapas. Refine a estrutura de etapas para visualizar todas." />
            )}

            {!etapasAdministrativas?.length ? (
              <CrudCard>
                <CrudEmpty message="Nenhuma etapa CRM foi cadastrada para esta empresa." />
              </CrudCard>
            ) : !etapasFunil.length ? (
              <CrudCard>
                <CrudEmpty message="Nenhuma etapa corresponde aos filtros aplicados." />
              </CrudCard>
            ) : (
              <>
                <CrudCard>
                  <CrmFunil etapas={etapasFunil} oportunidades={oportunidades} />
                </CrudCard>
                {oportunidades.length > 0 && metaOportunidades && (
                  <CrudPagination
                    page={metaOportunidades.page}
                    totalPages={metaOportunidades.totalPages}
                    onPageChange={setPage}
                  />
                )}
              </>
            )}

            {podeGerenciarFunil && empresaEfetivaId && (
              <CrmGerenciarEtapas
                empresaId={empresaEfetivaId}
                etapas={etapasAdministrativas ?? []}
              />
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
