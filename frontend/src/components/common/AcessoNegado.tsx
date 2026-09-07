import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AcessoNegado() {
  return (
    <div className="flex min-h-[50vh] min-w-0 items-center justify-center py-6">
      <div className="w-full min-w-0 max-w-md rounded-lg border border-slate-200 bg-white p-5 text-center shadow-sm sm:p-8">
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
        <Button asChild className="mt-6 w-full sm:w-auto">
          <Link href="/dashboard">Voltar ao início</Link>
        </Button>
      </div>
    </div>
  );
}
