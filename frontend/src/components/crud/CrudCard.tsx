import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function CrudCard({ children }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {children}
    </div>
  );
}
