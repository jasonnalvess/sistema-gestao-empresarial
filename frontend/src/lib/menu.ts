import {
  LayoutDashboard,
  Package,
  Boxes,
  Warehouse,
  ArrowLeftRight,
  Building2,
  Users,
  ClipboardList,
  ClipboardCheck,
  Settings,
  Blocks,
  CalendarDays,
  UsersRound,
  Wrench,
  Ruler,
  Tags,
  Truck,
  ShoppingCart,
  WalletCards,
  BadgeDollarSign,
  Landmark,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";

export const menu = [
  {
    titulo: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    titulo: "Clientes",
    href: "/clientes",
    icon: UsersRound,
  },
  {
    titulo: "Produtos",
    href: "/produtos",
    icon: Package,
  },
  {
    titulo: "Fornecedores",
    href: "/fornecedores",
    icon: Truck,
  },
  {
    titulo: "Pedidos de Compra",
    href: "/pedidos-compra",
    icon: ShoppingCart,
  },
  {
    titulo: "Vendas",
    href: "/vendas",
    icon: ReceiptText,
  },
  {
    titulo: "Categorias",
    href: "/categorias",
    icon: Boxes,
  },
  {
    titulo: "Marcas",
    href: "/marcas-produtos",
    icon: Tags,
  },
  {
    titulo: "Estoque",
    href: "/estoque",
    icon: Warehouse,
  },
  {
    titulo: "Depósitos",
    href: "/depositos",
    icon: Warehouse,
  },
  {
    titulo: "Movimentações",
    href: "/movimentacoes",
    icon: ArrowLeftRight,
  },
  {
    titulo: "Inventários",
    href: "/inventarios",
    icon: ClipboardCheck,
  },
  {
    titulo: "Agenda",
    href: "/agenda",
    icon: CalendarDays,
  },
  {
    titulo: "Ordens de Serviço",
    href: "/ordens-servico",
    icon: Wrench,
  },
  {
    titulo: "Financeiro",
    href: "/financeiro",
    icon: Landmark,
  },
  {
    titulo: "Caixas",
    href: "/caixas",
    icon: WalletCards,
  },
  {
    titulo: "Contas a Pagar",
    href: "/contas-pagar",
    icon: WalletCards,
  },
  {
    titulo: "Contas a Receber",
    href: "/contas-receber",
    icon: BadgeDollarSign,
  },
  {
    titulo: "Empresas",
    href: "/empresas",
    icon: Building2,
  },
  {
    titulo: "Usuários",
    href: "/usuarios",
    icon: Users,
  },
  {
    titulo: "Perfis e Permissões",
    href: "/perfis",
    icon: ShieldCheck,
  },
  {
    titulo: "Módulos",
    href: "/modulos",
    icon: Blocks,
  },
  {
    titulo: "Auditoria",
    href: "/auditoria",
    icon: ClipboardList,
  },
  {
    titulo: "Configurações",
    href: "/configuracoes",
    icon: Settings,
  },
  {
    titulo: "Unidades",
    href: "/unidades-medida",
    icon: Ruler,
  },
];