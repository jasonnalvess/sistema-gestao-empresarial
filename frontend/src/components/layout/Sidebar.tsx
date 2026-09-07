"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ScrollArea } from "@/components/ui/scroll-area";
import { SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import {
  PERMISSAO_AGENDA_VISUALIZAR,
  PERMISSAO_AUDITORIA_EMPRESA_VISUALIZAR,
  PERMISSAO_AUDITORIA_GLOBAL_VISUALIZAR,
  PERMISSAO_CAIXA_VISUALIZAR,
  PERMISSAO_CATEGORIAS_VISUALIZAR,
  PERMISSAO_CLIENTES_VISUALIZAR,
  PERMISSAO_CONTAS_PAGAR_VISUALIZAR,
  PERMISSAO_CONTAS_RECEBER_VISUALIZAR,
  PERMISSAO_DASHBOARD_VISUALIZAR,
  PERMISSAO_DEPOSITOS_VISUALIZAR,
  PERMISSAO_ESTOQUE_VISUALIZAR,
  PERMISSAO_FINANCEIRO_VISUALIZAR,
  PERMISSAO_FORNECEDORES_VISUALIZAR,
  PERMISSAO_INVENTARIOS_VISUALIZAR,
  PERMISSAO_MARCAS_VISUALIZAR,
  PERMISSAO_MOVIMENTACOES_VISUALIZAR,
  PERMISSAO_ORDENS_SERVICO_VISUALIZAR,
  PERMISSAO_PEDIDOS_COMPRA_VISUALIZAR,
  PERMISSAO_PERFIS_VISUALIZAR,
  PERMISSAO_PRODUTOS_VISUALIZAR,
  PERMISSAO_UNIDADES_VISUALIZAR,
  PERMISSAO_VENDAS_VISUALIZAR,
  possuiPermissao,
} from "@/lib/auth";
import { menu } from "@/lib/menu";
import { cn } from "@/lib/utils";

const permissoesPorRota: Partial<Record<string, string>> = {
  "/dashboard": PERMISSAO_DASHBOARD_VISUALIZAR,
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
  "/perfis": PERMISSAO_PERFIS_VISUALIZAR,
};

interface SidebarContentProps {
  recolhida?: boolean;
  aoNavegar?: () => void;
}

function SidebarContent({ recolhida = false, aoNavegar }: SidebarContentProps) {
  const pathname = usePathname();
  const { usuario, temPermissao } = useAuth();

  const menuPermitido = menu.filter((item) => {
    if (item.href === "/auditoria") {
      return (
        temPermissao(PERMISSAO_AUDITORIA_EMPRESA_VISUALIZAR) ||
        temPermissao(PERMISSAO_AUDITORIA_GLOBAL_VISUALIZAR)
      );
    }

    const permissao = permissoesPorRota[item.href];
    if (permissao) return temPermissao(permissao);

    return usuario ? possuiPermissao(usuario.tipo, item.href) : false;
  });

  return (
    <TooltipProvider>
      <nav aria-label="Navegação principal" className="space-y-1 p-3">
        {menuPermitido.map((item) => {
          const ativo =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          const link = (
            <Link
              key={item.href}
              href={item.href}
              onClick={aoNavegar}
              aria-current={ativo ? "page" : undefined}
              aria-label={recolhida ? item.titulo : undefined}
              className={cn(
                "flex min-h-10 items-center rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                recolhida ? "justify-center" : "gap-3",
                ativo
                  ? "bg-blue-600 text-white"
                  : "text-slate-700 hover:bg-slate-100",
              )}
            >
              <Icon aria-hidden="true" />
              {!recolhida && <span className="truncate">{item.titulo}</span>}
            </Link>
          );

          if (!recolhida) return link;

          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {item.titulo}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}

export function DesktopSidebar({ recolhida }: { recolhida: boolean }) {
  return (
    <aside
      id="menu-lateral-desktop"
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r bg-white transition-[width] duration-200 md:flex",
        recolhida ? "w-20" : "w-64",
      )}
    >
      <div
        className={cn(
          "flex min-h-16 items-center border-b px-4",
          recolhida ? "justify-center" : "justify-start",
        )}
      >
        <span
          className="text-lg font-bold text-slate-900"
          aria-label="Sistema Gestão"
        >
          {recolhida ? "SG" : "Sistema Gestão"}
        </span>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <SidebarContent recolhida={recolhida} />
      </ScrollArea>
    </aside>
  );
}

export function MobileSidebar({ aoNavegar }: { aoNavegar: () => void }) {
  return (
    <SheetContent
      id="menu-lateral-mobile"
      side="left"
      className="w-[min(20rem,calc(100vw-2rem))] gap-0 p-0 md:hidden"
    >
      <SheetHeader className="min-h-16 justify-center border-b pr-12">
        <SheetTitle className="text-lg font-bold text-slate-900">
          Sistema Gestão
        </SheetTitle>
      </SheetHeader>
      <ScrollArea className="min-h-0 flex-1">
        <SidebarContent aoNavegar={aoNavegar} />
      </ScrollArea>
    </SheetContent>
  );
}
