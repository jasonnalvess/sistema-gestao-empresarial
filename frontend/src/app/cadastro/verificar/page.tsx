"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

import { api } from "@/services/api";
import { obterMensagemErro } from "@/lib/api-error";
import { Input } from "@/components/ui/input";

type ConcluirResponse = {
  data: {
    message: string;
    empresaId: string;
    usuarioId: string;
  };
};

const LIMITE_BYTES_SENHA = 72;
const MINIMO_CARACTERES_SENHA = 8;

function bytesUtf8(valor: string): number {
  return new TextEncoder().encode(valor).length;
}

function validarSenha(valor: string): string | null {
  if (valor.length < MINIMO_CARACTERES_SENHA) {
    return `A senha deve ter no mínimo ${MINIMO_CARACTERES_SENHA} caracteres.`;
  }
  if (bytesUtf8(valor) > LIMITE_BYTES_SENHA) {
    return `A senha deve ter no máximo ${LIMITE_BYTES_SENHA} bytes (UTF-8).`;
  }
  return null;
}

export default function VerificarCadastroPage() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [tokenAusente, setTokenAusente] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const tokenProcessadoRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (tokenProcessadoRef.current) {
      return;
    }
    tokenProcessadoRef.current = true;

    let efeitoAtivo = true;

    queueMicrotask(() => {
      if (!efeitoAtivo) return;

      const parametros = new URLSearchParams(window.location.search);
      const tokenExtraido = parametros.get("token");

      if (tokenExtraido && tokenExtraido.trim().length > 0) {
        const tokenNormalizado = tokenExtraido.trim();
        setToken(tokenNormalizado);
        setTokenAusente(false);
        // Remove o token da barra de endereço sem recarregar a página.
        // O token permanece apenas em memória durante a operação.
        window.history.replaceState({}, "", window.location.pathname);
      } else {
        setToken(null);
        setTokenAusente(true);
      }
    });

    return () => {
      efeitoAtivo = false;
    };
  }, []);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (carregando || !token) return;

    if (!senha || !confirmarSenha) {
      setErro("Preencha a senha e a confirmação.");
      return;
    }

    const erroSenha = validarSenha(senha);
    if (erroSenha) {
      setErro(erroSenha);
      return;
    }

    const erroConfirmacao = validarSenha(confirmarSenha);
    if (erroConfirmacao) {
      setErro(erroConfirmacao);
      return;
    }

    if (senha !== confirmarSenha) {
      setErro("A senha e a confirmação não coincidem.");
      return;
    }

    setErro("");
    setCarregando(true);

    try {
      await api.post<ConcluirResponse>("/cadastro-publico/solicitacoes/conclusao", {
        token,
        senha,
        confirmarSenha,
      });
      setSucesso(true);
      setToken(null);
      setSenha("");
      setConfirmarSenha("");
    } catch (erroDesconhecido: unknown) {
      if (axios.isAxiosError(erroDesconhecido)) {
        const status = erroDesconhecido.response?.status;

        if (status === 400) {
          setErro(
            obterMensagemErro(
              erroDesconhecido,
              "Token inválido, expirado ou já utilizado. Solicite um novo cadastro.",
            ),
          );
          return;
        }

        if (status === 403) {
          setErro(
            obterMensagemErro(
              erroDesconhecido,
              "Limite de tentativas excedido. Tente novamente em alguns minutos.",
            ),
          );
          return;
        }

        if (!erroDesconhecido.response) {
          setErro(
            "Não foi possível conectar ao servidor. Verifique sua conexão.",
          );
          return;
        }
      }

      setErro("Não foi possível concluir o cadastro. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  if (sucesso) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8 sm:px-6">
        <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg sm:p-8">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Cadastro concluído
            </h1>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              Seu cadastro foi concluído com sucesso. Acesse o sistema com o
              e-mail e a senha definidos.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.replace("/login")}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Ir para o login
          </button>
        </section>
      </main>
    );
  }

  if (tokenAusente || !token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8 sm:px-6">
        <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg sm:p-8">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Verificação de cadastro
            </h1>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              Link de verificação inválido ou ausente. Solicite um novo cadastro.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.replace("/cadastro")}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Solicitar cadastro
          </button>
          <button
            type="button"
            onClick={() => router.replace("/login")}
            className="mt-3 w-full rounded-lg border border-slate-300 px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Voltar para o login
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8 sm:px-6">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg sm:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Definir senha
          </h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Crie sua senha para concluir o cadastro.
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
              htmlFor="senha"
              className="block text-sm font-medium text-slate-700"
            >
              Senha
            </label>
            <Input
              id="senha"
              name="senha"
              type="password"
              autoComplete="new-password"
              autoCapitalize="none"
              spellCheck={false}
              required
              disabled={carregando}
              value={senha}
              onChange={(evento) => setSenha(evento.target.value)}
              className="mt-1 w-full text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="Digite sua senha"
            />
            <p className="mt-1 text-xs text-slate-500">
              Mínimo de {MINIMO_CARACTERES_SENHA} caracteres e no máximo{" "}
              {LIMITE_BYTES_SENHA} bytes (UTF-8).
            </p>
          </div>

          <div>
            <label
              htmlFor="confirmarSenha"
              className="block text-sm font-medium text-slate-700"
            >
              Confirmar senha
            </label>
            <Input
              id="confirmarSenha"
              name="confirmarSenha"
              type="password"
              autoComplete="new-password"
              autoCapitalize="none"
              spellCheck={false}
              required
              disabled={carregando}
              value={confirmarSenha}
              onChange={(evento) => setConfirmarSenha(evento.target.value)}
              className="mt-1 w-full text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="Confirme sua senha"
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {carregando ? "Concluindo..." : "Concluir cadastro"}
          </button>
        </form>
      </section>
    </main>
  );
}
