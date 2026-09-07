export function CrudLoading() {
  return (
    <div
      className="min-w-0 px-4 py-12 text-center text-slate-500 sm:py-16"
      role="status"
      aria-live="polite"
    >
      Carregando...
      <span className="sr-only"> Aguarde.</span>
    </div>
  );
}
