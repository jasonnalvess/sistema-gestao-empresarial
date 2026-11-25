"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { PERMISSAO_PERFIS_VISUALIZAR } from "@/lib/auth";
import { perfisQueryKeys } from "@/lib/perfis-query-keys";
import { listarPerfis, type Perfil } from "@/services/perfis.service";
import { Button } from "@/components/ui/button";
import { mensagemErroPerfis } from "./perfis-erro";

type Props = {
  empresaId: string;
  value: string[];
  onChange: (ids: string[]) => void;
  atribuidos?: Perfil[];
  disabled?: boolean;
};

export function SeletorPerfisUsuario({
  empresaId,
  value,
  onChange,
  atribuidos = [],
  disabled,
}: Props) {
  const { temPermissao } = useAuth();
  const podeListar = temPermissao(PERMISSAO_PERFIS_VISUALIZAR);
  const consulta = useQuery({
    queryKey: [...perfisQueryKeys.listas(empresaId), "seletor-usuarios-ativos"],
    enabled: podeListar,
    retry: false,
    queryFn: async ({ signal }) => {
      const perfis: Perfil[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        signal.throwIfAborted();
        const resposta = await listarPerfis(
          { ativo: true, page, limit: 100 },
          signal,
        );
        perfis.push(
          ...resposta.data.filter(
            (p) =>
              p.empresaId === empresaId && p.escopo === "EMPRESA" && p.ativo,
          ),
        );
        totalPages = resposta.meta.totalPages;
        page++;
      } while (page <= totalPages);
      return perfis;
    },
  });
  const opcoes = Array.from(
    new Map(
      [...atribuidos, ...(podeListar ? (consulta.data ?? []) : [])]
        .filter(
          (p) => p.ativo && p.escopo === "EMPRESA" && p.empresaId === empresaId,
        )
        .map((p) => [p.id, p]),
    ).values(),
  );

  return (
    <fieldset
      disabled={disabled || consulta.isFetching}
      className="min-w-0 space-y-3 rounded-lg border p-3"
    >
      <legend className="px-1 text-sm font-semibold">Perfis de acesso</legend>
      <p className="text-sm text-slate-600">
        Selecione nenhum, um ou vários perfis. Sem perfis, a conta fica sem
        permissões funcionais.
      </p>
      {!podeListar && (
        <p className="text-sm text-amber-800">
          É necessário ter permissão para visualizar perfis para consultar novas
          opções. Os perfis já atribuídos podem ser removidos.
        </p>
      )}
      {consulta.isFetching && (
        <p role="status" className="text-sm">
          Carregando perfis...
        </p>
      )}
      {consulta.isError && (
        <div role="alert" className="space-y-2 text-sm text-red-700">
          <p>{mensagemErroPerfis(consulta.error)}</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void consulta.refetch()}
          >
            Tentar novamente
          </Button>
        </div>
      )}
      {!consulta.isFetching && !consulta.isError && opcoes.length === 0 && (
        <p className="text-sm text-slate-500">
          Nenhum perfil disponível para seleção.
        </p>
      )}
      <div className="max-h-60 min-w-0 space-y-2 overflow-y-auto">
        {opcoes.map((perfil) => (
          <label
            key={perfil.id}
            className="flex min-w-0 cursor-pointer items-start gap-3 rounded-md border p-3 text-sm has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
          >
            <input
              type="checkbox"
              className="mt-1 size-4 shrink-0"
              checked={value.includes(perfil.id)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...value, perfil.id]
                    : value.filter((id) => id !== perfil.id),
                )
              }
            />
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">
              <span className="font-medium">{perfil.nome}</span>
              {perfil.descricao && (
                <span className="mt-1 block text-slate-600">
                  {perfil.descricao}
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
      <p className="text-sm text-slate-600" aria-live="polite">
        {value.length} perfil(is) selecionado(s).
      </p>
      {value.length > 0 && (
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => onChange([])}
        >
          Remover todos da seleção
        </Button>
      )}
    </fieldset>
  );
}
