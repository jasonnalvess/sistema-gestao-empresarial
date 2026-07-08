export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-6">
      <section className="w-full max-w-4xl bg-white rounded-2xl shadow-lg p-10">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-900">
            Sistema de Gestão Empresarial
          </h1>

          <p className="mt-4 text-lg text-slate-600">
            Plataforma SaaS multiempresa para controle de usuários, módulos,
            estoque, caixa, agenda, funcionários e gestão empresarial.
          </p>

          <div className="mt-8 flex justify-center gap-4">
            <a
              href="/login"
              className="rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700"
            >
              Acessar sistema
            </a>

            <a
              href="#sobre"
              className="rounded-lg border border-slate-300 px-6 py-3 text-slate-700 font-medium hover:bg-slate-50"
            >
              Saiba mais
            </a>
          </div>
        </div>

        <div
          id="sobre"
          className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <div className="rounded-xl bg-slate-50 p-5">
            <h2 className="font-semibold text-slate-900">Multiempresa</h2>
            <p className="mt-2 text-sm text-slate-600">
              Cada empresa possui seus próprios dados, usuários e permissões.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-5">
            <h2 className="font-semibold text-slate-900">Modular</h2>
            <p className="mt-2 text-sm text-slate-600">
              Ative apenas os módulos necessários para cada cliente.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-5">
            <h2 className="font-semibold text-slate-900">Seguro</h2>
            <p className="mt-2 text-sm text-slate-600">
              Autenticação, permissões, auditoria e isolamento por empresa.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
