"use client";
import { useState, type FormEvent } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/services/api";
import { obterMensagemErro } from "@/lib/api-error";

export default function TrocarSenhaPage() {
  return (
    <ProtectedRoute>
      <Formulario />
    </ProtectedRoute>
  );
}
function Formulario() {
  const { logout, finalizarTrocaSenha } = useAuth();
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (salvando) return;
    const form = event.currentTarget;
    const campos = new FormData(form);
    const senhaAtual = String(campos.get("senhaAtual") ?? "");
    const novaSenha = String(campos.get("novaSenha") ?? "");
    if (novaSenha.length < 6 || novaSenha !== campos.get("confirmacao")) {
      setErro("Use pelo menos 6 caracteres e confirme a mesma nova senha.");
      return;
    }
    if (senhaAtual === novaSenha) {
      setErro("A nova senha deve ser diferente da atual.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      await api.post("/auth/trocar-senha", { senhaAtual, novaSenha });
      form.reset();
      finalizarTrocaSenha();
    } catch (error) {
      form.reset();
      setErro(obterMensagemErro(error, "Não foi possível alterar a senha."));
    } finally {
      setSalvando(false);
    }
  }
  return (
    <main className="flex min-h-dvh min-w-0 items-center justify-center bg-slate-100 px-4 py-6 sm:py-8">
      <section className="w-full min-w-0 max-w-md space-y-5 rounded-2xl bg-white p-4 shadow-sm [overflow-wrap:anywhere] sm:p-6">
        <h1 className="text-2xl font-bold">Alterar senha</h1>
        <p className="text-sm text-slate-600">
          Defina sua nova senha para continuar. Após a alteração, entre
          novamente no sistema.
        </p>
        <form
          onSubmit={enviar}
          className="min-w-0 space-y-4 [overflow-wrap:anywhere]"
        >
          <fieldset
            disabled={salvando}
            className="min-w-0 space-y-4 [overflow-wrap:anywhere]"
          >
            <label className="block min-w-0 space-y-1">
              Senha atual
              <Input
                name="senhaAtual"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            <label className="block min-w-0 space-y-1">
              Nova senha
              <Input
                name="novaSenha"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </label>
            <label className="block min-w-0 space-y-1">
              Confirmar nova senha
              <Input
                name="confirmacao"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </label>
          </fieldset>
          {erro && (
            <p role="alert" className="text-sm text-red-700">
              {erro}
            </p>
          )}
          <Button type="submit" disabled={salvando} className="w-full">
            {salvando ? "Alterando..." : "Alterar senha"}
          </Button>
        </form>
        <Button
          variant="outline"
          disabled={salvando}
          onClick={() => logout()}
          className="w-full"
        >
          Sair
        </Button>
      </section>
    </main>
  );
}
