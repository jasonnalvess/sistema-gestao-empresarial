"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { QueryProvider } from "@/contexts/QueryProvider";
import { Toaster } from "@/components/ui/sonner";
import { EmpresaSelecionadaProvider } from "@/contexts/EmpresaSelecionadaContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <EmpresaSelecionadaProvider>
          {children}
          <Toaster richColors position="top-right" />
        </EmpresaSelecionadaProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
