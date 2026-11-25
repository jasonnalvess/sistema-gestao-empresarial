"use client";

import { useQuery } from "@tanstack/react-query";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { AcessoNegado } from "@/components/common/AcessoNegado";
import { EmpresaNaoSelecionada } from "@/components/common/EmpresaNaoSelecionada";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { modulosQueryKeys } from "@/lib/modulos-query-keys";
import { empresaModulosQueryKeys } from "@/lib/empresa-modulos-query-keys";

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

import { listarModulos } from "@/services/modulos.service";
import { listarModulosDaEmpresa } from "@/services/empresa-modulos.service";
import { AlterarStatusModuloCatalogoButton } from "@/components/modulos/AlterarStatusModuloCatalogoButton";
import { VincularModuloModal } from "@/components/modulos/VincularModuloModal";
import { AlterarStatusVinculoButton } from "@/components/modulos/AlterarStatusVinculoButton";

export default function ModulosPage() {
  const { usuario } = useAuth();
  const { empresaSelecionadaId, carregando, requerSelecao } =
    useEmpresaSelecionada();
  const possuiEmpresaEfetiva = !requerSelecao || Boolean(empresaSelecionadaId);

  const ehSuperAdmin = usuario?.tipo === "SUPER_ADMIN";
  const ehAdminEmpresa = usuario?.tipo === "ADMIN_EMPRESA";
  const podeAcessar = ehSuperAdmin || ehAdminEmpresa;

  // SUPER_ADMIN opera sobre a empresa selecionada no contexto;
  // ADMIN_EMPRESA lê exclusivamente os vínculos da própria empresa.
  const empresaContextoId = ehSuperAdmin
    ? empresaSelecionadaId
    : usuario?.empresaId ?? null;

  const {
    data: catalogo,
    isLoading: carregandoCatalogo,
    error: erroCatalogo,
  } = useQuery({
    queryKey: modulosQueryKeys.catalogo(),
    queryFn: listarModulos,
    enabled: podeAcessar,
  });

  const {
    data: vinculos,
    isLoading: carregandoVinculos,
    error: erroVinculos,
  } = useQuery({
    queryKey: empresaModulosQueryKeys.porEmpresa(empresaContextoId ?? ""),
    queryFn: () => listarModulosDaEmpresa(empresaContextoId as string),
    enabled: podeAcessar && Boolean(empresaContextoId),
  });

  if (!podeAcessar) {
    return (
      <AppLayout>
        <AcessoNegado />
      </AppLayout>
    );
  }

  if (carregando) {
    return (
      <AppLayout>
        <CrudLoading />
      </AppLayout>
    );
  }

  const catalogoLista = catalogo ?? [];
  const vinculosLista = vinculos ?? [];

  return (
    <AppLayout>
      <div className="min-w-0 space-y-6">
        <PageHeader
          title="Módulos"
          description="Catálogo global de módulos e vínculos de módulos da empresa."
        />

        <section className="min-w-0 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Catálogo global
          </h2>
          <p className="text-sm text-slate-600">
            Novos módulos são provisionados pelos seeds oficiais; aqui é
            possível apenas ativar ou desativar módulos já provisionados
            {ehSuperAdmin ? "" : " (somente leitura para o seu perfil)"}.
          </p>

          <CrudCard>
            {erroCatalogo && (
              <ErrorMessage message="Erro ao carregar o catálogo de módulos." />
            )}

            {carregandoCatalogo ? (
              <CrudLoading />
            ) : (
              <div className="min-w-0 max-w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Módulo</TableHead>
                      <TableHead>Chave</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Status</TableHead>
                      {ehSuperAdmin && (
                        <TableHead className="text-right">Ações</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {catalogoLista.map((modulo) => (
                      <TableRow key={modulo.id}>
                        <TableCell className="font-medium">
                          {modulo.nome}
                        </TableCell>

                        <TableCell className="font-mono text-xs">
                          {modulo.chave}
                        </TableCell>

                        <TableCell className="max-w-md">
                          {modulo.descricao || "—"}
                        </TableCell>

                        <TableCell>
                          <CrudStatusBadge ativo={modulo.ativo} />
                        </TableCell>

                        {ehSuperAdmin && (
                          <TableCell className="text-right">
                            <div className="flex min-w-max justify-end">
                              <AlterarStatusModuloCatalogoButton modulo={modulo} />
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}

                    {!erroCatalogo && catalogoLista.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={ehSuperAdmin ? 5 : 4}>
                          <CrudEmpty message="Nenhum módulo provisionado no catálogo." />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CrudCard>
        </section>

        <section className="min-w-0 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Módulos da empresa
          </h2>
          <p className="text-sm text-slate-600">
            {ehSuperAdmin
              ? "Vínculos de módulos da empresa selecionada no contexto."
              : "Vínculos de módulos da sua empresa (somente leitura)."}
          </p>

          <CrudCard>
            {ehSuperAdmin && !possuiEmpresaEfetiva ? (
              <EmpresaNaoSelecionada />
            ) : erroVinculos ? (
              <ErrorMessage message="Erro ao carregar os módulos da empresa." />
            ) : carregandoVinculos ? (
              <CrudLoading />
            ) : (
              <>
                {ehSuperAdmin && empresaContextoId && (
                  <div className="flex justify-end pb-4">
                    <VincularModuloModal
                      empresaId={empresaContextoId}
                      catalogo={catalogoLista}
                      vinculos={vinculosLista}
                    />
                  </div>
                )}

                <div className="min-w-0 max-w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Módulo</TableHead>
                        <TableHead>Status do catálogo</TableHead>
                        <TableHead>Vínculo</TableHead>
                        {ehSuperAdmin && (
                          <TableHead className="text-right">Ações</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {vinculosLista.map((vinculo) => (
                        <TableRow key={vinculo.id}>
                          <TableCell className="font-medium">
                            {vinculo.modulo.nome}
                          </TableCell>

                          <TableCell>
                            <CrudStatusBadge ativo={vinculo.modulo.ativo} />
                          </TableCell>

                          <TableCell>
                            <CrudStatusBadge ativo={vinculo.ativo} />
                          </TableCell>

                          {ehSuperAdmin && (
                            <TableCell className="text-right">
                              <div className="flex min-w-max justify-end">
                                <AlterarStatusVinculoButton vinculo={vinculo} />
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}

                      {vinculosLista.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={ehSuperAdmin ? 4 : 3}>
                            <CrudEmpty message="Nenhum módulo vinculado a esta empresa." />
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CrudCard>
        </section>
      </div>
    </AppLayout>
  );
}
