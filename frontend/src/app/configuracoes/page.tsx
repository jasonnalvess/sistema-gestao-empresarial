"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  ClipboardList,
  KeyRound,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { AcessoNegado } from "@/components/common/AcessoNegado";
import { EmpresaNaoSelecionada } from "@/components/common/EmpresaNaoSelecionada";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import {
  PERMISSAO_AUDITORIA_EMPRESA_VISUALIZAR,
  PERMISSAO_AUDITORIA_GLOBAL_VISUALIZAR,
} from "@/lib/auth";
import { empresasQueryKeys } from "@/lib/empresas-query-keys";
import { empresaModulosQueryKeys } from "@/lib/empresa-modulos-query-keys";
import {
  formatarCnpj,
  formatarDataUtc,
  situacaoComercialEmpresa,
} from "@/lib/empresas-utils";
import { CrudStatusBadge } from "@/components/crud/CrudStatusBadge";

import { listarEmpresas } from "@/services/empresas.service";
import { listarModulosDaEmpresa } from "@/services/empresa-modulos.service";

type Atalho = {
  titulo: string;
  descricao: string;
  href: string;
  icon: LucideIcon;
};

export default function ConfiguracoesPage() {
  const { usuario, temPermissao } = useAuth();
  const { empresaSelecionadaId, carregando, requerSelecao } =
    useEmpresaSelecionada();
  const possuiEmpresaEfetiva = !requerSelecao || Boolean(empresaSelecionadaId);

  const ehSuperAdmin = usuario?.tipo === "SUPER_ADMIN";
  const ehAdminEmpresa = usuario?.tipo === "ADMIN_EMPRESA";
  const podeAcessar = ehSuperAdmin || ehAdminEmpresa;

  // SUPER_ADMIN: empresa selecionada no contexto; ADMIN_EMPRESA: a própria.
  const empresaContextoId = ehSuperAdmin
    ? empresaSelecionadaId
    : usuario?.empresaId ?? null;

  const { data: empresas, error: erroEmpresas } = useQuery({
    queryKey: empresasQueryKeys.todas(),
    queryFn: listarEmpresas,
    enabled: podeAcessar && Boolean(empresaContextoId),
  });

  const { data: vinculos, error: erroVinculos } = useQuery({
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
        <div className="space-y-6">
          <PageHeader
            title="Configurações"
            description="Visão da empresa e atalhos administrativos."
          />
        </div>
      </AppLayout>
    );
  }

  if (!empresaContextoId || !possuiEmpresaEfetiva) {
    return (
      <AppLayout>
        <EmpresaNaoSelecionada />
      </AppLayout>
    );
  }

  const empresa = (empresas ?? []).find(
    (item) => item.id === empresaContextoId,
  );
  const situacao = empresa ? situacaoComercialEmpresa(empresa) : null;
  const modulosHabilitados = (vinculos ?? [])
    .filter((vinculo) => vinculo.ativo && vinculo.modulo.ativo)
    .map((vinculo) => vinculo.modulo.nome)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  const podeVerEmpresas = ehSuperAdmin;
  const podeVerAuditoria =
    temPermissao(PERMISSAO_AUDITORIA_EMPRESA_VISUALIZAR) ||
    temPermissao(PERMISSAO_AUDITORIA_GLOBAL_VISUALIZAR);

  const atalhos: Atalho[] = [
    {
      titulo: "Usuários",
      descricao: "Gerencie os usuários da empresa.",
      href: "/usuarios",
      icon: Users,
    },
    {
      titulo: "Perfis e Permissões",
      descricao: "Perfis, permissões e delegações.",
      href: "/perfis",
      icon: ShieldCheck,
    },
    ...(podeVerEmpresas
      ? [
          {
            titulo: "Empresas",
            descricao: "Administração global de empresas.",
            href: "/empresas",
            icon: Building2,
          },
        ]
      : []),
    {
      titulo: "Módulos",
      descricao: "Catálogo e vínculos de módulos da empresa.",
      href: "/modulos",
      icon: Building2,
    },
    ...(podeVerAuditoria
      ? [
          {
            titulo: "Auditoria",
            descricao: "Trilha de auditoria com escopo conforme o perfil.",
            href: "/auditoria",
            icon: ClipboardList,
          },
        ]
      : []),
    {
      titulo: "Trocar senha",
      descricao: "Altere a senha da sua conta.",
      href: "/trocar-senha",
      icon: KeyRound,
    },
  ];

  return (
    <AppLayout>
      <div className="min-w-0 space-y-6">
        <PageHeader
          title="Configurações"
          description="Visão administrativa da empresa e atalhos para as áreas de gestão."
        />

        <section className="min-w-0 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Minha empresa</h2>
          <p className="text-sm text-slate-600">
            Dados da empresa em leitura. A edição de cadastro e o status
            administrativo ficam na área de Empresas (SUPER_ADMIN).
          </p>

          <div className="rounded-lg border bg-white p-6 shadow-sm">
            {erroEmpresas || erroVinculos ? (
              <ErrorMessage message="Erro ao carregar os dados da empresa." />
            ) : !empresa ? (
              <p className="text-sm text-slate-600">
                Não foi possível localizar a empresa do contexto.
              </p>
            ) : (
              <dl className="grid gap-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-slate-500">Nome</dt>
                  <dd className="mt-1 font-medium text-slate-900">
                    {empresa.nome}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-slate-500">CNPJ</dt>
                  <dd className="mt-1 font-medium text-slate-900">
                    {formatarCnpj(empresa.cnpj)}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-slate-500">Situação</dt>
                  <dd className="mt-1">
                    <CrudStatusBadge ativo={empresa.ativa} />
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-slate-500">Situação comercial</dt>
                  <dd className="mt-1">
                    <span
                      className={
                        situacao?.bloqueada
                          ? "font-medium text-red-600"
                          : "font-medium text-slate-700"
                      }
                    >
                      {situacao?.rotulo ?? "—"}
                    </span>
                    {empresa.validadeComercialFim && (
                      <span className="block text-xs text-slate-500">
                        Vigência até {formatarDataUtc(empresa.validadeComercialFim)} (UTC)
                      </span>
                    )}
                  </dd>
                </div>

                <div className="sm:col-span-2">
                  <dt className="text-sm text-slate-500">Módulos habilitados</dt>
                  <dd className="mt-2 flex flex-wrap gap-2">
                    {modulosHabilitados.length > 0 ? (
                      modulosHabilitados.map((nome) => (
                        <span
                          key={nome}
                          className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                        >
                          {nome}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-600">
                        Nenhum módulo habilitado.
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </section>

        <section className="min-w-0 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Atalhos administrativos
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {atalhos.map((atalho) => {
              const Icon = atalho.icon;
              return (
                <Link
                  key={atalho.href}
                  href={atalho.href}
                  className="flex items-start gap-3 rounded-lg border bg-white p-4 shadow-sm transition-colors hover:bg-slate-50"
                >
                  <Icon
                    aria-hidden="true"
                    className="mt-0.5 h-5 w-5 shrink-0 text-slate-600"
                  />
                  <span className="min-w-0">
                    <span className="block font-medium text-slate-900">
                      {atalho.titulo}
                    </span>
                    <span className="mt-1 block text-sm text-slate-600">
                      {atalho.descricao}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
          <p className="text-xs text-slate-500">
            Configurações globais do sistema (SMTP, parâmetros globais e
            integrações) não fazem parte desta página nesta versão.
          </p>
        </section>
      </div>
    </AppLayout>
  );
}
