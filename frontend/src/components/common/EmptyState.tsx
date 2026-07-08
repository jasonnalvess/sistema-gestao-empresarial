type EmptyStateProps = {
  message: string;
};

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="py-10 text-center text-slate-500">
      {message}
    </div>
  );
}
