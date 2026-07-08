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
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">
        Resumo de movimentações
      </h2>

      <div className="mt-6 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
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

