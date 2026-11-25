"use client";

import { ReactNode, useState } from "react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Sheet } from "@/components/ui/sheet";
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
