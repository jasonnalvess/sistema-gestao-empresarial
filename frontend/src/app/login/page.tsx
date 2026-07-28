"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Eye, EyeOff } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";

type LoginResponse = {
  data: {
    access_token: string;
    usuario: {
      id: string;
      nome: string;
      email: string;
      tipo: string;
      empresaId: string | null;
    };
  };
};

export default function LoginPage() {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search);

    if (parametros.get("motivo") === "sessao-expirada") {
      setAviso("Sua sessão expirou. Entre novamente para continuar.");

      window.history.replaceState(
        {},
        "",
        window.location.pathname,
      );
    }
  }, []);

  async function fazerLogin(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (carregando) {
      return;
    }

    const emailNormalizado = email.trim().toLowerCase();

    if (!emailNormalizado || !senha) {
      setErro("Informe o e-mail e a senha.");
      return;
    }

    setErro("");
    setAviso("");
    setCarregando(true);

    try {
      const resposta = await api.post<LoginResponse>("/auth/login", {
        email: emailNormalizado,
        senha,
      });

      login(
        resposta.data.data.access_token,
        resposta.data.data.usuario,
      );
    } catch (erroDesconhecido: unknown) {
      if (axios.isAxiosError(erroDesconhecido)) {
        const status = erroDesconhecido.response?.status;

        if (status === 401) {
          setErro("E-mail ou senha inválidos.");
          return;
        }

        if (!erroDesconhecido.response) {
          setErro(
            "Não foi possível conectar ao servidor. Verifique sua conexão.",
          );
          return;
        }
      }

      setErro("Não foi possível realizar o login. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8 sm:px-6">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg sm:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Acessar Sistema
          </h1>

          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Entre com seu usuário para continuar.
          </p>
        </div>

        {aviso && (
          <div
            role="status"
            aria-live="polite"
            className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          >
            {aviso}
          </div>
        )}

        <form
          onSubmit={fazerLogin}
          className="space-y-5"
          noValidate
        >
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700"
            >
              E-mail
            </label>

            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              disabled={carregando}
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="Digite seu e-mail"
            />
          </div>

          <div>
            <label
              htmlFor="senha"
              className="block text-sm font-medium text-slate-700"
            >
              Senha
            </label>

            <div className="relative mt-1">
              <input
                id="senha"
                name="senha"
                type={mostrarSenha ? "text" : "password"}
                autoComplete="current-password"
                required
                disabled={carregando}
                value={senha}
                onChange={(evento) => setSenha(evento.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-12 text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                placeholder="Digite sua senha"
              />

              <button
                type="button"
                onClick={() => setMostrarSenha((estadoAtual) => !estadoAtual)}
                disabled={carregando}
                aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={mostrarSenha}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-slate-500 transition hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 disabled:cursor-not-allowed"
              >
                {mostrarSenha ? (
                  <EyeOff aria-hidden="true" size={20} />
                ) : (
                  <Eye aria-hidden="true" size={20} />
                )}
              </button>
            </div>
          </div>

          {erro && (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
