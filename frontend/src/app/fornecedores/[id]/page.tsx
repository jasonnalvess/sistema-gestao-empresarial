"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { CrudCard } from "@/components/crud/CrudCard";
import { CrudLoading } from "@/components/crud/CrudLoading";
import { CrudStatusBadge } from "@/components/crud/CrudStatusBadge";
import { Button } from "@/components/ui/button";

import { FornecedorHistoricoCard } from "@/components/fornecedores/FornecedorHistoricoCard";
import { EditarFornecedorModal } from "@/components/fornecedores/EditarFornecedorModal";
import { AlterarStatusFornecedorButton } from "@/components/fornecedores/AlterarStatusFornecedorButton";

import {
  buscarFornecedorPorId,
  Fornecedor,
} from "@/services/fornecedores.service";

export default function FornecedorDetalhesPage() {
  const params = useParams();
  const id = String(params.id);

  const {
    data: fornecedor,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["fornecedor", id],
    queryFn: () => buscarFornecedorPorId(id),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <AppLayout>
        <CrudLoading />
      </AppLayout>
    );
  }

  if (error || !fornecedor) {
    return (
      <AppLayout>
        <div className="rounded-lg bg-red-50 p-4 text-red-700">
          Fornecedor não encontrado.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title={
            fornecedor.nomeFantasia ||
            fornecedor.razaoSocial
          }
          description="Ficha detalhada do fornecedor."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link href="/fornecedores">
                  <ArrowLeft
                    size={16}
                    className="mr-2"
                  />
                  Voltar
                </Link>
              </Button>

              <EditarFornecedorModal
                fornecedor={fornecedor}
              />

              <AlterarStatusFornecedorButton
                fornecedor={fornecedor}
              />
            </div>
          }
        />

        <CrudCard>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <Campo
              label="Razão social"
              valor={fornecedor.razaoSocial}
            />
            <Campo
              label="Nome fantasia"
              valor={fornecedor.nomeFantasia}
            />
            <Campo
              label="Documento"
              valor={formatarDocumento(
                fornecedor.documento
              )}
            />
            <Campo
              label="Inscrição estadual"
              valor={fornecedor.inscricaoEstadual}
            />
            <Campo
              label="Inscrição municipal"
              valor={fornecedor.inscricaoMunicipal}
            />
            <Campo
              label="Contato"
              valor={fornecedor.contato}
            />
            <Campo
              label="E-mail"
              valor={fornecedor.email}
            />
            <Campo
              label="Telefone"
              valor={fornecedor.telefone}
            />
            <Campo
              label="Celular"
              valor={fornecedor.celular}
            />
            <Campo
              label="CEP"
              valor={fornecedor.cep}
            />
            <Campo
              label="Endereço"
              valor={montarEndereco(fornecedor)}
            />
            <Campo
              label="Cidade/UF"
              valor={
                fornecedor.cidade || fornecedor.estado
                  ? `${fornecedor.cidade || "-"} / ${
                      fornecedor.estado || "-"
                    }`
                  : null
              }
            />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Status
              </p>

              <div className="mt-1">
                <CrudStatusBadge
                  ativo={fornecedor.ativo}
                />
              </div>
            </div>
          </div>

          {fornecedor.observacao && (
            <div className="mt-6 border-t pt-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Observação
              </p>

              <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                {fornecedor.observacao}
              </p>
            </div>
          )}
        </CrudCard>

        <CrudCard>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Histórico do fornecedor
          </h2>

          <FornecedorHistoricoCard
            fornecedorId={fornecedor.id}
          />
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

function formatarDocumento(documento: string) {
  if (documento.length === 14) {
    return documento.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      "$1.$2.$3/$4-$5"
    );
  }

  if (documento.length === 11) {
    return documento.replace(
      /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
      "$1.$2.$3-$4"
    );
  }

  return documento;
}

function montarEndereco(fornecedor: Fornecedor) {
  const partes = [
    fornecedor.endereco,
    fornecedor.numero,
    fornecedor.complemento,
    fornecedor.bairro,
  ].filter(Boolean);

  return partes.length ? partes.join(", ") : null;
}
