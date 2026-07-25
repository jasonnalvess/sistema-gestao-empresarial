import {
  Package,
  CheckCircle,
  XCircle,
  Boxes,
  AlertTriangle,
  CircleSlash,
} from "lucide-react";

import { StatsCard } from "@/components/common/StatsCard";
import { Produto } from "@/services/produtos.service";

type Props = {
  produtos: Produto[];
};

function saldoTotal(produto: Produto) {
  return (
    produto.estoques?.reduce(
      (total, estoque) =>
        total + Number(estoque.quantidadeAtual),
      0
    ) ?? 0
  );
}

export function ProdutosSummaryCards({ produtos }: Props) {
  const total = produtos.length;
  const ativos = produtos.filter((p) => p.ativo).length;
  const inativos = produtos.filter((p) => !p.ativo).length;

  const comEstoque = produtos.filter(
    (produto) => saldoTotal(produto) > 0
  ).length;

  const semEstoque = produtos.filter(
    (produto) => saldoTotal(produto) <= 0
  ).length;

  const estoqueBaixo = produtos.filter((produto) => {
    const atual = saldoTotal(produto);
    const minimo = Number(produto.estoqueMinimo ?? 0);

    return minimo > 0 && atual <= minimo;
  }).length;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      <StatsCard title="Total" value={total} icon={<Package size={22} />} />
      <StatsCard title="Ativos" value={ativos} icon={<CheckCircle size={22} />} />
      <StatsCard title="Inativos" value={inativos} icon={<XCircle size={22} />} />
      <StatsCard title="Com estoque" value={comEstoque} icon={<Boxes size={22} />} />
      <StatsCard title="Sem estoque" value={semEstoque} icon={<CircleSlash size={22} />} />
      <StatsCard title="Estoque baixo" value={estoqueBaixo} icon={<AlertTriangle size={22} />} />
    </div>
  );
}
