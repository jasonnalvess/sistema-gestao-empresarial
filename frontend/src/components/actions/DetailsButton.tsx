import Link from "next/link";
import { Eye } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  href: string;
  label?: string;
};

export function DetailsButton({ href, label = "Detalhes" }: Props) {
  return (
    <Button asChild variant="outline" size="sm">
      <Link href={href}>
        <Eye aria-hidden="true" />
        {label}
      </Link>
    </Button>
  );
}
