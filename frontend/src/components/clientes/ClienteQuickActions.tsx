"use client";

import { ArrowLeft, CalendarPlus, Wrench } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { PERMISSAO_CLIENTES_EDITAR } from "@/lib/auth";
import { Cliente } from "@/services/clientes.service";
import { EditarClienteModal } from "./EditarClienteModal";

type Props = {
  cliente: Cliente;
};

export function ClienteQuickActions({ cliente }: Props) {
  const { temPermissao } = useAuth();
  const podeEditarCliente = temPermissao(PERMISSAO_CLIENTES_EDITAR);

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href="/clientes">
          <ArrowLeft size={14} className="mr-2" />
          Voltar
        </Link>
      </Button>

      <Button asChild variant="outline" size="sm">
        <Link href={`/agenda?clienteId=${cliente.id}`}>
          <CalendarPlus size={14} className="mr-2" />
          Novo atendimento
        </Link>
      </Button>

      <Button asChild variant="outline" size="sm">
        <Link href={`/ordens-servico?clienteId=${cliente.id}`}>
          <Wrench size={14} className="mr-2" />
          Nova OS
        </Link>
      </Button>

      {podeEditarCliente && <EditarClienteModal cliente={cliente} />}
    </div>
  );
}
