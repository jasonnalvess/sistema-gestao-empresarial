"use client";

import {
  ChevronDown,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";

interface HeaderProps {
  menuAberto: boolean;
  sidebarRecolhida: boolean;
  aoAlternarSidebar: () => void;
}

export function Header({
  menuAberto,
  sidebarRecolhida,
  aoAlternarSidebar,
}: HeaderProps) {
  const { usuario, logout } = useAuth();
  const {
    empresas,
    empresaSelecionadaId,
    selecionarEmpresa,
    limparEmpresa,
    carregando: carregandoEmpresas,
  } = useEmpresaSelecionada();

  return (
    <header className="sticky top-0 z-30 flex min-h-16 w-full min-w-0 items-center gap-2 border-b bg-white px-3 sm:gap-3 sm:px-4 lg:px-6">
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          className="md:hidden"
          aria-label="Abrir menu"
          aria-controls="menu-lateral-mobile"
          aria-expanded={menuAberto}
        >
          <Menu aria-hidden="true" />
        </Button>
      </SheetTrigger>

      <Button
        variant="ghost"
        size="icon-lg"
        className="hidden md:inline-flex"
        onClick={aoAlternarSidebar}
        aria-label={
          sidebarRecolhida ? "Expandir menu lateral" : "Recolher menu lateral"
        }
        aria-controls="menu-lateral-desktop"
        aria-expanded={!sidebarRecolhida}
      >
        {sidebarRecolhida ? (
          <PanelLeftOpen aria-hidden="true" />
        ) : (
          <PanelLeftClose aria-hidden="true" />
        )}
      </Button>

      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-semibold text-slate-900">
          <span className="sm:hidden">Sistema Gestão</span>
          <span className="hidden sm:inline">
            Sistema de Gestão Empresarial
          </span>
        </h2>
        <p className="hidden truncate text-xs text-slate-500 sm:block">
          Ambiente de teste
        </p>
      </div>

      <div className="flex min-w-0 shrink items-center gap-1.5 sm:gap-3">
        {usuario?.tipo === "SUPER_ADMIN" && (
          <label className="min-w-0">
            <span className="sr-only">Empresa</span>
            <select
              aria-label="Empresa selecionada"
              value={empresaSelecionadaId ?? ""}
              disabled={carregandoEmpresas}
              onChange={(event) =>
                event.target.value
                  ? selecionarEmpresa(event.target.value)
                  : limparEmpresa()
              }
              className="h-9 w-[min(34vw,12rem)] min-w-0 truncate rounded-md border border-slate-300 bg-white px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-48 lg:w-56"
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-10 min-w-0 max-w-44 gap-2 px-2"
              aria-label="Abrir menu do usuário"
            >
              <UserRound aria-hidden="true" />
              <span className="hidden min-w-0 text-left sm:block">
                <span className="block truncate text-sm font-medium">
                  {usuario?.nome ?? "Usuário"}
                </span>
                <span className="block truncate text-xs text-slate-500">
                  {usuario?.tipo}
                </span>
              </span>
              <ChevronDown className="hidden sm:block" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-64 max-w-[calc(100vw-1rem)]"
          >
            <DropdownMenuLabel className="min-w-0">
              <span className="block truncate text-sm text-foreground">
                {usuario?.nome ?? "Usuário"}
              </span>
              <span className="block truncate font-normal">
                {usuario?.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={logout}>
              <LogOut aria-hidden="true" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
