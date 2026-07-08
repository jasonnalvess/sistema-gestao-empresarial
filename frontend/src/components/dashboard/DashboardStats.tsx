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
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <StatsCard
        title="Empresas"
        value={resumo.empresas}
        icon={<Building2 size={24} />}
      />

      <StatsCard
        title="Usuários"
        value={resumo.usuarios}
        icon={<Users size={24} />}
      />

      <StatsCard
        title="Produtos"
        value={resumo.produtos}
        icon={<Package size={24} />}
      />

      <StatsCard
        title="Categorias"
        value={resumo.categorias}
        icon={<Boxes size={24} />}
      />

      <StatsCard
        title="Movimentações"
        value={resumo.movimentacoesEstoque}
        icon={<Warehouse size={24} />}
      />

      <StatsCard
        title="Auditoria"
        value={resumo.auditoriaLogs}
        icon={<ClipboardList size={24} />}
      />
    </div>
  );
}
