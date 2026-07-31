"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  EMPRESA_SELECIONADA_STORAGE_KEY,
  lerEmpresaSelecionadaId,
} from "@/lib/empresa-contexto";
import { Empresa, listarEmpresas } from "@/services/empresas.service";
import {
  definirEmpresaOperacional,
  limparEmpresaOperacional,
} from "@/services/api";

type EmpresaSelecionadaContextData = {
  empresas: Empresa[];
  empresaSelecionada: Empresa | null;
  empresaSelecionadaId: string | null;
  empresaEfetivaId: string | null;
  carregando: boolean;
  requerSelecao: boolean;
  selecionarEmpresa: (empresaId: string) => void;
  limparEmpresa: () => void;
};

const EmpresaSelecionadaContext = createContext<
  EmpresaSelecionadaContextData | undefined
>(undefined);

export function EmpresaSelecionadaProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { usuario, autenticado, carregando: carregandoAuth } = useAuth();
  const superAdmin = usuario?.tipo === "SUPER_ADMIN";
  const [empresaSelecionadaId, setEmpresaSelecionadaId] = useState<
    string | null
  >(null);

  const { data: empresasCarregadas, isLoading } = useQuery({
    queryKey: ["empresas", "selecao-operacional"],
    queryFn: listarEmpresas,
    enabled: autenticado && superAdmin && !carregandoAuth,
  });

  const empresas = useMemo(
    () => empresasCarregadas ?? [],
    [empresasCarregadas],
  );

  useEffect(() => {
    if (carregandoAuth || (superAdmin && isLoading)) return;

    const sincronizar = window.setTimeout(() => {
      if (!superAdmin) {
        localStorage.removeItem(EMPRESA_SELECIONADA_STORAGE_KEY);
        limparEmpresaOperacional();
        setEmpresaSelecionadaId(null);
        return;
      }

      const armazenada = lerEmpresaSelecionadaId();
      const valida = empresas.some(
        (empresa) => empresa.id === armazenada && empresa.ativa,
      );
      if (valida && armazenada && usuario) {
        definirEmpresaOperacional(usuario.id, armazenada);
        setEmpresaSelecionadaId(armazenada);
      } else {
        localStorage.removeItem(EMPRESA_SELECIONADA_STORAGE_KEY);
        limparEmpresaOperacional();
        setEmpresaSelecionadaId(null);
      }
    }, 0);

    return () => window.clearTimeout(sincronizar);
  }, [carregandoAuth, empresas, isLoading, superAdmin, usuario]);

  const empresasAtivas = useMemo(
    () => empresas.filter((empresa) => empresa.ativa),
    [empresas],
  );
  const empresaSelecionada =
    empresasAtivas.find((empresa) => empresa.id === empresaSelecionadaId) ??
    null;

  const empresaEfetivaId = superAdmin
    ? (empresaSelecionada?.id ?? null)
    : (usuario?.empresaId ?? null);

  function selecionarEmpresa(empresaId: string) {
    const empresa = empresasAtivas.find((item) => item.id === empresaId);
    if (!superAdmin || !empresa) return;
    localStorage.setItem(EMPRESA_SELECIONADA_STORAGE_KEY, empresa.id);
    if (usuario) definirEmpresaOperacional(usuario.id, empresa.id);
    setEmpresaSelecionadaId(empresa.id);
  }

  function limparEmpresa() {
    localStorage.removeItem(EMPRESA_SELECIONADA_STORAGE_KEY);
    limparEmpresaOperacional();
    setEmpresaSelecionadaId(null);
  }

  return (
    <EmpresaSelecionadaContext.Provider
      value={{
        empresas: empresasAtivas,
        empresaSelecionada,
        empresaSelecionadaId: empresaSelecionada?.id ?? null,
        empresaEfetivaId,
        carregando: carregandoAuth || (superAdmin && isLoading),
        requerSelecao: Boolean(superAdmin),
        selecionarEmpresa,
        limparEmpresa,
      }}
    >
      {children}
    </EmpresaSelecionadaContext.Provider>
  );
}

export function useEmpresaSelecionada() {
  const contexto = useContext(EmpresaSelecionadaContext);
  if (!contexto) {
    throw new Error(
      "useEmpresaSelecionada deve ser utilizado dentro de EmpresaSelecionadaProvider",
    );
  }
  return contexto;
}
