import {
  Building2,
  Boxes,
  ClipboardList,
  Package,
  Users,
  Warehouse,
} from "lucide-react";

import { StatsCard } from "@/components/common/StatsCard";
import { DashboardResumo } from "@/services/dashboard.service";

type Props = {
  resumo: DashboardResumo;
};

export function DashboardStats({ resumo }: Props) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
      <StatsCard
        title="Empresas"
        value={resumo.empresas}
        icon={<Building2 aria-hidden="true" />}
      />

      <StatsCard
        title="Usuários"
        value={resumo.usuarios}
        icon={<Users aria-hidden="true" />}
      />

      <StatsCard
        title="Produtos"
        value={resumo.produtos}
        icon={<Package aria-hidden="true" />}
      />

      <StatsCard
        title="Categorias"
        value={resumo.categorias}
        icon={<Boxes aria-hidden="true" />}
      />

      <StatsCard
        title="Movimentações"
        value={resumo.movimentacoesEstoque}
        icon={<Warehouse aria-hidden="true" />}
      />

      <StatsCard
        title="Auditoria"
        value={resumo.auditoriaLogs}
        icon={<ClipboardList aria-hidden="true" />}
      />
    </div>
  );
}
