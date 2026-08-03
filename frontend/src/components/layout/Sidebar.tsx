"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { menu } from "@/lib/menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  PERMISSAO_CLIENTES_VISUALIZAR,
  PERMISSAO_CONTAS_PAGAR_VISUALIZAR,
  PERMISSAO_CONTAS_RECEBER_VISUALIZAR,
  PERMISSAO_FORNECEDORES_VISUALIZAR,
  PERMISSAO_PEDIDOS_COMPRA_VISUALIZAR,
  PERMISSAO_PRODUTOS_VISUALIZAR,
  PERMISSAO_CATEGORIAS_VISUALIZAR,
  PERMISSAO_MARCAS_VISUALIZAR,
  PERMISSAO_UNIDADES_VISUALIZAR,
  PERMISSAO_DEPOSITOS_VISUALIZAR,
  PERMISSAO_ESTOQUE_VISUALIZAR,
  PERMISSAO_MOVIMENTACOES_VISUALIZAR,
  PERMISSAO_INVENTARIOS_VISUALIZAR,
  PERMISSAO_ORDENS_SERVICO_VISUALIZAR,
  PERMISSAO_AGENDA_VISUALIZAR,
  PERMISSAO_CAIXA_VISUALIZAR,
  PERMISSAO_VENDAS_VISUALIZAR,
  PERMISSAO_FINANCEIRO_VISUALIZAR,
  possuiPermissao,
} from "@/lib/auth";
import { X } from "lucide-react";

interface SidebarProps {
  aberto: boolean;
  aoFechar: () => void;
}

export function Sidebar({ aberto, aoFechar }: SidebarProps) {
  const pathname = usePathname();
  const { usuario, temPermissao } = useAuth();

  const permissoesPorRota: Partial<Record<string, string>> = {
    "/clientes": PERMISSAO_CLIENTES_VISUALIZAR,
    "/fornecedores": PERMISSAO_FORNECEDORES_VISUALIZAR,
    "/pedidos-compra": PERMISSAO_PEDIDOS_COMPRA_VISUALIZAR,
    "/vendas": PERMISSAO_VENDAS_VISUALIZAR,
    "/contas-pagar": PERMISSAO_CONTAS_PAGAR_VISUALIZAR,
    "/contas-receber": PERMISSAO_CONTAS_RECEBER_VISUALIZAR,
    "/produtos": PERMISSAO_PRODUTOS_VISUALIZAR,
    "/categorias": PERMISSAO_CATEGORIAS_VISUALIZAR,
    "/marcas-produtos": PERMISSAO_MARCAS_VISUALIZAR,
    "/unidades-medida": PERMISSAO_UNIDADES_VISUALIZAR,
    "/depositos": PERMISSAO_DEPOSITOS_VISUALIZAR,
    "/estoque": PERMISSAO_ESTOQUE_VISUALIZAR,
    "/movimentacoes": PERMISSAO_MOVIMENTACOES_VISUALIZAR,
    "/inventarios": PERMISSAO_INVENTARIOS_VISUALIZAR,
    "/ordens-servico": PERMISSAO_ORDENS_SERVICO_VISUALIZAR,
    "/agenda": PERMISSAO_AGENDA_VISUALIZAR,
    "/caixas": PERMISSAO_CAIXA_VISUALIZAR,
    "/financeiro": PERMISSAO_FINANCEIRO_VISUALIZAR,
  };

  const menuPermitido = menu.filter((item) => {
    const permissao = permissoesPorRota[item.href];
    if (permissao) return temPermissao(permissao);

    return usuario ? possuiPermissao(usuario.tipo, item.href) : false;
  });

  return (
    <>
      {aberto && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={aoFechar}
          aria-label="Fechar menu"
        />
      )}

      <aside
        id="menu-lateral"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col border-r bg-white transition-transform duration-200 md:static md:z-auto md:translate-x-0",
          aberto
            ? "visible translate-x-0"
            : "invisible -translate-x-full md:visible",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-6">
          <h1 className="text-lg font-bold text-slate-900">Sistema Gestão</h1>
          <button
            type="button"
            className="rounded-md p-1 text-slate-600 transition hover:bg-slate-100 md:hidden"
            onClick={aoFechar}
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {menuPermitido.map((item) => {
            const ativo = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={aoFechar}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                  ativo
                    ? "bg-blue-600 text-white"
                    : "text-slate-700 hover:bg-slate-100",
                )}
              >
                <Icon size={18} />
                {item.titulo}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
