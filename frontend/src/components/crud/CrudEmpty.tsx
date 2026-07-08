type Props = {
  message: string;
};

export function CrudEmpty({ message }: Props) {
  return (
    <div className="py-16 text-center text-slate-500">
      {message}
    </div>
  );
}
