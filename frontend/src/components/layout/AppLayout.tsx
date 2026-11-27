"use client";

import { ReactNode, useState } from "react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Sheet } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { CODIGO_EMPRESA_INATIVA } from "@/services/api";
import { Header } from "./Header";
import { DesktopSidebar, MobileSidebar } from "./Sidebar";

const SIDEBAR_RECOLHIDA_STORAGE_KEY = "layout.sidebar.recolhida";

function obterPreferenciaSidebarRecolhida(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return (
      window.localStorage.getItem(SIDEBAR_RECOLHIDA_STORAGE_KEY) === "true"
    );
  } catch {
    return false;
  }
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { bloqueioComercial, limparBloqueioComercial } = useAuth();
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const [sidebarRecolhida, setSidebarRecolhida] = useState(
    obterPreferenciaSidebarRecolhida,
  );

  function alternarSidebar() {
    setSidebarRecolhida((recolhidaAtual) => {
      const novoEstado = !recolhidaAtual;

      try {
        window.localStorage.setItem(
          SIDEBAR_RECOLHIDA_STORAGE_KEY,
          String(novoEstado),
        );
      } catch {
        // A preferência visual é opcional; o layout continua funcional sem ela.
      }

      return novoEstado;
    });
  }

  function fecharMenuMobile() {
    setMenuMobileAberto(false);
  }

  return (
    <ProtectedRoute>
      <Sheet open={menuMobileAberto} onOpenChange={setMenuMobileAberto}>
        <div className="flex min-h-dvh w-full overflow-x-hidden bg-slate-100">
          <DesktopSidebar recolhida={sidebarRecolhida} />
          <MobileSidebar aoNavegar={fecharMenuMobile} />

          <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
            <Header
              menuAberto={menuMobileAberto}
              sidebarRecolhida={sidebarRecolhida}
              aoAlternarSidebar={alternarSidebar}
            />

            {bloqueioComercial ? (
              <div
                role="status"
                aria-live="polite"
                className="border-b border-amber-300 bg-amber-50 text-amber-900"
              >
                <div className="mx-auto flex w-full max-w-[1920px] items-start justify-between gap-3 px-3 py-2 text-sm sm:px-4 lg:px-6">
                  <p className="min-w-0">
                    <span className="font-semibold">
                      {bloqueioComercial.codigo === CODIGO_EMPRESA_INATIVA
                        ? "Empresa inativa."
                        : "Acesso comercial bloqueado."}
                    </span>{" "}
                    {bloqueioComercial.mensagem}
                  </p>
                  <button
                    type="button"
                    onClick={limparBloqueioComercial}
                    className="shrink-0 rounded border border-amber-400 px-2 py-0.5 text-xs font-medium text-amber-900 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            ) : null}

            <main className="min-w-0 flex-1 overflow-x-hidden p-3 sm:p-4 lg:p-6">
              <div className="mx-auto w-full min-w-0 max-w-[1920px]">
                {children}
              </div>
            </main>
          </div>
        </div>
      </Sheet>
    </ProtectedRoute>
  );
}
