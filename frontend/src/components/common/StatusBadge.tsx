type StatusBadgeProps = {
  ativo: boolean;
};

export function StatusBadge({ ativo }: StatusBadgeProps) {
  return (
    <span
      className={
        ativo
          ? "inline-flex whitespace-nowrap rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700"
          : "inline-flex whitespace-nowrap rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700"
      }
    >
      {ativo ? "Ativo" : "Inativo"}
    </span>
  );
}
