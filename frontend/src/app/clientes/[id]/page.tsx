"use client";

import { isAxiosError } from "axios";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Mail,
  Phone,
  UserRound,
  CalendarDays,
  CalendarCheck,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { AcessoNegado } from "@/components/common/AcessoNegado";
import { PageHeader } from "@/components/common/PageHeader";
import { CrudCard } from "@/components/crud/CrudCard";
import { CrudLoading } from "@/components/crud/CrudLoading";
import { CrudEmpty } from "@/components/crud/CrudEmpty";
import { AgendaStatusBadge } from "@/components/agenda/AgendaStatusBadge";
import { StatsCard } from "@/components/common/StatsCard";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { EmpresaNaoSelecionada } from "@/components/common/EmpresaNaoSelecionada";
import { PERMISSAO_CLIENTES_VISUALIZAR } from "@/lib/auth";

import { buscarClientePorId } from "@/services/clientes.service";
import { ClienteTimeline } from "@/components/clientes/ClienteTimeline";
import { ClienteQuickActions } from "@/components/clientes/ClienteQuickActions";
import { ClienteHistoricoCard } from "@/components/clientes/ClienteHistoricoCard";
import { ClienteOrdensServicoCard } from "@/components/clientes/ClienteOrdensServicoCard";

export default function ClienteDetalhesPage() {
  const params = useParams();
  const clienteId = params.id as string;
  const { temPermissao } = useAuth();
  const { empresaSelecionadaId, empresaEfetivaId, carregando, requerSelecao } =
    useEmpresaSelecionada();
  const possuiEmpresaEfetiva = !requerSelecao || Boolean(empresaSelecionadaId);
  const podeVisualizarClientes = temPermissao(PERMISSAO_CLIENTES_VISUALIZAR);

  const {
    data: cliente,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["cliente", empresaEfetivaId, clienteId],
    queryFn: () => buscarClientePorId(clienteId),
    enabled:
      podeVisualizarClientes &&
      possuiEmpresaEfetiva &&
      !carregando &&
      Boolean(clienteId),
  });

  if (!podeVisualizarClientes) {
    return (
      <AppLayout>
        <AcessoNegado />
      </AppLayout>
    );
  }

  if (carregando)
    return (
      <AppLayout>
        <CrudLoading />
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

  if (error || !cliente) {
    return (
      <AppLayout>
        <CrudEmpty
          message={
            error && !(isAxiosError(error) && error.response?.status === 404)
              ? "Erro ao carregar cliente."
              : "Cliente não encontrado."
          }
        />
      </AppLayout>
    );
  }

  const atendimentos = cliente.agendaEventos ?? [];

  const totalAtendimentos = atendimentos.length;
  const agendados = atendimentos.filter((a) => a.status === "AGENDADO").length;
  const emAndamento = atendimentos.filter(
    (a) => a.status === "EM_ANDAMENTO",
  ).length;
  const concluidos = atendimentos.filter(
    (a) => a.status === "CONCLUIDO",
  ).length;
  const cancelados = atendimentos.filter(
    (a) => a.status === "CANCELADO",
  ).length;

  return (
    <AppLayout>
      <div className="min-w-0 space-y-6">
        <PageHeader
          title={cliente.nome}
          description="Ficha completa do cliente."
          actions={<ClienteQuickActions cliente={cliente} />}
        />

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatsCard
            title="Atendimentos"
            value={totalAtendimentos}
            icon={<CalendarDays aria-hidden="true" />}
          />
          <StatsCard
            title="Agendados"
            value={agendados}
            icon={<CalendarCheck aria-hidden="true" />}
          />
          <StatsCard
            title="Em andamento"
            value={emAndamento}
            icon={<Clock aria-hidden="true" />}
          />
          <StatsCard
            title="Concluídos"
            value={concluidos}
            icon={<CheckCircle aria-hidden="true" />}
          />
          <StatsCard
            title="Cancelados"
            value={cancelados}
            icon={<XCircle aria-hidden="true" />}
          />
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3">
          <CrudCard>
            <div className="flex items-center gap-3">
              <UserRound
                className="shrink-0 text-blue-600"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-sm text-slate-500">Tipo</p>
                <p className="font-semibold text-slate-900">{cliente.tipo}</p>
              </div>
            </div>
          </CrudCard>

          <CrudCard>
            <div className="flex items-center gap-3">
              <Phone className="shrink-0 text-green-600" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm text-slate-500">Contato</p>
                <p className="break-words font-semibold text-slate-900">
                  {cliente.celular || cliente.telefone || "-"}
                </p>
              </div>
            </div>
          </CrudCard>

          <CrudCard>
            <div className="flex items-center gap-3">
              <Mail className="shrink-0 text-purple-600" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm text-slate-500">E-mail</p>
                <p className="break-all font-semibold text-slate-900">
                  {cliente.email || "-"}
                </p>
              </div>
            </div>
          </CrudCard>
        </div>

        <CrudCard>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Dados cadastrais
          </h2>

          <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-slate-500">Documento</p>
              <p className="break-words font-medium text-slate-900">
                {cliente.documento || "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Endereço</p>
              <p className="break-words font-medium text-slate-900">
                {cliente.endereco || "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Cidade/UF</p>
              <p className="break-words font-medium text-slate-900">
                {cliente.cidade || "-"}
                {cliente.estado ? `/${cliente.estado}` : ""}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">CEP</p>
              <p className="break-words font-medium text-slate-900">
                {cliente.cep || "-"}
              </p>
            </div>
          </div>

          {cliente.observacao && (
            <div className="mt-4">
              <p className="text-sm text-slate-500">Observação</p>
              <p className="break-words font-medium text-slate-900">
                {cliente.observacao}
              </p>
            </div>
          )}
        </CrudCard>

        <CrudCard>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Últimos atendimentos
          </h2>

          {atendimentos.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhum atendimento vinculado a este cliente.
            </p>
          ) : (
            <div className="space-y-3">
              {atendimentos.map((atendimento) => (
                <div
                  key={atendimento.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {atendimento.titulo}
                      </p>

                      <p className="text-sm text-slate-500">
                        {new Date(atendimento.dataInicio).toLocaleString(
                          "pt-BR",
                        )}
                      </p>
                    </div>

                    <AgendaStatusBadge status={atendimento.status} />
                  </div>

                  {atendimento.descricao && (
                    <p className="mt-2 text-sm text-slate-600">
                      {atendimento.descricao}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CrudCard>

        <CrudCard>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Timeline do cliente
          </h2>

          <ClienteTimeline atendimentos={atendimentos} />
        </CrudCard>

        <CrudCard>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Ordens de Serviço
          </h2>

          <ClienteOrdensServicoCard ordens={cliente.ordensServico} />
        </CrudCard>

        <CrudCard>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Histórico geral do cliente
          </h2>

          <ClienteHistoricoCard clienteId={cliente.id} />
        </CrudCard>
      </div>
    </AppLayout>
  );
}
