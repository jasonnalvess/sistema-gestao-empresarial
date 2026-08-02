import { StatusInventarioEstoque } from "@/services/inventarios.service";

const statusVisual: Record<StatusInventarioEstoque, { label: string; classe: string }> = {
  ABERTO: { label: "Aberto", classe: "bg-blue-100 text-blue-700" },
  EM_CONTAGEM: { label: "Em contagem", classe: "bg-amber-100 text-amber-700" },
  FINALIZADO: { label: "Finalizado", classe: "bg-green-100 text-green-700" },
  CANCELADO: { label: "Cancelado", classe: "bg-slate-200 text-slate-700" },
};

export function InventarioStatusBadge({ status }: { status: StatusInventarioEstoque }) {
  const visual = statusVisual[status];
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${visual.classe}`}>{visual.label}</span>;
}
