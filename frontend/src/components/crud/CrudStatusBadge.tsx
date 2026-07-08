type Props = {
  ativo: boolean;
};

export function CrudStatusBadge({ ativo }: Props) {
  return (
    <span
      className={
        ativo
          ? "rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700"
          : "rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700"
      }
    >
      {ativo ? "Ativo" : "Inativo"}
    </span>
  );
}
