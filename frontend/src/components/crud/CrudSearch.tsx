import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;
};

export function CrudSearch({
  value,
  onChange,
  onSearch,
  placeholder,
}: Props) {
  return (
    <div className="flex w-full gap-3">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />

      <Button onClick={onSearch}>
        <Search size={16} className="mr-2" />
        Pesquisar
      </Button>
    </div>
  );
}
