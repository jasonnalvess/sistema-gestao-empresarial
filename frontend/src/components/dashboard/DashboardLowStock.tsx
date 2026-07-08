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
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <AlertTriangle size={20} className="text-orange-500" />
        <h2 className="text-lg font-semibold text-slate-900">
          Produtos com estoque baixo
        </h2>
      </div>

      <div className="mt-5 space-y-4">
        {itensBaixos.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-xl bg-orange-50 p-4"
          >
            <div>
              <p className="font-medium text-slate-900">
                {item.produto?.nome ?? "Produto"}
              </p>
              <p className="text-sm text-slate-500">
                Mínimo: {Number(item.estoqueMinimo)}
              </p>
            </div>

            <p className="text-lg font-bold text-orange-700">
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
