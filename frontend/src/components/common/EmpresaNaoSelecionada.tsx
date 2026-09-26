export function EmpresaNaoSelecionada() {
  return (
    <section
      className="min-w-0 rounded-lg border border-amber-200 bg-amber-50 p-4 sm:p-6"
      aria-labelledby="empresa-nao-selecionada-titulo"
    >
      <h1
        id="empresa-nao-selecionada-titulo"
        className="break-words text-lg font-semibold text-amber-900"
      >
        Selecione uma empresa
      </h1>
      <p className="mt-2 break-words text-sm text-amber-800">
        Escolha uma empresa no cabeçalho para acessar este módulo.
      </p>
    </section>
  );
}
