type Props = {
  status: string;
};

const STATUS = {
  ABERTA: {
    label: "Aberta",
    className: "bg-blue-100 text-blue-700",
  },
  EM_ANDAMENTO: {
    label: "Em andamento",
    className: "bg-yellow-100 text-yellow-700",
  },
  CONCLUIDA: {
    label: "Concluída",
    className: "bg-green-100 text-green-700",
  },
  CANCELADA: {
    label: "Cancelada",
    className: "bg-red-100 text-red-700",
  },
} as const;

export function OrdemServicoStatusBadge({ status }: Props) {
  const config =
    STATUS[status as keyof typeof STATUS] ?? {
      label: status,
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
