"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";

type ProtectedRouteProps = {
  children: ReactNode;
};

export function ProtectedRoute({
  children,
}: ProtectedRouteProps) {
  const router = useRouter();

  const {
    autenticado,
    carregando,
  } = useAuth();

  useEffect(() => {
    if (!carregando && !autenticado) {
      router.replace("/login");
    }
  }, [autenticado, carregando, router]);

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-600">
          Carregando sistema...
        </p>
      </main>
    );
  }

  if (!autenticado) {
    return null;
  }

  return <>{children}</>;
}
