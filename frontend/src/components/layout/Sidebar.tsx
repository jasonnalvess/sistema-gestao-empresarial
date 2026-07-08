"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { menu } from "@/lib/menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { possuiPermissao } from "@/lib/auth";

export function Sidebar() {
  const pathname = usePathname();
  const { usuario } = useAuth();

  const menuPermitido = menu.filter((item) =>
    usuario ? possuiPermissao(usuario.tipo, item.href) : false
  );

  return (
    <aside className="hidden md:flex h-screen w-64 flex-col border-r bg-white">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-lg font-bold text-slate-900">Sistema Gestão</h1>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {menuPermitido.map((item) => {
          const ativo = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                ativo
                  ? "bg-blue-600 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              )}
            >
              <Icon size={18} />
              {item.titulo}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
