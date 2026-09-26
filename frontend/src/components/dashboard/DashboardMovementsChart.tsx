"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { MovimentacaoEstoque } from "@/services/movimentacoes.service";

type Props = {
  movimentacoes: MovimentacaoEstoque[];
};

export function DashboardMovementsChart({ movimentacoes }: Props) {
  const entradas = movimentacoes
    .filter((mov) => mov.tipo === "ENTRADA")
    .reduce((total, mov) => total + Number(mov.quantidade), 0);

  const saidas = movimentacoes
    .filter((mov) => mov.tipo === "SAIDA")
    .reduce((total, mov) => total + Number(mov.quantidade), 0);

  const data = [
    {
      tipo: "Entradas",
      quantidade: entradas,
    },
    {
      tipo: "Saídas",
      quantidade: saidas,
    },
  ];

  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="break-words text-lg font-semibold text-slate-900">
        Resumo de movimentações
      </h2>

      <div className="mt-6 h-64 min-w-0 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -20, right: 4 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="tipo" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="quantidade" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
