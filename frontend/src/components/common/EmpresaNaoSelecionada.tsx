export function EmpresaNaoSelecionada() {
  return (
    <section
      className="rounded-lg border border-amber-200 bg-amber-50 p-6"
      aria-labelledby="empresa-nao-selecionada-titulo"
    >
      <h1
        id="empresa-nao-selecionada-titulo"
        className="text-lg font-semibold text-amber-900"
      >
        Selecione uma empresa
      </h1>
      <p className="mt-2 text-sm text-amber-800">
        Escolha uma empresa no cabeçalho para acessar o módulo Clientes.
      </p>
    </section>
  );
}
