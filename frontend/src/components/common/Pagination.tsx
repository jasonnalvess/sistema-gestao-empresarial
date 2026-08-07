import { Button } from "@/components/ui/button";

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: PaginationProps) {
  return (
    <nav
      aria-label="Paginação"
      className="mt-5 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-center text-sm text-slate-500 sm:text-left">
        Página {page} de {totalPages}
      </p>

      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </Button>

        <Button
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
        </Button>
      </div>
    </nav>
  );
}
