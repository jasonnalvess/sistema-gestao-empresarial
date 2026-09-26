"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CrudCard } from "@/components/crud/CrudCard";
import { CrudEmpty } from "@/components/crud/CrudEmpty";
import { CrudLoading } from "@/components/crud/CrudLoading";
import { CrudPagination } from "@/components/crud/CrudPagination";
import { listarHistorico } from "@/services/funcionarios.service";
import { funcionariosQueryKeys as keys } from "@/lib/funcionarios-query-keys";
import { RhErro } from "./RhShared";
import { acessoRotulos, statusRotulos, eventosRotulos } from "./rh-rotulos";
export function HistoricoFuncionario({
  empresa,
  id,
}: {
  empresa: string;
  id: string;
}) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: keys.historico(empresa, id, page),
    queryFn: ({ signal }) => listarHistorico(id, page, signal),
  });
  return (
    <CrudCard>
      <h2 className="mb-4 text-lg font-semibold">Histórico</h2>
      <RhErro error={query.error} tentar={() => void query.refetch()} />
      {query.isLoading ? (
        <CrudLoading />
      ) : (
        !query.error && (
          <>
            {!query.data?.data.length && (
              <CrudEmpty message="Nenhum evento registrado." />
            )}
            <ol className="min-w-0 space-y-4 [overflow-wrap:anywhere] border-l border-slate-200 pl-4">
              {query.data?.data.map((item) => (
                <li
                  key={item.id}
                  className="min-w-0 space-y-1 rounded-lg bg-slate-50 p-3"
                >
                  <h3 className="font-medium">
                    {eventosRotulos[item.tipo] ?? "Cadastro atualizado"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    <time dateTime={item.createdAt}>
                      {new Date(item.createdAt).toLocaleString("pt-BR")}
                    </time>{" "}
                    · {item.atorUsuario?.nome ?? "Sistema"} ·{" "}
                    {item.origem === "RH"
                      ? "RH"
                      : item.origem === "USUARIO"
                        ? "Gestão de usuários"
                        : "Sistema"}
                  </p>
                  {item.statusNovo && (
                    <p>
                      Situação:{" "}
                      {item.statusAnterior
                        ? statusRotulos[item.statusAnterior]
                        : "—"}{" "}
                      → {statusRotulos[item.statusNovo]}
                    </p>
                  )}
                  {item.acessoNovo && (
                    <p>
                      Acesso:{" "}
                      {item.acessoAnterior
                        ? acessoRotulos[item.acessoAnterior]
                        : "—"}{" "}
                      → {acessoRotulos[item.acessoNovo]}
                    </p>
                  )}
                </li>
              ))}
            </ol>
            <CrudPagination
              page={page}
              totalPages={query.data?.meta.totalPages ?? 1}
              onPageChange={setPage}
            />
          </>
        )
      )}
    </CrudCard>
  );
}
