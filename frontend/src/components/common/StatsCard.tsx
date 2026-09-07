import { ReactNode } from "react";

type StatsCardProps = {
  title: string;
  value: number | string;
  icon?: ReactNode;
};

export function StatsCard({ title, value, icon }: StatsCardProps) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-6">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <p className="min-w-0 break-words text-sm font-medium text-slate-500">
          {title}
        </p>
        {icon && <div className="shrink-0 text-slate-400">{icon}</div>}
      </div>

      <p className="mt-3 min-w-0 break-words text-3xl font-bold text-slate-900 sm:text-4xl">
        {value}
      </p>
    </div>
  );
}
