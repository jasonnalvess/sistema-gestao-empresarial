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
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md sm:p-5">
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 break-words text-2xl font-bold text-slate-900">
            {value}
          </p>

          {description && (
            <p className="mt-1 break-words text-xs text-slate-500">
              {description}
            </p>
          )}
        </div>

        {icon && (
          <div className="shrink-0 rounded-lg bg-slate-100 p-3 text-slate-700">
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
