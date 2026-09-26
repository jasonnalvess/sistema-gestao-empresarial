"use client";

import Link from "next/link";
import { isAxiosError } from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Blocks } from "lucide-react";
import { useParams } from "next/navigation";

import { CrmInteracoes } from "@/components/crm/CrmInteracoes";
import { CrmCriarEVincularVendaDialog } from "@/components/crm/CrmCriarEVincularVendaDialog";
import { CrmDesvincularVendaDialog } from "@/components/crm/CrmDesvincularVendaDialog";
import { CrmVincularVendaDialog } from "@/components/crm/CrmVincularVendaDialog";
import { CrmMovimentarOportunidadeDialog } from "@/components/crm/CrmMovimentarOportunidadeDialog";
import { CrmOportunidadeDialog } from "@/components/crm/CrmOportunidadeDialog";
import { AcessoNegado } from "@/components/common/AcessoNegado";
import { EmpresaNaoSelecionada } from "@/components/common/EmpresaNaoSelecionada";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { PageHeader } from "@/components/common/PageHeader";
import { CrudCard } from "@/components/crud/CrudCard";
import { CrudEmpty } from "@/components/crud/CrudEmpty";
import { CrudLoading } from "@/components/crud/CrudLoading";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import {
  PERMISSAO_AGENDA_CRIAR,
  PERMISSAO_CRM_INTERACOES_CRIAR,
  PERMISSAO_CRM_INTERACOES_EDITAR,
  PERMISSAO_CRM_OPORTUNIDADES_EDITAR,
  PERMISSAO_CRM_OPORTUNIDADES_MOVIMENTAR,
  PERMISSAO_VENDAS_CRIAR,
  PERMISSAO_VENDAS_VISUALIZAR,
  PERMISSAO_CRM_VISUALIZAR,
} from "@/lib/auth";
import { formatarDataCivil } from "@/lib/crm-data";
import { crmQueryKeys } from "@/lib/crm-query-keys";
import { empresaModulosQueryKeys } from "@/lib/empresa-modulos-query-keys";
import {
  buscarCrmOportunidadePorId,
  listarCrmResponsaveis,
} from "@/services/crm.service";
import { listarModulosAtivosDaEmpresa } from "@/services/empresa-modulos.service";
import { buscarVenda } from "@/services/vendas.service";
import { vendasQueryKeys } from "@/lib/vendas-query-keys";

function formatarMoeda(valor: string | null) {
  if (!valor) return "-";
  const numero = Number(valor);
  return Number.isNaN(numero)
    ? valor
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(numero);
}

function formatarDataFechamento(valor: string | null) {
  if (!valor) return "-";
  const data = new Date(valor);
  return Number.isNaN(data.getTime())
    ? valor
    : data.toLocaleDateString("pt-BR");
}

function Campo({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="min-w-0">
      <p className="text-sm text-slate-500">{titulo}</p>
      <p className="break-words font-medium text-slate-900">{valor}</p>
    </div>
  );
}

