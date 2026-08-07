import { CalendarDays } from "lucide-react";
import { AgendaStatusBadge } from "@/components/agenda/AgendaStatusBadge";

type Atendimento = {
  id: string;
  titulo: string;
  descricao?: string | null;
  dataInicio: string;
  dataFim: string;
  status: string;
  local?: string | null;
  createdAt: string;
};

type Props = {
  atendimentos: Atendimento[];
};

export function ClienteTimeline({ atendimentos }: Props) {
  const itens = [...atendimentos].sort(
    (a, b) =>
      new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime()
  );

  if (itens.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Nenhuma movimentação encontrada para este cliente.
      </p>
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      {itens.map((item) => (
        <div key={item.id} className="flex min-w-0 gap-3">
          <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
            <CalendarDays aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="break-words font-semibold text-slate-900">
                  {item.titulo}
                </p>

                <p className="text-sm text-slate-500">
                  {new Date(item.dataInicio).toLocaleString("pt-BR")}
                </p>
              </div>

              <AgendaStatusBadge status={item.status} />
            </div>

            {item.descricao && (
              <p className="mt-2 break-words text-sm text-slate-600">
                {item.descricao}
              </p>
            )}

            {item.local && (
              <p className="mt-2 break-words text-xs text-slate-500">
                Local: {item.local}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
