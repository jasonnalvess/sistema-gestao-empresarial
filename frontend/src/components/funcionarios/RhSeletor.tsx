"use client";
import { PERMISSAO_FUNCIONARIOS_VISUALIZAR } from "@/lib/auth";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { CrudPagination } from "@/components/crud/CrudPagination";
import { Input } from "@/components/ui/input";
import { api } from "@/services/api";
import {
  listarEstrutura,
  listarFuncionarios,
} from "@/services/funcionarios.service";
import type { Perfil, RespostaPaginada } from "@/services/perfis.service";
import type { Usuario } from "@/services/usuarios.service";
import { funcionariosQueryKeys as keys } from "@/lib/funcionarios-query-keys";
import { RhErro } from "./RhShared";
import { selectClass } from "./rh-rotulos";
type Opcao = { id: string; nome: string; ativo?: boolean };
type Tipo = "cargos" | "departamentos" | "gestores" | "perfis" | "usuarios";
export function RhSeletor({
  empresa,
  tipo,
  label,
  value,
  onChange,
  atual,
  apenasAtivos = true,
  excluirId,
  somenteInativos = false,
  required = false,
}: {
  empresa: string;
  tipo: Tipo;
  label: string;
  value: string;
  onChange: (id: string) => void;
  atual?: Opcao | null;
  apenasAtivos?: boolean;
  excluirId?: string;
  somenteInativos?: boolean;
  required?: boolean;
}) {
  const { usuario, temPermissao } = useAuth();
  const [search, setSearch] = useState("");
  const [escolhida, setEscolhida] = useState<Opcao | null>(atual ?? null);
  const [page, setPage] = useState(1);
  const admin =
    usuario?.tipo === "SUPER_ADMIN" || usuario?.tipo === "ADMIN_EMPRESA";
  const autorizado =
    tipo === "perfis"
      ? admin && temPermissao("perfis.visualizar")
      : tipo === "usuarios"
        ? admin && temPermissao("usuarios.visualizar")
        : temPermissao(PERMISSAO_FUNCIONARIOS_VISUALIZAR);
  const query = useQuery({
    queryKey: keys.seletor(empresa, tipo, search, page, apenasAtivos),
    enabled: autorizado && !usuario?.trocaSenhaObrigatoria,
    queryFn: async ({
      signal,
    }): Promise<{ data: Opcao[]; totalPages: number }> => {
      if (tipo === "cargos" || tipo === "departamentos") {
        const r = await listarEstrutura(
          tipo,
          {
            page,
            limit: 10,
            search: search || undefined,
            ativo: apenasAtivos ? true : undefined,
          },
          signal,
        );
        return { data: r.data, totalPages: r.meta.totalPages };
      }
      if (tipo === "gestores") {
        const r = await listarFuncionarios(
          { page, limit: 10, search: search || undefined },
          signal,
        );
        return {
          data: r.data
            .filter((f) => !apenasAtivos || f.status !== "DESLIGADO")
            .map((f) => ({
              id: f.id,
              nome: `${f.nomePreferido || f.nome} — ${f.matricula}`,
            })),
          totalPages: r.meta.totalPages,
        };
      }
      if (tipo === "perfis") {
        const r = (
          await api.get<RespostaPaginada<Perfil>>("/perfis", {
            params: {
              page,
              limit: 10,
              ativo: true,
              search: search || undefined,
            },
            signal,
          })
        ).data;
        return {
          data: r.data.filter(
            (p) => p.escopo === "EMPRESA" && p.empresaId === empresa && p.ativo,
          ),
          totalPages: r.meta.totalPages,
        };
      }
      // /usuarios aceita somente paginação e é global para SUPER_ADMIN.
      // Filtrar antes de colocar opções no cache do RH.
      const r = (
        await api.get<RespostaPaginada<Usuario>>("/usuarios", {
          params: { page, limit: 100 },
          signal,
        })
      ).data;
      return {
        data: r.data
          .filter(
            (u) => u.empresaId === empresa && u.tipo === "USUARIO_EMPRESA",
          )
          .map((u) => ({
            id: u.id,
            nome: `${u.nome} — ${u.email} (${u.ativo ? "ativo" : "inativo"})`,
            ativo: u.ativo,
          })),
        totalPages: r.meta.totalPages,
      };
    },
  });
  const opcoes = (query.data?.data ?? []).filter(
    (o) => o.id !== excluirId && (!somenteInativos || o.ativo === false),
  );
  const selecionado =
    escolhida?.id === value
      ? escolhida
      : atual?.id === value
        ? atual
        : undefined;
  return (
    <fieldset
      className="w-full min-w-0 max-w-full space-y-2 rounded-lg border p-3 [overflow-wrap:anywhere] [&>nav]:flex-col [&>nav>div]:grid [&>nav>div]:w-full [&>nav>div]:grid-cols-2 [&>nav>div>button]:min-w-0 [&>nav>div>button]:w-full"
      disabled={!autorizado}
    >
      <legend className="max-w-full whitespace-normal px-1 text-sm font-medium">
        {label}
      </legend>
      {!autorizado ? (
        <p className="text-sm text-slate-600">
          Sem permissão para consultar {tipo}.
        </p>
      ) : (
        <>
          {tipo !== "usuarios" && (
            <Input
              aria-label={`Pesquisar ${label}`}
              placeholder="Pesquisar opções..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          )}
          <select
            aria-label={label}
            className={selectClass}
            value={value}
            required={required}
            onChange={(e) => {
              setEscolhida(opcoes.find((o) => o.id === e.target.value) ?? null);
              onChange(e.target.value);
            }}
          >
            <option value="">
              {required ? "Selecione" : "Não informado / todos"}
            </option>
            {value && !opcoes.some((o) => o.id === value) && (
              <option value={value}>
                {selecionado?.nome ?? "Opção selecionada em outra página"}
              </option>
            )}
            {opcoes.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
                {o.ativo === false && tipo !== "usuarios" ? " (inativo)" : ""}
              </option>
            ))}
          </select>
          {value && (
            <p className="min-w-0 text-sm text-slate-600 [overflow-wrap:anywhere]">
              {selecionado?.nome ??
                opcoes.find((opcao) => opcao.id === value)?.nome ??
                "Opção selecionada em outra página"}
            </p>
          )}
          {query.isFetching && (
            <p role="status" className="text-xs">
              Carregando opções...
            </p>
          )}
          <RhErro error={query.error} tentar={() => void query.refetch()} />
          {!query.isFetching && !query.error && opcoes.length === 0 && (
            <p className="text-xs text-slate-500">
              Nenhuma opção elegível nesta página.
            </p>
          )}
          <CrudPagination
            page={page}
            totalPages={query.data?.totalPages ?? 1}
            onPageChange={setPage}
          />
        </>
      )}
    </fieldset>
  );
}
