"use client";
import { PERMISSAO_FUNCIONARIOS_VISUALIZAR } from "@/lib/auth";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { AcessoNegado } from "@/components/common/AcessoNegado";
import { EmpresaNaoSelecionada } from "@/components/common/EmpresaNaoSelecionada";
import { CrudLoading } from "@/components/crud/CrudLoading";
import { Button } from "@/components/ui/button";
import { obterMensagemErro } from "@/lib/api-error";
import { funcionariosQueryKeys as keys } from "@/lib/funcionarios-query-keys";
export function RhScope({
  children,
}: {
  children: (empresa: string) => ReactNode;
}) {
  const { usuario, temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  return (
    <AppLayout>
      {carregando ? (
        <CrudLoading />
      ) : !temPermissao(PERMISSAO_FUNCIONARIOS_VISUALIZAR) ? (
        <AcessoNegado />
      ) : !empresaEfetivaId ? (
        <EmpresaNaoSelecionada />
      ) : (
        !usuario?.trocaSenhaObrigatoria && (
          <Fragment key={empresaEfetivaId}>
            {children(empresaEfetivaId)}
          </Fragment>
        )
      )}
    </AppLayout>
  );
}
export function RhErro({
  error,
  tentar,
}: {
  error: unknown;
  tentar?: () => void;
}) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="my-3 min-w-0 space-y-2 [overflow-wrap:anywhere] rounded-lg bg-red-50 p-3 text-sm text-red-700"
    >
      {obterMensagemErro(error, "Não foi possível carregar os dados.")}
      {tentar && (
        <Button type="button" variant="outline" size="sm" onClick={tentar}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
export function RhBadge({
  children,
  ativo = false,
}: {
  children: ReactNode;
  ativo?: boolean;
}) {
  return (
    <span
      className={`inline-flex max-w-full whitespace-normal [overflow-wrap:anywhere] rounded-full px-2 py-1 text-xs font-medium ${ativo ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-700"}`}
    >
      {children}
    </span>
  );
}
// As operações não armazenam payloads de senha no cache de mutações.
export function useRhOperation(empresa: string) {
  const cache = useQueryClient();
  const [pending, setPending] = useState(false);
  const ocupada = useRef(false);
  const montado = useRef(true);
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);
  async function executar<T>(
    operacao: () => Promise<T>,
    sucesso?: (valor: T) => void,
    conflito?: () => void,
  ) {
    if (ocupada.current || !montado.current) return;
    ocupada.current = true;
    setPending(true);
    try {
      const valor = await operacao();
      await cache.invalidateQueries({ queryKey: keys.raiz(empresa) });
      if (montado.current) {
        toast.success("Operação concluída.");
        sucesso?.(valor);
      }
    } catch (error) {
      const concorrente =
        axios.isAxiosError(error) && error.response?.status === 409;
      if (concorrente)
        await cache.invalidateQueries({ queryKey: keys.raiz(empresa) });
      if (montado.current && !axios.isCancel(error)) {
        toast.error(
          concorrente
            ? "O registro foi alterado por outra operação ou há um conflito nos dados. Revise o estado atualizado antes de tentar novamente."
            : obterMensagemErro(error, "Não foi possível concluir a operação."),
        );
        if (concorrente) conflito?.();
      }
    } finally {
      ocupada.current = false;
      if (montado.current) setPending(false);
    }
  }
  return { pending, executar };
}
