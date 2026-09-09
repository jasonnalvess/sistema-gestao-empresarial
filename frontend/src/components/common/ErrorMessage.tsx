import { cn } from "@/lib/utils";

type ErrorMessageProps = {
  message: string;
  className?: string;
};

export function ErrorMessage({ message, className }: ErrorMessageProps) {
  return (
    <div
      role="alert"
      className={cn(
        "min-w-0 break-words rounded-lg bg-red-50 p-3 text-sm text-red-700",
        className,
      )}
    >
      {message}
    </div>
  );
}
