import { ArrowDown, ArrowUp } from "lucide-react";
import { MovimentacaoEstoque } from "@/services/movimentacoes.service";

type Props = {
  movimentacoes: MovimentacaoEstoque[];
};

export function DashboardRecentMovements({ movimentacoes }: Props) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="break-words text-lg font-semibold text-slate-900">
        Últimas movimentações
      </h2>

      <div className="mt-5 space-y-4">
        {movimentacoes.map((mov) => {
          const entrada = mov.tipo === "ENTRADA";

          return (
            <div
              key={mov.id}
              className="flex min-w-0 items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 sm:p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={
                    entrada
                      ? "rounded-full bg-green-100 p-2 text-green-700"
                      : "rounded-full bg-red-100 p-2 text-red-700"
                  }
                >
                  {entrada ? (
                    <ArrowUp aria-hidden="true" />
                  ) : (
                    <ArrowDown aria-hidden="true" />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="break-words font-medium text-slate-900">
                    {mov.produto?.nome ?? "Produto"}
                  </p>
                  <p className="break-words text-sm text-slate-500">
                    {mov.observacao || mov.tipo}
                  </p>
                </div>
              </div>

              <p className="shrink-0 text-sm font-semibold text-slate-700">
                {entrada ? "+" : "-"}
                {Number(mov.quantidade)}
              </p>
            </div>
          );
        })}

        {movimentacoes.length === 0 && (
          <p className="text-sm text-slate-500">
            Nenhuma movimentação encontrada.
          </p>
        )}
      </div>
    </div>
  );
}
