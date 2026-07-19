import { ReactNode } from "react";

interface DashboardStatusCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  color: string;
}

export function DashboardStatusCard({
  title,
  value,
  icon,
  color,
}: DashboardStatusCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className={`rounded-lg p-2 ${color}`}>
          {icon}
        </div>

        <span className="text-2xl font-bold text-slate-900">
          {value}
        </span>
      </div>

      <p className="mt-3 text-sm font-medium text-slate-600">
        {title}
      </p>
    </div>
  );
}
