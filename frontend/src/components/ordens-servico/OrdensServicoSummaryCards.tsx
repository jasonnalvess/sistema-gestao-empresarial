
import {
  Wrench,
  FolderOpen,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";

import { StatsCard } from "@/components/common/StatsCard";
import { OrdemServico } from "@/services/ordens-servico.service";

type Props = {
  ordens: OrdemServico[];
};

export function OrdensServicoSummaryCards({ ordens }: Props) {
  const total = ordens.length;
  const abertas = ordens.filter((o) => o.status === "ABERTA").length;
  const emAndamento = ordens.filter((o) => o.status === "EM_ANDAMENTO").length;
  const concluidas = ordens.filter((o) => o.status === "CONCLUIDA").length;
  const canceladas = ordens.filter((o) => o.status === "CANCELADA").length;
  const urgentes = ordens.filter((o) => o.prioridade === "URGENTE").length;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
      <StatsCard title="Total" value={total} icon={<Wrench size={22} />} />
      <StatsCard title="Abertas" value={abertas} icon={<FolderOpen size={22} />} />
      <StatsCard title="Em andamento" value={emAndamento} icon={<Clock size={22} />} />
      <StatsCard title="Concluídas" value={concluidas} icon={<CheckCircle size={22} />} />
      <StatsCard title="Canceladas" value={canceladas} icon={<XCircle size={22} />} />
      <StatsCard title="Urgentes" value={urgentes} icon={<AlertTriangle size={22} />} />
    </div>
  );
}
