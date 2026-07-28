"use client";

import { ReactNode, useEffect, useState } from "react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function AppLayout({ children }: { children: ReactNode }) {
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);

  useEffect(() => {
    if (!menuMobileAberto) {
      return;
    }

    const fecharComEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuMobileAberto(false);
      }
    };

    document.addEventListener("keydown", fecharComEscape);

    return () => {
      document.removeEventListener("keydown", fecharComEscape);
    };
  }, [menuMobileAberto]);

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-slate-100">
        <Sidebar
          aberto={menuMobileAberto}
          aoFechar={() => setMenuMobileAberto(false)}
        />

        <div className="flex min-h-screen flex-1 flex-col">
          <Header
            menuAberto={menuMobileAberto}
            aoAbrirMenu={() => setMenuMobileAberto(true)}
          />

          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
