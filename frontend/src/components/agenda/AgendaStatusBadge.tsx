type Props = {
  status: string;
};

export function AgendaStatusBadge({ status }: Props) {
  const classes: Record<string, string> = {
    AGENDADO: "bg-blue-100 text-blue-700",
    EM_ANDAMENTO: "bg-yellow-100 text-yellow-700",
    CONCLUIDO: "bg-green-100 text-green-700",
    CANCELADO: "bg-red-100 text-red-700",
  };

  const labels: Record<string, string> = {
    AGENDADO: "Agendado",
    EM_ANDAMENTO: "Em andamento",
    CONCLUIDO: "Concluído",
    CANCELADO: "Cancelado",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium ${
        classes[status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}
