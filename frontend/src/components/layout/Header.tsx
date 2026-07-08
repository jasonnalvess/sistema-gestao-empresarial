"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Menu } from "lucide-react";

export function Header() {
  const { usuario, logout } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu size={20} />
        </Button>

        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Sistema de Gestão Empresarial
          </h2>
          <p className="text-xs text-slate-500">Ambiente de teste</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-slate-900">
            {usuario?.nome ?? "Usuário"}
          </p>
          <p className="text-xs text-slate-500">{usuario?.tipo}</p>
        </div>

        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut size={16} className="mr-2" />
          Sair
        </Button>
      </div>
    </header>
  );
}
