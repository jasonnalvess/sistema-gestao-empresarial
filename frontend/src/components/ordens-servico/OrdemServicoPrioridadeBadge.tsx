type Props = {
  prioridade: string;
};

const PRIORIDADES = {
  BAIXA: {
    label: "Baixa",
    className: "bg-slate-100 text-slate-700",
  },
  NORMAL: {
    label: "Normal",
    className: "bg-blue-100 text-blue-700",
  },
  ALTA: {
    label: "Alta",
    className: "bg-orange-100 text-orange-700",
  },
  URGENTE: {
    label: "Urgente",
    className: "bg-red-100 text-red-700",
  },
} as const;

export function OrdemServicoPrioridadeBadge({
  prioridade,
}: Props) {
  const config =
    PRIORIDADES[prioridade as keyof typeof PRIORIDADES] ?? {
      label: prioridade,
      className: "bg-slate-100 text-slate-700",
    };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
