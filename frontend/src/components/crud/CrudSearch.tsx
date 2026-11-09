import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;
};

export function CrudSearch({ value, onChange, onSearch, placeholder }: Props) {
  return (
    <form
      className="flex w-full min-w-0 flex-col gap-3 md:flex-row"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch();
      }}
    >
      <Input
        aria-label={placeholder ?? "Pesquisar"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />

      <Button type="submit" className="w-full md:w-auto">
        <Search aria-hidden="true" />
        Pesquisar
      </Button>
    </form>
  );
}
