import Link from "next/link";
import { Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OrdemServicoStatusBadge } from "@/components/ordens-servico/OrdemServicoStatusBadge";
import { OrdemServicoPrioridadeBadge } from "@/components/ordens-servico/OrdemServicoPrioridadeBadge";

type OrdemServicoResumo = {
  id: string;
  numero: number;
  titulo: string;
  status: string;
  prioridade: string;
  dataAbertura: string;
};

type Props = {
  ordens?: OrdemServicoResumo[];
};

export function ClienteOrdensServicoCard({
  ordens = [],
}: Props) {
  if (ordens.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
        <Wrench className="mx-auto mb-3 text-slate-400" aria-hidden="true" />

        <p className="font-medium text-slate-900">
          Nenhuma ordem de serviço vinculada.
        </p>

        <p className="mt-1 text-sm text-slate-500">
          As ordens de serviço criadas para este cliente aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-3">
      {ordens.map((ordem) => (
        <div
          key={ordem.id}
          className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="break-words font-semibold text-slate-900">
                OS #{ordem.numero} — {ordem.titulo}
              </p>

              <p className="text-sm text-slate-500">
                Aberta em{" "}
                {new Date(ordem.dataAbertura).toLocaleString("pt-BR")}
              </p>
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <OrdemServicoStatusBadge status={ordem.status} />
              <OrdemServicoPrioridadeBadge prioridade={ordem.prioridade} />

              <Button asChild variant="outline" size="sm">
                <Link href={`/ordens-servico/${ordem.id}`}>
                  Detalhes
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
