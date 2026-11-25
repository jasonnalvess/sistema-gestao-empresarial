"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

import { api } from "@/services/api";
import { obterMensagemErro } from "@/lib/api-error";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type RedefinirSenhaResponse = {
  data: {
    message: string;
  };
};

export default function RecuperarSenhaPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const [carregando, setCarregando] = useState(false);

  // Lê o token exclusivamente do fragmento da URL (#token=...),
  // somente no cliente. Nunca envia o fragmento ao servidor.
  // O padrão segue o utilizado em src/app/login/page.tsx
  // (leitura dentro de queueMicrotask dentro de useEffect).
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let efeitoAtivo = true;

    queueMicrotask(() => {
      if (!efeitoAtivo) {
        return;
      }

      const hash = window.location.hash;

      if (!hash) {
        setErro(
          "Link de recuperação inválido. Solicite uma nova recuperação de senha.",
        );
        return;
      }

      let tokenExtraido: string | null = null;
      try {
        const match = hash.match(/#token=([^&]+)/);
        tokenExtraido = match ? decodeURIComponent(match[1]) : null;
      } catch {
        tokenExtraido = null;
      }

      if (tokenExtraido) {
        setToken(tokenExtraido);
        // Remove o token da barra de endereço sem recarregar a página.
        // O token permanece em memória apenas durante a operação.
        window.history.replaceState({}, "", window.location.pathname);
      } else {
        setErro(
          "Link de recuperação inválido. Solicite uma nova recuperação de senha.",
        );
      }
    });

    return () => {
      efeitoAtivo = false;
    };
  }, []);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (carregando || !token) {
      return;
    }

    if (!novaSenha || !confirmarSenha) {
      setErro("Preencha a nova senha e a confirmação.");
      return;
    }

    if (novaSenha.length < 8) {
      setErro("A nova senha deve ter no mínimo 8 caracteres.");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErro("A nova senha e a confirmação não coincidem.");
      return;
    }

    setErro("");
    setCarregando(true);

    try {
      await api.post<RedefinirSenhaResponse>("/auth/redefinir-senha", {
        token,
        novaSenha,
        confirmarSenha,
      });
      setSucesso(true);
    } catch (errorDesconhecido: unknown) {
      if (axios.isAxiosError(errorDesconhecido)) {
        const status = errorDesconhecido.response?.status;

        if (status === 400) {
          setErro(
            obterMensagemErro(
              errorDesconhecido,
              "Token inválido, expirado ou já utilizado. Solicite uma nova recuperação de senha.",
            ),
          );
          return;
        }

        if (!errorDesconhecido.response) {
          setErro(
            "Não foi possível conectar ao servidor. Verifique sua conexão.",
          );
          return;
        }
      }

      setErro("Não foi possível redefinir a senha. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  function irParaLogin() {
    router.replace("/login");
  }

  if (sucesso) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8 sm:px-6">
        <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg sm:p-8">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Senha redefinida
            </h1>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              Sua senha foi alterada com sucesso. Você já pode entrar com a nova senha.
            </p>
          </div>
          <Button
            type="button"
            onClick={irParaLogin}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Ir para o login
          </Button>
        </section>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8 sm:px-6">
        <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg sm:p-8">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Recuperação de senha
            </h1>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              Link de recuperação inválido ou ausente.
            </p>
          </div>
          <Button
            type="button"
            onClick={irParaLogin}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Ir para o login
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8 sm:px-6">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg sm:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Redefinir senha
          </h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Defina sua nova senha abaixo.
          </p>
        </div>

        {erro && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {erro}
          </div>
        )}

        <form onSubmit={enviar} className="space-y-5" noValidate>
          <div>
            <label
              htmlFor="novaSenha"
              className="block text-sm font-medium text-slate-700"
            >
              Nova senha
            </label>
            <Input
              id="novaSenha"
              name="novaSenha"
              type="password"
              autoComplete="new-password"
              autoCapitalize="none"
              spellCheck={false}
              required
              minLength={8}
              disabled={carregando}
              value={novaSenha}
              onChange={(evento) => setNovaSenha(evento.target.value)}
              className="mt-1 w-full text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="Digite sua nova senha"
            />
          </div>

          <div>
            <label
              htmlFor="confirmarSenha"
              className="block text-sm font-medium text-slate-700"
            >
              Confirmar nova senha
            </label>
            <Input
              id="confirmarSenha"
              name="confirmarSenha"
              type="password"
              autoComplete="new-password"
              autoCapitalize="none"
              spellCheck={false}
              required
              minLength={8}
              disabled={carregando}
              value={confirmarSenha}
              onChange={(evento) => setConfirmarSenha(evento.target.value)}
              className="mt-1 w-full text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="Confirme sua nova senha"
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {carregando ? "Redefinindo..." : "Redefinir senha"}
          </button>
        </form>
      </section>
    </main>
  );
}
