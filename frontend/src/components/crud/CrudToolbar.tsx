import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function CrudToolbar({ children }: Props) {
  return (
    <div className="mb-5 flex min-w-0 flex-col items-stretch gap-4 md:flex-row md:items-center md:justify-between [&>*]:min-w-0 [&>*]:w-full [&>*]:flex-wrap md:[&>*]:w-auto">
      {children}
    </div>
  );
}
