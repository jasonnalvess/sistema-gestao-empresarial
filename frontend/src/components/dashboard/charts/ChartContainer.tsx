import { ReactNode } from "react";

interface ChartContainerProps {
  title: string;
  description?: string;
  children: ReactNode;
  isLoading?: boolean;
  errorMessage?: string;
  isEmpty?: boolean;
  emptyMessage?: string;
}

export function ChartContainer({
  title,
  description,
  children,
  isLoading = false,
  errorMessage,
  isEmpty = false,
  emptyMessage = "Nenhum dado disponível.",
}: ChartContainerProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>

      <div className="mt-5 h-72 min-w-0" aria-live="polite">
        {isLoading ? (
          <div className="h-full animate-pulse rounded-lg bg-slate-100" />
        ) : errorMessage ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 text-center text-sm text-red-700">
            {errorMessage}
          </div>
        ) : isEmpty ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-300 px-4 text-center text-sm text-slate-500">
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
