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

import { ChartContainer } from "./ChartContainer";

export interface BarChartDataItem {
  label: string;
  value: number;
}

interface BarChartCardProps {
  title: string;
  description?: string;
  data: BarChartDataItem[];
  valueLabel?: string;
  color?: string;
  isLoading?: boolean;
  errorMessage?: string;
  emptyMessage?: string;
}

export function BarChartCard({
  title,
  description,
  data,
  valueLabel = "Valor",
  color = "#2563eb",
  isLoading,
  errorMessage,
  emptyMessage,
}: BarChartCardProps) {
  return (
    <ChartContainer
      title={title}
      description={description}
      isLoading={isLoading}
      errorMessage={errorMessage}
      isEmpty={data.length === 0}
      emptyMessage={emptyMessage}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 12, bottom: 4, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={120}
            tick={{ fontSize: 12 }}
          />
          <Tooltip />
          <Bar
            dataKey="value"
            name={valueLabel}
            fill={color}
            radius={[0, 6, 6, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
