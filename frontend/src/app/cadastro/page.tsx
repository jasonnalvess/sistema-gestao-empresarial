"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

import { api } from "@/services/api";
import { obterMensagemErro } from "@/lib/api-error";
import { Input } from "@/components/ui/input";

type SolicitarResponse = {
  data: {
    message: string;
  };
};

type ReenviarResponse = {
  data: {
    message: string;
  };
};

const MENSAGEM_PADRAO =
  "Se os dados informados puderem ser utilizados, enviaremos as instruções de verificação para o e-mail informado.";

function validarEmail(valor: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

function mascararCnpj(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 14);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 5) return `${digitos.slice(0, 2)}.${digitos.slice(2)}`;
  if (digitos.length <= 8)
    return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5)}`;
  if (digitos.length <= 12)
    return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8)}`;
  return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12)}`;
}

export default function CadastroPage() {
  const router = useRouter();

  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [cnpjEmpresa, setCnpjEmpresa] = useState("");
  const [nomeResponsavel, setNomeResponsavel] = useState("");
  const [email, setEmail] = useState("");

  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState("");

  const [reenviando, setReenviando] = useState(false);
  const [mensagemReenvio, setMensagemReenvio] = useState("");

  async function solicitar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (carregando) return;

    const nomeEmpresaLimpo = nomeEmpresa.trim();
    const nomeResponsavelLimpo = nomeResponsavel.trim();
    const emailNormalizado = email.trim().toLowerCase();
    const cnpjLimpo = cnpjEmpresa.trim();

    if (nomeEmpresaLimpo.length < 2) {
      setErro("O nome da empresa deve ter no mínimo 2 caracteres.");
      return;
    }
    if (nomeEmpresaLimpo.length > 150) {
      setErro("O nome da empresa deve ter no máximo 150 caracteres.");
      return;
    }
    if (nomeResponsavelLimpo.length < 2) {
      setErro("O nome do responsável deve ter no mínimo 2 caracteres.");
      return;
    }
    if (nomeResponsavelLimpo.length > 150) {
      setErro("O nome do responsável deve ter no máximo 150 caracteres.");
      return;
    }
    if (!validarEmail(emailNormalizado)) {
      setErro("Informe um e-mail válido.");
      return;
    }
    if (cnpjLimpo.length > 18) {
      setErro("CNPJ inválido.");
      return;
    }

    setErro("");
    setCarregando(true);

    try {
      await api.post<SolicitarResponse>("/cadastro-publico/solicitacoes", {
        nomeEmpresa: nomeEmpresaLimpo,
        cnpjEmpresa: cnpjLimpo || undefined,
        nomeResponsavel: nomeResponsavelLimpo,
        email: emailNormalizado,
      });
      setEmailEnviado(emailNormalizado);
      setEnviado(true);
    } catch (erroDesconhecido: unknown) {
      if (axios.isAxiosError(erroDesconhecido)) {
        if (!erroDesconhecido.response) {
          setErro(
            "Não foi possível conectar ao servidor. Verifique sua conexão.",
          );
          return;
        }
        const status = erroDesconhecido.response?.status;
        if (status === 400) {
          setErro(
            obterMensagemErro(
              erroDesconhecido,
              "Não foi possível processar a solicitação. Verifique os dados.",
            ),
          );
          return;
        }
        if (status === 403) {
          setErro(
            obterMensagemErro(
              erroDesconhecido,
              "Limite de solicitações excedido. Tente novamente em alguns minutos.",
            ),
          );
          return;
        }
      }
      setErro("Não foi possível solicitar o cadastro. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  async function reenviar() {
    if (reenviando || !emailEnviado) return;

    setReenviando(true);
    setMensagemReenvio("");

    try {
      await api.post<ReenviarResponse>("/cadastro-publico/solicitacoes/reenvio", {
        email: emailEnviado,
      });
      setMensagemReenvio(MENSAGEM_PADRAO);
    } catch (erroDesconhecido: unknown) {
      if (axios.isAxiosError(erroDesconhecido)) {
        if (!erroDesconhecido.response) {
          setMensagemReenvio(
            "Não foi possível conectar ao servidor. Verifique sua conexão.",
          );
          return;
        }
        const status = erroDesconhecido.response?.status;
        if (status === 403) {
          setMensagemReenvio(
            obterMensagemErro(
              erroDesconhecido,
              "Limite de solicitações excedido. Tente novamente em alguns minutos.",
            ),
          );
          return;
        }
      }
      setMensagemReenvio(
        "Não foi possível reenviar o e-mail. Tente novamente.",
      );
    } finally {
      setReenviando(false);
    }
  }

  if (enviado) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8 sm:px-6">
        <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg sm:p-8">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Solicitação recebida
            </h1>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              {MENSAGEM_PADRAO}
            </p>
          </div>

          <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Verifique sua caixa de entrada e, se necessário, a pasta de spam.
            O link de verificação é válido por 24 horas e pode ser usado uma
            única vez.
          </div>

          {mensagemReenvio && (
            <div
              role="status"
              aria-live="polite"
              className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            >
              {mensagemReenvio}
            </div>
          )}

          <button
            type="button"
            onClick={reenviar}
            disabled={reenviando}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {reenviando ? "Reenviando..." : "Reenviar e-mail de verificação"}
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
            Solicitar cadastro
          </h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Preencha os dados da empresa para iniciar o cadastro.
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

        <form onSubmit={solicitar} className="space-y-5" noValidate>
          <div>
            <label
              htmlFor="nomeEmpresa"
              className="block text-sm font-medium text-slate-700"
            >
              Nome da empresa
            </label>
            <Input
              id="nomeEmpresa"
              name="nomeEmpresa"
              type="text"
              required
              disabled={carregando}
              value={nomeEmpresa}
              onChange={(evento) => setNomeEmpresa(evento.target.value)}
              className="mt-1 w-full text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="Razão social ou nome fantasia"
              maxLength={150}
            />
          </div>

          <div>
            <label
              htmlFor="cnpjEmpresa"
              className="block text-sm font-medium text-slate-700"
            >
              CNPJ (opcional)
            </label>
            <Input
              id="cnpjEmpresa"
              name="cnpjEmpresa"
              type="text"
              inputMode="numeric"
              disabled={carregando}
              value={cnpjEmpresa}
              onChange={(evento) =>
                setCnpjEmpresa(mascararCnpj(evento.target.value))
              }
              className="mt-1 w-full text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="00.000.000/0000-00"
              maxLength={18}
            />
          </div>

          <div>
            <label
              htmlFor="nomeResponsavel"
              className="block text-sm font-medium text-slate-700"
            >
              Nome do responsável
            </label>
            <Input
              id="nomeResponsavel"
              name="nomeResponsavel"
              type="text"
              required
              disabled={carregando}
              value={nomeResponsavel}
              onChange={(evento) => setNomeResponsavel(evento.target.value)}
              className="mt-1 w-full text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="Nome completo"
              maxLength={150}
            />
          </div>

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
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              disabled={carregando}
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
              className="mt-1 w-full text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="Digite seu e-mail"
              maxLength={254}
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {carregando ? "Enviando..." : "Solicitar cadastro"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => router.replace("/login")}
          className="mt-4 w-full rounded-lg border border-slate-300 px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Voltar para o login
        </button>
      </section>
    </main>
  );
}
