"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";

type ProtectedRouteProps = {
  children: ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();

  const { usuario, autenticado, carregando } = useAuth();

  useEffect(() => {
    if (!carregando && !autenticado) {
      router.replace("/login");
    }
    if (
      !carregando &&
      autenticado &&
      usuario?.trocaSenhaObrigatoria &&
      pathname !== "/trocar-senha"
    ) {
      router.replace("/trocar-senha");
    }
    if (
      !carregando &&
      autenticado &&
      usuario?.trocaSenhaObrigatoria === false &&
      pathname === "/trocar-senha"
    ) {
      router.replace("/dashboard");
    }
  }, [autenticado, carregando, router, usuario, pathname]);

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-600">Carregando sistema...</p>
      </main>
    );
  }

  if (
    !autenticado ||
    (usuario?.trocaSenhaObrigatoria && pathname !== "/trocar-senha") ||
    (usuario?.trocaSenhaObrigatoria === false && pathname === "/trocar-senha")
  ) {
    return null;
  }

  return <>{children}</>;
}
