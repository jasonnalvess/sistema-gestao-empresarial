import Link from "next/link";
import { CalendarPlus } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  clienteId: string;
  label?: string;
};

export function NewAtendimentoButton({
  clienteId,
  label = "Atendimento",
}: Props) {
  return (
    <Button asChild variant="outline" size="sm">
      <Link href={`/agenda?clienteId=${clienteId}`}>
        <CalendarPlus size={14} className="mr-2" />
        {label}
      </Link>
    </Button>
  );
}
