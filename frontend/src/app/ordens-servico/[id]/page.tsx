"use client";

import { isAxiosError } from "axios";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { CalendarDays, UserRound, Wrench, AlertTriangle } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { AcessoNegado } from "@/components/common/AcessoNegado";
import { EmpresaNaoSelecionada } from "@/components/common/EmpresaNaoSelecionada";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import {
  PERMISSAO_ORDENS_SERVICO_STATUS_ALTERAR,
  PERMISSAO_ORDENS_SERVICO_VISUALIZAR,
} from "@/lib/auth";
import { ordensServicoQueryKeys } from "@/lib/ordens-servico-query-keys";
import { PageHeader } from "@/components/common/PageHeader";
import { CrudCard } from "@/components/crud/CrudCard";
import { CrudLoading } from "@/components/crud/CrudLoading";
import { CrudEmpty } from "@/components/crud/CrudEmpty";
import { Button } from "@/components/ui/button";
import { OrdemServicoHistoricoCard } from "@/components/ordens-servico/OrdemServicoHistoricoCard";
import { AlterarStatusOrdemServicoCard } from "@/components/ordens-servico/AlterarStatusOrdemServicoCard";
import { OrdemServicoStatusBadge } from "@/components/ordens-servico/OrdemServicoStatusBadge";
import { OrdemServicoPrioridadeBadge } from "@/components/ordens-servico/OrdemServicoPrioridadeBadge";
import { GerarContaReceberModal } from "@/components/ordens-servico/GerarContaReceberModal";

import { buscarOrdemServicoPorId } from "@/services/ordens-servico.service";

export default function OrdemServicoDetalhesPage() {
  const params = useParams();
  const ordemId = params.id as string;
  const { temPermissao } = useAuth();
  const { empresaSelecionadaId, empresaEfetivaId, carregando, requerSelecao } =
    useEmpresaSelecionada();
  const possuiEmpresa = !requerSelecao || Boolean(empresaSelecionadaId);
  const podeVisualizar = temPermissao(PERMISSAO_ORDENS_SERVICO_VISUALIZAR);
  const podeAlterarStatus = temPermissao(
    PERMISSAO_ORDENS_SERVICO_STATUS_ALTERAR,
  );

  const {
    data: ordem,
    isLoading,
    error,
  } = useQuery({
    queryKey: ordensServicoQueryKeys.detalhe(empresaEfetivaId ?? "", ordemId),
    queryFn: () => buscarOrdemServicoPorId(ordemId),
    enabled:
      podeVisualizar &&
      possuiEmpresa &&
      !carregando &&
      Boolean(empresaEfetivaId) &&
      Boolean(ordemId),
  });

  if (carregando) {
    return (
      <AppLayout>
        <CrudLoading />
      </AppLayout>
    );
  }

  if (!podeVisualizar)
    return (
      <AppLayout>
        <AcessoNegado />
      </AppLayout>
    );
  if (!possuiEmpresa)
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

  if (error || !ordem) {
    return (
      <AppLayout>
        <CrudEmpty
          message={
            error && !(isAxiosError(error) && error.response?.status === 404)
              ? "Erro ao carregar ordem de serviço."
              : "Ordem de serviço não encontrada."
          }
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-w-0 space-y-6">
        <PageHeader
          title={`OS #${ordem.numero}`}
          description={ordem.titulo}
          actions={
            <div className="grid w-full min-w-0 grid-cols-1 gap-2 lg:flex lg:w-auto lg:flex-wrap [&>*]:w-full md:[&>*]:w-full lg:[&>*]:w-auto">
              <Button variant="outline" asChild>
                <Link href="/ordens-servico">Voltar</Link>
              </Button>

              {["CONCLUIDA", "CONCLUÍDA", "FINALIZADA", "FINALIZADO"].includes(
                ordem.status.toUpperCase(),
              ) && <GerarContaReceberModal ordem={ordem} />}
            </div>
          }
        />

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CrudCard>
            <Wrench className="mb-2 text-blue-600" size={22} />
            <p className="text-sm text-slate-500">Status</p>
            <OrdemServicoStatusBadge status={ordem.status} />
          </CrudCard>

          <CrudCard>
            <AlertTriangle className="mb-2 text-orange-600" size={22} />
            <p className="text-sm text-slate-500">Prioridade</p>
            <OrdemServicoPrioridadeBadge prioridade={ordem.prioridade} />
          </CrudCard>

          <CrudCard>
            <UserRound className="mb-2 text-green-600" size={22} />
            <p className="text-sm text-slate-500">Cliente</p>
            <p className="font-semibold text-slate-900">
              {ordem.cliente?.nome || "-"}
            </p>
          </CrudCard>

          <CrudCard>
            <CalendarDays className="mb-2 text-purple-600" size={22} />
            <p className="text-sm text-slate-500">Abertura</p>
            <p className="font-semibold text-slate-900">
              {new Date(ordem.dataAbertura).toLocaleString("pt-BR")}
            </p>
          </CrudCard>
        </div>

        <CrudCard>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Dados da OS
          </h2>

          <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-slate-500">Título</p>
              <p className="font-medium text-slate-900">{ordem.titulo}</p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Responsável</p>
              <p className="font-medium text-slate-900">
                {ordem.responsavel?.nome || "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Data prevista</p>
              <p className="font-medium text-slate-900">
                {ordem.dataPrevista
                  ? new Date(ordem.dataPrevista).toLocaleString("pt-BR")
                  : "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Conclusão</p>
              <p className="font-medium text-slate-900">
                {ordem.dataConclusao
                  ? new Date(ordem.dataConclusao).toLocaleString("pt-BR")
                  : "-"}
              </p>
            </div>
          </div>

          {ordem.descricao && (
            <div className="mt-4">
              <p className="text-sm text-slate-500">Descrição</p>
              <p className="font-medium text-slate-900">{ordem.descricao}</p>
            </div>
          )}

          {ordem.observacao && (
            <div className="mt-4">
              <p className="text-sm text-slate-500">Observação interna</p>
              <p className="font-medium text-slate-900">{ordem.observacao}</p>
            </div>
          )}
        </CrudCard>

        {podeAlterarStatus && (
          <CrudCard>
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Alterar status
            </h2>
            <AlterarStatusOrdemServicoCard ordem={ordem} />
          </CrudCard>
        )}

        <CrudCard>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Histórico da OS
          </h2>

          <OrdemServicoHistoricoCard ordemServicoId={ordem.id} />
        </CrudCard>
      </div>
    </AppLayout>
  );
}
