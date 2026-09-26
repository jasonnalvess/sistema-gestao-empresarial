"use client";

import { useAuth } from "@/contexts/AuthContext";

function obterSaudacao() {
  const hora = new Date().getHours();

  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";

  return "Boa noite";
}

function formatarData() {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

export function DashboardWelcome() {
  const { usuario } = useAuth();

  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h2 className="break-words text-xl font-bold text-slate-900 sm:text-2xl">
            {obterSaudacao()}, {usuario?.nome ?? "usuário"} 👋
          </h2>

          <p className="mt-1 break-words text-slate-600">
            Bem-vindo ao Sistema de Gestão Empresarial.
          </p>
        </div>

        <div className="shrink-0 text-sm text-slate-500 capitalize">
          {formatarData()}
        </div>
      </div>
    </div>
  );
}
