"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { Button } from "@/components/ui/button";
import { LogOut, Menu } from "lucide-react";

interface HeaderProps {
  menuAberto: boolean;
  aoAbrirMenu: () => void;
}

export function Header({ menuAberto, aoAbrirMenu }: HeaderProps) {
  const { usuario, logout } = useAuth();
  const {
    empresas,
    empresaSelecionadaId,
    selecionarEmpresa,
    limparEmpresa,
    carregando: carregandoEmpresas,
  } = useEmpresaSelecionada();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={aoAbrirMenu}
          aria-label="Abrir menu"
          aria-controls="menu-lateral"
          aria-expanded={menuAberto}
        >
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
        {usuario?.tipo === "SUPER_ADMIN" && (
          <label className="hidden items-center gap-2 text-sm md:flex">
            <span className="text-slate-600">Empresa</span>
            <select
              aria-label="Empresa selecionada"
              value={empresaSelecionadaId ?? ""}
              disabled={carregandoEmpresas}
              onChange={(event) =>
                event.target.value
                  ? selecionarEmpresa(event.target.value)
                  : limparEmpresa()
              }
              className="max-w-56 rounded-md border border-slate-300 bg-white px-2 py-1.5"
            >
              <option value="">Selecione...</option>
              {empresas.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.nome}
                </option>
              ))}
            </select>
          </label>
        )}
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
