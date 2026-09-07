import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function CrudCard({ children }: Props) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      {children}
    </div>
  );
}
