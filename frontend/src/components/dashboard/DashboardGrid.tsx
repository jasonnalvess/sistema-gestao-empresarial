import { ReactNode } from "react";

interface DashboardGridProps {
  children: ReactNode;
}

export function DashboardGrid({
  children,
}: DashboardGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {children}
    </div>
  );
}
