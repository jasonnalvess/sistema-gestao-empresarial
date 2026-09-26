import { ReactNode } from "react";

type Props = {
  message: string;
  action?: ReactNode;
};

export function CrudEmpty({ message, action }: Props) {
  return (
    <div className="min-w-0 break-words px-4 py-12 text-center text-slate-500 sm:py-16">
      <p>{message}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
