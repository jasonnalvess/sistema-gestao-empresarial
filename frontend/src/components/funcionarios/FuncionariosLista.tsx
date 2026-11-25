"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CrudCard } from "@/components/crud/CrudCard";
import { CrudToolbar } from "@/components/crud/CrudToolbar";
import { CrudSearch } from "@/components/crud/CrudSearch";
import { CrudPagination } from "@/components/crud/CrudPagination";
import { CrudEmpty } from "@/components/crud/CrudEmpty";
import { CrudLoading } from "@/components/crud/CrudLoading";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  listarFuncionarios,
  type FiltrosFuncionarios,
} from "@/services/funcionarios.service";
import { funcionariosQueryKeys as keys } from "@/lib/funcionarios-query-keys";
import { FuncionarioForm } from "./FuncionarioForm";
import { RhSeletor } from "./RhSeletor";
import { RhBadge, RhErro } from "./RhShared";
import {
  statusRotulos,
  vinculoRotulos,
  acessoRotulos,
  selectClass,
} from "./rh-rotulos";
export function FuncionariosLista({ empresa }: { empresa: string }) {
  const [search, setSearch] = useState("");
  const [filtros, setFiltros] = useState<FiltrosFuncionarios>({
    page: 1,
    limit: 10,
  });
  const query = useQuery({
    queryKey: keys.lista(empresa, filtros),
    queryFn: ({ signal }) => listarFuncionarios(filtros, signal),
  });
  function filtrar(campo: keyof FiltrosFuncionarios, valor: string) {
    setFiltros((f) => ({ ...f, [campo]: valor || undefined, page: 1 }));
  }
  return (
    <CrudCard>
      <div className="[&>div]:flex-wrap [&>div>form]:flex-1 [&>div>form]:basis-full lg:[&>div>form]:basis-auto [&>div>button]:w-full lg:[&>div>button]:w-auto">
        <CrudToolbar>
          <CrudSearch
            value={search}
            onChange={setSearch}
            onSearch={() => filtrar("search", search.trim())}
            placeholder="Nome, matrícula ou e-mail corporativo"
          />
          <FuncionarioForm empresa={empresa} />
        </CrudToolbar>
      </div>
      <div className="my-4 grid min-w-0 grid-cols-1 items-start gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {(
          [
            ["status", "Situação", statusRotulos],
            ["tipoVinculo", "Vínculo", vinculoRotulos],
            ["acesso", "Acesso", acessoRotulos],
          ] as const
        ).map(([campo, label, opcoes]) => (
          <label key={campo} className="block min-w-0 space-y-1">
            {label}
            <select
              className={selectClass}
              value={filtros[campo] ?? ""}
              onChange={(e) => filtrar(campo, e.target.value)}
            >
              <option value="">Todos</option>
              {Object.entries(opcoes).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        ))}
        <RhSeletor
          empresa={empresa}
          tipo="cargos"
          label="Cargo"
          value={filtros.cargoId ?? ""}
          onChange={(v) => filtrar("cargoId", v)}
          apenasAtivos={false}
        />
        <RhSeletor
          empresa={empresa}
          tipo="departamentos"
          label="Departamento"
          value={filtros.departamentoId ?? ""}
          onChange={(v) => filtrar("departamentoId", v)}
          apenasAtivos={false}
        />
        <RhSeletor
          empresa={empresa}
          tipo="gestores"
          label="Gestor"
          value={filtros.gestorId ?? ""}
          onChange={(v) => filtrar("gestorId", v)}
          apenasAtivos={false}
        />
        <label className="block min-w-0 space-y-1">
          Por página
          <select
            className={selectClass}
            value={filtros.limit}
            onChange={(e) =>
              setFiltros((f) => ({
                ...f,
                limit: Number(e.target.value),
                page: 1,
              }))
            }
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <Button
          variant="outline"
          onClick={() => {
            setSearch("");
            setFiltros({ page: 1, limit: 10 });
          }}
        >
          Limpar filtros
        </Button>
      </div>
      <RhErro error={query.error} tentar={() => void query.refetch()} />
      {query.isLoading ? (
        <CrudLoading />
      ) : (
        !query.error && (
          <>
            <div className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain">
              <Table className="[&_td]:max-w-xs [&_td]:whitespace-normal [&_td]:[overflow-wrap:anywhere]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Matrícula</TableHead>
                    <TableHead>Cargo / Departamento</TableHead>
                    <TableHead>Vínculo</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Acesso</TableHead>
                    <TableHead>Ficha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {query.data?.data.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="min-w-40">
                        <Link
                          className="font-medium text-blue-700 hover:underline"
                          href={`/funcionarios/${f.id}`}
                        >
                          {f.nomePreferido || f.nome}
                        </Link>
                        {f.nomePreferido && (
                          <p className="text-xs text-slate-500">{f.nome}</p>
                        )}
                      </TableCell>
                      <TableCell>{f.matricula}</TableCell>
                      <TableCell>
                        {f.cargo?.nome ?? "—"}
                        <p className="text-xs text-slate-500">
                          {f.departamento?.nome ?? "—"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <RhBadge>{vinculoRotulos[f.tipoVinculo]}</RhBadge>
                      </TableCell>
                      <TableCell>
                        <RhBadge ativo={f.status === "ATIVO"}>
                          {statusRotulos[f.status]}
                        </RhBadge>
                      </TableCell>
                      <TableCell>
                        <RhBadge ativo={f.estadoAcesso === "USUARIO_ATIVO"}>
                          {acessoRotulos[f.estadoAcesso]}
                        </RhBadge>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/funcionarios/${f.id}`}
                          aria-label={`Abrir ficha de ${f.nome}`}
                          className="text-blue-700 underline"
                        >
                          Abrir
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {!query.data?.data.length && (
              <CrudEmpty message="Nenhum funcionário encontrado." />
            )}
            <CrudPagination
              page={filtros.page ?? 1}
              totalPages={query.data?.meta.totalPages ?? 1}
              onPageChange={(page) => setFiltros((f) => ({ ...f, page }))}
            />
          </>
        )
      )}
    </CrudCard>
  );
}
