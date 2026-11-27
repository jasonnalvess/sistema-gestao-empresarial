"use client";

import { useQuery } from "@tanstack/react-query";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { AcessoNegado } from "@/components/common/AcessoNegado";
import { useAuth } from "@/contexts/AuthContext";
import { empresasQueryKeys } from "@/lib/empresas-query-keys";
import {
  formatarCnpj,
  formatarDataUtc,
  situacaoComercialEmpresa,
} from "@/lib/empresas-utils";

import { CrudCard } from "@/components/crud/CrudCard";
import { CrudEmpty } from "@/components/crud/CrudEmpty";
import { CrudLoading } from "@/components/crud/CrudLoading";
import { CrudStatusBadge } from "@/components/crud/CrudStatusBadge";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { listarEmpresas } from "@/services/empresas.service";
import { NovaEmpresaModal } from "@/components/empresas/NovaEmpresaModal";
import { EditarEmpresaModal } from "@/components/empresas/EditarEmpresaModal";
import { RegularizarEmpresaModal } from "@/components/empresas/RegularizarEmpresaModal";
import { AlterarStatusEmpresaButton } from "@/components/empresas/AlterarStatusEmpresaButton";

export default function EmpresasPage() {
  const { usuario } = useAuth();
  const ehSuperAdmin = usuario?.tipo === "SUPER_ADMIN";

  const { data: empresas, isLoading, error } = useQuery({
    queryKey: empresasQueryKeys.todas(),
    queryFn: listarEmpresas,
    enabled: ehSuperAdmin,
  });

  if (!ehSuperAdmin) {
    return (
      <AppLayout>
        <AcessoNegado />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-w-0 space-y-6">
        <PageHeader
          title="Empresas"
          description="Gerencie as empresas do sistema: cadastro, status administrativo e validade comercial."
          actions={<NovaEmpresaModal />}
        />

        <CrudCard>
          {error && (
            <ErrorMessage message="Erro ao carregar empresas." />
          )}

          {isLoading ? (
            <CrudLoading />
          ) : (
            <div className="min-w-0 max-w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Validade comercial</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {(empresas ?? []).map((empresa) => {
                    const situacao = situacaoComercialEmpresa(empresa);
                    return (
                      <TableRow key={empresa.id}>
                        <TableCell className="font-medium">
                          {empresa.nome}
                        </TableCell>

                        <TableCell>{formatarCnpj(empresa.cnpj)}</TableCell>

                        <TableCell>
                          <CrudStatusBadge ativo={empresa.ativa} />
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col">
                            <span
                              className={
                                situacao.bloqueada
                                  ? "text-sm font-medium text-red-600"
                                  : "text-sm font-medium text-slate-700"
                              }
                            >
                              {situacao.rotulo}
                            </span>
                            {empresa.validadeComercialFim && (
                              <span className="text-xs text-slate-500">
                                Vigência até {formatarDataUtc(empresa.validadeComercialFim)} (UTC)
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex min-w-max justify-end gap-2">
                            <EditarEmpresaModal empresa={empresa} />
                            <RegularizarEmpresaModal empresa={empresa} />
                            <AlterarStatusEmpresaButton empresa={empresa} />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {!error && (empresas ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <CrudEmpty message="Nenhuma empresa cadastrada." />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CrudCard>
      </div>
    </AppLayout>
  );
}
