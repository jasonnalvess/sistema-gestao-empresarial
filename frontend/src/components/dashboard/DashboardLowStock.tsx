import { AlertTriangle } from "lucide-react";
import { EstoqueProduto } from "@/services/estoque.service";

type Props = {
  itens: EstoqueProduto[];
};

export function DashboardLowStock({ itens }: Props) {
  const itensBaixos = itens.filter(
    (item) => Number(item.quantidadeAtual) <= Number(item.estoqueMinimo)
  );

  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex min-w-0 items-start gap-2">
        <AlertTriangle className="mt-0.5 shrink-0 text-orange-500" aria-hidden="true" />
        <h2 className="min-w-0 break-words text-lg font-semibold text-slate-900">
          Produtos com estoque baixo
        </h2>
      </div>

      <div className="mt-5 space-y-4">
        {itensBaixos.map((item) => (
          <div
            key={item.id}
            className="flex min-w-0 items-center justify-between gap-3 rounded-xl bg-orange-50 p-3 sm:p-4"
          >
            <div className="min-w-0">
              <p className="break-words font-medium text-slate-900">
                {item.produto?.nome ?? "Produto"}
              </p>
              <p className="text-sm text-slate-500">
                Mínimo: {Number(item.estoqueMinimo)}
              </p>
            </div>

            <p className="shrink-0 text-lg font-bold text-orange-700">
              {Number(item.quantidadeAtual)}
            </p>
          </div>
        ))}

        {itensBaixos.length === 0 && (
          <p className="text-sm text-slate-500">
            Nenhum produto abaixo do estoque mínimo.
          </p>
        )}
      </div>
    </div>
  );
}
