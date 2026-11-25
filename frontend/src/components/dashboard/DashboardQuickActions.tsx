import Link from "next/link";
import { Boxes, Package, Plus, Warehouse, ArrowLeftRight } from "lucide-react";

const actions = [
  {
    title: "Novo produto",
    description: "Cadastrar item no estoque",
    href: "/produtos",
    icon: Package,
  },
  {
    title: "Nova categoria",
    description: "Organizar produtos",
    href: "/categorias",
    icon: Boxes,
  },
  {
    title: "Ver estoque",
    description: "Consultar saldos atuais",
    href: "/estoque",
    icon: Warehouse,
  },
  {
    title: "Nova movimentação",
    description: "Entrada ou saída de estoque",
    href: "/movimentacoes",
    icon: ArrowLeftRight,
  },
];

export function DashboardQuickActions() {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex min-w-0 items-center gap-2">
        <Plus className="shrink-0 text-blue-600" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-slate-900">Ações rápidas</h2>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.title}
              href={action.href}
              className="min-w-0 rounded-xl border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 rounded-lg bg-blue-100 p-2 text-blue-700">
                  <Icon aria-hidden="true" />
                </div>

                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{action.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {action.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
