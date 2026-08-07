import { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <h1 className="break-words text-2xl font-bold text-slate-900 sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 break-words text-slate-600">{description}</p>
        )}
      </div>

      {actions && (
        <div className="flex w-full min-w-0 flex-col items-stretch gap-2 md:w-auto md:shrink-0 md:flex-row md:items-center [&>*]:min-w-0 [&>*]:w-full [&>*]:flex-wrap md:[&>*]:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
