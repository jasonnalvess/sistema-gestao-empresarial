"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { autenticado, carregando } = useAuth();
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);

  useEffect(() => {
    if (!carregando && !autenticado) {
      router.push("/login");
    }
  }, [autenticado, carregando, router]);

  useEffect(() => {
    if (!menuMobileAberto) return;

    const fecharComEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuMobileAberto(false);
      }
    };

    document.addEventListener("keydown", fecharComEscape);
    return () => document.removeEventListener("keydown", fecharComEscape);
  }, [menuMobileAberto]);

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-600">Carregando sistema...</p>
      </main>
    );
  }

  if (!autenticado) {
    return null;
  }

  return (
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
  );
}
