import { CalendarCheck, Clock, CheckCircle, XCircle, CalendarDays } from "lucide-react";
import { StatsCard } from "@/components/common/StatsCard";
import { AgendaEvento } from "@/services/agenda.service";

type Props = {
  eventos: AgendaEvento[];
};

export function AgendaSummaryCards({ eventos }: Props) {
  const total = eventos.length;
  const agendados = eventos.filter((e) => e.status === "AGENDADO").length;
  const emAndamento = eventos.filter((e) => e.status === "EM_ANDAMENTO").length;
  const concluidos = eventos.filter((e) => e.status === "CONCLUIDO").length;
  const cancelados = eventos.filter((e) => e.status === "CANCELADO").length;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatsCard title="Total" value={total} icon={<CalendarDays size={22} />} />
      <StatsCard title="Agendados" value={agendados} icon={<CalendarCheck size={22} />} />
      <StatsCard title="Em andamento" value={emAndamento} icon={<Clock size={22} />} />
      <StatsCard title="Concluídos" value={concluidos} icon={<CheckCircle size={22} />} />
      <StatsCard title="Cancelados" value={cancelados} icon={<XCircle size={22} />} />
    </div>
  );
}
