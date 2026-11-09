"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

import { api } from "@/services/api";
import { obterMensagemErro } from "@/lib/api-error";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type EsqueciSenhaResponse = {
  data: {
    message: string;
  };
};

export default function EsqueciSenhaPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (carregando) {
      return;
    }

    const emailNormalizado = email.trim().toLowerCase();

    if (!emailNormalizado) {
      setErro("Informe o e-mail.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailNormalizado)) {
      setErro("Informe um e-mail válido.");
      return;
    }

    setErro("");
    setCarregando(true);

    try {
      await api.post<EsqueciSenhaResponse>("/auth/esqueci-senha", {
        email: emailNormalizado,
      });
      // A API retorna resposta genérica (anti-enumeração). Qualquer resposta de
      // sucesso é tratada como confirmação sem revelar a existência da conta.
      setSucesso(true);
    } catch (errorDesconhecido: unknown) {
      if (axios.isAxiosError(errorDesconhecido)) {
        if (!errorDesconhecido.response) {
          setErro(
            "Não foi possível conectar ao servidor. Verifique sua conexão.",
          );
          return;
        }
        const status = errorDesconhecido.response?.status;
        if (status === 400) {
          setErro(
            obterMensagemErro(
              errorDesconhecido,
              "Não foi possível processar a solicitação. Tente novamente.",
            ),
          );
          return;
        }
      }
      // Qualquer outra resposta de sucesso é tratada como confirmação genérica.
      setSucesso(true);
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
              Recuperação de senha
            </h1>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              Caso o endereço informado esteja cadastrado e possa receber
              recuperação, você receberá as instruções por e-mail.
            </p>
          </div>
          <Button
            type="button"
            onClick={irParaLogin}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Voltar para o login
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
            Esqueci minha senha
          </h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Informe seu e-mail cadastrado para receber as instruções de
            recuperação.
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
              htmlFor="email"
              className="block text-sm font-medium text-slate-700"
            >
              E-mail
            </label>
            <Input
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
              className="mt-1 w-full text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="Digite seu e-mail"
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {carregando ? "Enviando..." : "Enviar instruções de recuperação"}
          </button>
        </form>

        <Button
          type="button"
          onClick={irParaLogin}
          variant="outline"
          className="w-full mt-4"
        >
          Voltar para o login
        </Button>
      </section>
    </main>
  );
}
