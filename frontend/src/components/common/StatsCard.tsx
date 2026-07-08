import { ReactNode } from "react";

type StatsCardProps = {
  title: string;
  value: number | string;
  icon?: ReactNode;
};

export function StatsCard({ title, value, icon }: StatsCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>

      <p className="mt-3 text-4xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
