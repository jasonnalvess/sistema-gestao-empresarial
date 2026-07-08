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
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Plus size={20} className="text-blue-600" />
        <h2 className="text-lg font-semibold text-slate-900">Ações rápidas</h2>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.title}
              href={action.href}
              className="rounded-xl border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-blue-50"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
                  <Icon size={18} />
                </div>

                <div>
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
