import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AcessoNegado() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <ShieldAlert
          aria-hidden="true"
          className="mx-auto text-amber-500"
          size={40}
        />
        <h1 className="mt-4 text-xl font-semibold text-slate-900">
          Acesso não autorizado
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Você não possui permissão para acessar este recurso.
        </p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">Voltar ao início</Link>
        </Button>
      </div>
    </div>
  );
}
