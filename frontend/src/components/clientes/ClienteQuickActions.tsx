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
    <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 md:flex md:w-auto md:flex-wrap">
      <Button asChild variant="outline" size="sm">
        <Link href="/clientes">
          <ArrowLeft aria-hidden="true" />
          Voltar
        </Link>
      </Button>

      <Button asChild variant="outline" size="sm">
        <Link href={`/agenda?clienteId=${cliente.id}`}>
          <CalendarPlus aria-hidden="true" />
          Novo atendimento
        </Link>
      </Button>

      <Button asChild variant="outline" size="sm">
        <Link href={`/ordens-servico?clienteId=${cliente.id}`}>
          <Wrench aria-hidden="true" />
          Nova OS
        </Link>
      </Button>

      {podeEditarCliente && <EditarClienteModal cliente={cliente} />}
    </div>
  );
}
