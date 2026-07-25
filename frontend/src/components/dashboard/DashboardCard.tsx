import { ReactNode } from "react";

interface DashboardCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  footer?: ReactNode;
}

export function DashboardCard({
  title,
  value,
  description,
  icon,
  footer,
}: DashboardCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {value}
          </p>

          {description && (
            <p className="mt-1 text-xs text-slate-500">
              {description}
            </p>
          )}
        </div>

        {icon && (
          <div className="rounded-lg bg-slate-100 p-3 text-slate-700">
            {icon}
          </div>
        )}
      </div>

      {footer && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          {footer}
        </div>
      )}
    </div>
  );
}