export default function CrmOportunidadeDetalhePage() {
  const params = useParams();
  const oportunidadeId = typeof params.id === "string" ? params.id : "";
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaSelecionadaId, empresaEfetivaId, carregando, requerSelecao } =
    useEmpresaSelecionada();
  const possuiEmpresaEfetiva = !requerSelecao || Boolean(empresaSelecionadaId);
  const podeVisualizar = temPermissao(PERMISSAO_CRM_VISUALIZAR);
  const podeEditar = temPermissao(PERMISSAO_CRM_OPORTUNIDADES_EDITAR);
  const podeCriarInteracao = temPermissao(PERMISSAO_CRM_INTERACOES_CRIAR);
  const podeEditarInteracao = temPermissao(PERMISSAO_CRM_INTERACOES_EDITAR);
  const podeAgendar = temPermissao(PERMISSAO_AGENDA_CRIAR);
  const podeMovimentar = temPermissao(PERMISSAO_CRM_OPORTUNIDADES_MOVIMENTAR);
  const podeVisualizarVendas = temPermissao(PERMISSAO_VENDAS_VISUALIZAR);
  const podeCriarVendas = temPermissao(PERMISSAO_VENDAS_CRIAR);
  const consultaBaseHabilitada =
    !carregando &&
    possuiEmpresaEfetiva &&
    podeVisualizar &&
    Boolean(empresaEfetivaId);

  const modulosQuery = useQuery({
    queryKey: empresaModulosQueryKeys.ativos(empresaEfetivaId ?? ""),
    queryFn: listarModulosAtivosDaEmpresa,
    enabled: consultaBaseHabilitada,
  });
  const crmAtivo = modulosQuery.data?.modulos.some(
    (modulo) => modulo.chave === "crm",
  );
  const consultasCrmHabilitadas = consultaBaseHabilitada && crmAtivo === true;
  const oportunidadeQuery = useQuery({
    queryKey: crmQueryKeys.detalheOportunidade(
      empresaEfetivaId ?? "",
      oportunidadeId,
    ),
    queryFn: () => buscarCrmOportunidadePorId(oportunidadeId),
    enabled: consultasCrmHabilitadas && Boolean(oportunidadeId),
  });
  const responsaveisQuery = useQuery({
    queryKey: crmQueryKeys.responsaveis(empresaEfetivaId ?? ""),
    queryFn: listarCrmResponsaveis,
    enabled:
      consultasCrmHabilitadas &&
      (podeEditar || podeCriarInteracao || podeEditarInteracao),
  });

  const vendaId = oportunidadeQuery.data?.vendaId ?? "";
  const vendaQuery = useQuery({
    queryKey: vendasQueryKeys.detalhe(empresaEfetivaId ?? "", vendaId),
    queryFn: () => buscarVenda(vendaId),
    enabled: consultasCrmHabilitadas && Boolean(vendaId) && podeVisualizarVendas,
  });

  if (carregando || modulosQuery.isLoading)
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
  if (modulosQuery.error)
    return (
      <AppLayout>
        <ErrorMessage message="Não foi possível verificar os módulos ativos da empresa." />
      </AppLayout>
    );
  if (!crmAtivo)
    return (
      <AppLayout>
        <CrudCard>
          <div className="flex min-h-48 flex-col items-center justify-center px-4 py-8 text-center">
            <Blocks aria-hidden="true" className="text-slate-400" size={36} />
            <h1 className="mt-4 text-lg font-semibold text-slate-900">
              Módulo CRM indisponível
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              O CRM não está ativo para a empresa selecionada.
            </p>
          </div>
        </CrudCard>
      </AppLayout>
    );
  if (oportunidadeQuery.isLoading)
    return (
      <AppLayout>
        <CrudLoading />
      </AppLayout>
    );
  if (oportunidadeQuery.error || !oportunidadeQuery.data) {
    const naoEncontrada =
      isAxiosError(oportunidadeQuery.error) &&
      oportunidadeQuery.error.response?.status === 404;
    return (
      <AppLayout>
        {naoEncontrada ? (
          <CrudEmpty message="Oportunidade não encontrada." />
        ) : (
          <ErrorMessage message="Não foi possível carregar a oportunidade." />
        )}
      </AppLayout>
    );
  }

  const oportunidade = oportunidadeQuery.data;
  const podeVincularVenda = podeEditar && podeVisualizarVendas;
  const podeCriarEVincularVenda = podeVincularVenda && podeCriarVendas;
  return (
    <AppLayout>
      <div className="min-w-0 space-y-6">
        <PageHeader
          title={oportunidade.titulo}
          description="Detalhes da oportunidade comercial."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/crm">
                  <ArrowLeft aria-hidden="true" />
                  Voltar ao CRM
                </Link>
              </Button>
              {podeEditar && empresaEfetivaId && (
                <CrmOportunidadeDialog
                  empresaId={empresaEfetivaId}
                  responsaveis={responsaveisQuery.data ?? []}
                  oportunidade={oportunidade}
                  onConflict={() =>
                    queryClient.invalidateQueries({
                      queryKey: crmQueryKeys.detalheOportunidade(
                        empresaEfetivaId,
                        oportunidade.id,
                      ),
                    })
                  }
                />
              )}
              {podeMovimentar && empresaEfetivaId && (
                <CrmMovimentarOportunidadeDialog
                  empresaId={empresaEfetivaId}
                  oportunidade={oportunidade}
                />
              )}
              {empresaEfetivaId && oportunidade.etapa.tipo === "GANHA" && !oportunidade.vendaId && podeCriarEVincularVenda && (
                <CrmCriarEVincularVendaDialog empresaId={empresaEfetivaId} oportunidade={oportunidade} />
              )}
              {empresaEfetivaId && oportunidade.etapa.tipo === "GANHA" && !oportunidade.vendaId && podeVincularVenda && (
                <CrmVincularVendaDialog empresaId={empresaEfetivaId} oportunidade={oportunidade} />
              )}
              {oportunidade.vendaId && podeVisualizarVendas && (
                <Button asChild variant="outline"><Link href={"/vendas/" + oportunidade.vendaId}>Abrir venda</Link></Button>
              )}
              {empresaEfetivaId && oportunidade.vendaId && podeEditar && (
                <CrmDesvincularVendaDialog empresaId={empresaEfetivaId} oportunidade={oportunidade} />
              )}
            </div>
          }
        />
        {responsaveisQuery.error && podeEditar && (
          <ErrorMessage message="Não foi possível carregar os responsáveis CRM para edição." />
        )}
        <CrudCard>
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Campo titulo="Cliente" valor={oportunidade.cliente.nome} />
            <Campo titulo="Etapa" valor={oportunidade.etapa.nome} />
            <Campo titulo="Tipo da etapa" valor={oportunidade.etapa.tipo} />
            <Campo titulo="Responsável" valor={oportunidade.responsavel.nome} />
            <Campo
              titulo="Valor estimado"
              valor={formatarMoeda(oportunidade.valorEstimado)}
            />
            <Campo
              titulo="Previsão de fechamento"
              valor={formatarDataCivil(oportunidade.previsaoFechamento)}
            />
            <Campo
              titulo="Data de fechamento"
              valor={formatarDataFechamento(oportunidade.dataFechamento)}
            />
            <Campo
              titulo="Motivo de perda"
              valor={oportunidade.motivoPerda ?? "-"}
            />
            <Campo
              titulo="Venda vinculada"
              valor={
                !oportunidade.vendaId
                  ? "Não"
                  : vendaQuery.isLoading
                    ? "Carregando venda..."
                    : vendaQuery.data
                      ? "Venda #" + String(vendaQuery.data.numero).padStart(5, "0") + " — " + vendaQuery.data.status + " — " + formatarMoeda(vendaQuery.data.valorTotal)
                      : "Venda vinculada"
              }
            />
          </div>
          {oportunidade.descricao && (
            <div className="mt-5 border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-500">Descrição</p>
              <p className="mt-1 break-words text-slate-900">
                {oportunidade.descricao}
              </p>
            </div>
          )}
        </CrudCard>
        <CrmInteracoes
          empresaId={empresaEfetivaId!}
          oportunidade={oportunidade}
          responsaveis={responsaveisQuery.data ?? []}
          podeCriar={podeCriarInteracao}
          podeEditar={podeEditarInteracao}
          podeAgendar={podeAgendar}
        />
      </div>
    </AppLayout>
  );
}
