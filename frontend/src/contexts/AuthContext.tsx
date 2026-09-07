"use client";

import {
  createContext,
  Fragment,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { EMPRESA_SELECIONADA_STORAGE_KEY } from "@/lib/empresa-contexto";
import {
  normalizarUsuario,
  temPermissao as verificarPermissao,
  Usuario,
  UsuarioComPermissoesOpcionais,
} from "@/lib/auth";
import {
  EVENTO_SESSAO_EXPIRADA,
  invalidarRequisicoesDaSessao,
  limparEmpresaOperacional,
} from "@/services/api";

type AuthContextData = {
  usuario: Usuario | null;
  token: string | null;
  autenticado: boolean;
  carregando: boolean;
  login: (token: string, usuario: UsuarioComPermissoesOpcionais) => void;
  logout: () => void;
  temPermissao: (permissao: string) => boolean;
};

const AuthContext = createContext<AuthContextData | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [geracaoSessao, setGeracaoSessao] = useState(0);

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const limparCacheDaSessao = useCallback(() => {
    invalidarRequisicoesDaSessao();
    queryClient.clear();
    setGeracaoSessao((geracao) => geracao + 1);
  }, [queryClient]);

  const limparSessao = useCallback(() => {
    limparCacheDaSessao();
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem(EMPRESA_SELECIONADA_STORAGE_KEY);
    limparEmpresaOperacional();

    setToken(null);
    setUsuario(null);
  }, [limparCacheDaSessao]);

  useEffect(() => {
    let efeitoAtivo = true;

    queueMicrotask(() => {
      if (!efeitoAtivo) {
        return;
      }

      try {
        const tokenSalvo = localStorage.getItem("token");
        const usuarioSalvo = localStorage.getItem("usuario");

        if (tokenSalvo && usuarioSalvo) {
          const usuarioConvertido = normalizarUsuario(JSON.parse(usuarioSalvo));

          setToken(tokenSalvo);
          setUsuario(usuarioConvertido);
        } else {
          limparSessao();
        }
      } catch {
        limparSessao();
      } finally {
        setCarregando(false);
      }
    });

    return () => {
      efeitoAtivo = false;
    };
  }, [limparSessao]);

  useEffect(() => {
    function tratarSessaoExpirada() {
      limparSessao();
      router.replace("/login?motivo=sessao-expirada");
    }

    function sincronizarSessaoEntreAbas(evento: StorageEvent) {
      if (
        evento.key === "token" &&
        evento.newValue === null &&
        localStorage.getItem("token") === null
      ) {
        limparSessao();
        router.replace("/login");
      }
      if (
        evento.key === "usuario" &&
        evento.newValue !== null &&
        localStorage.getItem("usuario") === evento.newValue
      ) {
        const tokenAtual = localStorage.getItem("token");
        if (!tokenAtual || tokenAtual === token) return;
        try {
          const usuarioAtual = normalizarUsuario(JSON.parse(evento.newValue));
          limparCacheDaSessao();
          limparEmpresaOperacional();
          setToken(tokenAtual);
          setUsuario(usuarioAtual);
        } catch {
          limparSessao();
          router.replace("/login");
        }
      }
    }

    window.addEventListener(EVENTO_SESSAO_EXPIRADA, tratarSessaoExpirada);

    window.addEventListener("storage", sincronizarSessaoEntreAbas);

    return () => {
      window.removeEventListener(EVENTO_SESSAO_EXPIRADA, tratarSessaoExpirada);

      window.removeEventListener("storage", sincronizarSessaoEntreAbas);
    };
  }, [limparSessao, limparCacheDaSessao, router, token]);

  function login(
    novoToken: string,
    novoUsuario: UsuarioComPermissoesOpcionais,
  ) {
    const usuarioNormalizado = normalizarUsuario(novoUsuario);
    limparCacheDaSessao();

    localStorage.removeItem(EMPRESA_SELECIONADA_STORAGE_KEY);
    limparEmpresaOperacional();

    localStorage.setItem("token", novoToken);
    localStorage.setItem("usuario", JSON.stringify(usuarioNormalizado));

    setToken(novoToken);
    setUsuario(usuarioNormalizado);

    router.replace("/dashboard");
  }

  function logout() {
    limparSessao();
    router.replace("/login");
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        token,
        autenticado: Boolean(token),
        carregando,
        login,
        logout,
        temPermissao: (permissao) => verificarPermissao(usuario, permissao),
      }}
    >
      <Fragment key={geracaoSessao}>{children}</Fragment>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(AuthContext);

  if (!contexto) {
    throw new Error("useAuth deve ser utilizado dentro de um AuthProvider");
  }

  return contexto;
}
