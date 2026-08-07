import { ReactNode } from "react";

interface DashboardGridProps {
  children: ReactNode;
}

export function DashboardGrid({
  children,
}: DashboardGridProps) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {children}
    </div>
  );
}
