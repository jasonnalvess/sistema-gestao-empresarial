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
    <div className="space-y-4">
      {itens.map((item) => (
        <div key={item.id} className="flex gap-3">
          <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
            <CalendarDays size={18} />
          </div>

          <div className="flex-1 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-slate-900">
                  {item.titulo}
                </p>

                <p className="text-sm text-slate-500">
                  {new Date(item.dataInicio).toLocaleString("pt-BR")}
                </p>
              </div>

              <AgendaStatusBadge status={item.status} />
            </div>

            {item.descricao && (
              <p className="mt-2 text-sm text-slate-600">
                {item.descricao}
              </p>
            )}

            {item.local && (
              <p className="mt-2 text-xs text-slate-500">
                Local: {item.local}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
