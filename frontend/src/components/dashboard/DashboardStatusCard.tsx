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
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className={`rounded-lg p-2 ${color}`}>
          {icon}
        </div>

        <span className="min-w-0 break-words text-right text-2xl font-bold text-slate-900">
          {value}
        </span>
      </div>

      <p className="mt-3 break-words text-sm font-medium text-slate-600">
        {title}
      </p>
    </div>
  );
}
