import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function CrudToolbar({ children }: Props) {
  return (
    <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      {children}
    </div>
  );
}
