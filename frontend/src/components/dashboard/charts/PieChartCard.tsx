"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { ChartContainer } from "./ChartContainer";

export interface PieChartDataItem {
  label: string;
  value: number;
  color: string;
}

interface PieChartCardProps {
  title: string;
  description?: string;
  data: PieChartDataItem[];
  isLoading?: boolean;
  errorMessage?: string;
  emptyMessage?: string;
}

export function PieChartCard({
  title,
  description,
  data,
  isLoading,
  errorMessage,
  emptyMessage,
}: PieChartCardProps) {
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
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="45%"
            innerRadius={48}
            outerRadius={88}
            paddingAngle={2}
          >
            {data.map((item) => (
              <Cell key={item.label} fill={item.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend verticalAlign="bottom" />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
