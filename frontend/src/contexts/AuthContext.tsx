"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { EVENTO_SESSAO_EXPIRADA } from "@/services/api";

type Usuario = {
  id: string;
  nome: string;
  email: string;
  tipo: string;
  empresaId: string | null;
};

type AuthContextData = {
  usuario: Usuario | null;
  token: string | null;
  autenticado: boolean;
  carregando: boolean;
  login: (token: string, usuario: Usuario) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextData | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const limparSessao = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");

    setToken(null);
    setUsuario(null);
  }, []);

  useEffect(() => {
    try {
      const tokenSalvo = localStorage.getItem("token");
      const usuarioSalvo = localStorage.getItem("usuario");

      if (tokenSalvo && usuarioSalvo) {
        const usuarioConvertido = JSON.parse(usuarioSalvo) as Usuario;

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
  }, [limparSessao]);

  useEffect(() => {
    function tratarSessaoExpirada() {
      limparSessao();
      router.replace("/login?motivo=sessao-expirada");
    }

    function sincronizarSessaoEntreAbas(evento: StorageEvent) {
      if (evento.key === "token" && evento.newValue === null) {
        limparSessao();
        router.replace("/login");
      }
    }

    window.addEventListener(
      EVENTO_SESSAO_EXPIRADA,
      tratarSessaoExpirada
    );

    window.addEventListener("storage", sincronizarSessaoEntreAbas);

    return () => {
      window.removeEventListener(
        EVENTO_SESSAO_EXPIRADA,
        tratarSessaoExpirada
      );

      window.removeEventListener(
        "storage",
        sincronizarSessaoEntreAbas
      );
    };
  }, [limparSessao, router]);

  function login(novoToken: string, novoUsuario: Usuario) {
    localStorage.setItem("token", novoToken);
    localStorage.setItem("usuario", JSON.stringify(novoUsuario));

    setToken(novoToken);
    setUsuario(novoUsuario);

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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(AuthContext);

  if (!contexto) {
    throw new Error(
      "useAuth deve ser utilizado dentro de um AuthProvider"
    );
  }

  return contexto;
}
