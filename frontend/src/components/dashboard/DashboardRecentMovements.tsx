import { ArrowDown, ArrowUp } from "lucide-react";
import { MovimentacaoEstoque } from "@/services/movimentacoes.service";

type Props = {
  movimentacoes: MovimentacaoEstoque[];
};

export function DashboardRecentMovements({ movimentacoes }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">
        Últimas movimentações
      </h2>

      <div className="mt-5 space-y-4">
        {movimentacoes.map((mov) => {
          const entrada = mov.tipo === "ENTRADA";

          return (
            <div
              key={mov.id}
              className="flex items-center justify-between rounded-xl bg-slate-50 p-4"
            >
              <div className="flex items-center gap-3">
                <div
                  className={
                    entrada
                      ? "rounded-full bg-green-100 p-2 text-green-700"
                      : "rounded-full bg-red-100 p-2 text-red-700"
                  }
                >
                  {entrada ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                </div>

                <div>
                  <p className="font-medium text-slate-900">
                    {mov.produto?.nome ?? "Produto"}
                  </p>
                  <p className="text-sm text-slate-500">
                    {mov.observacao || mov.tipo}
                  </p>
                </div>
              </div>

              <p className="text-sm font-semibold text-slate-700">
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
