import { UsersRound, UserCheck, UserX, UserRound, Building2 } from "lucide-react";

import { StatsCard } from "@/components/common/StatsCard";
import { Cliente } from "@/services/clientes.service";

type Props = {
  clientes: Cliente[];
};

export function ClientesSummaryCards({ clientes }: Props) {
  const total = clientes.length;
  const ativos = clientes.filter((c) => c.ativo).length;
  const inativos = clientes.filter((c) => !c.ativo).length;
  const pf = clientes.filter((c) => c.tipo === "PF").length;
  const pj = clientes.filter((c) => c.tipo === "PJ").length;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <StatsCard title="Total" value={total} icon={<UsersRound aria-hidden="true" />} />
      <StatsCard title="Ativos" value={ativos} icon={<UserCheck aria-hidden="true" />} />
      <StatsCard title="Inativos" value={inativos} icon={<UserX aria-hidden="true" />} />
      <StatsCard title="Pessoa Física" value={pf} icon={<UserRound size={22} />} />
      <StatsCard title="Pessoa Jurídica" value={pj} icon={<Building2 size={22} />} />
    </div>
  );
}
