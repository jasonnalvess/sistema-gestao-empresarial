import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SearchBarProps = {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onSearch: () => void;
};

export function SearchBar({
  value,
  placeholder = "Pesquisar...",
  onChange,
  onSearch,
}: SearchBarProps) {
  return (
    <div
      className="flex w-full min-w-0 flex-col gap-3 md:flex-row"
      role="search"
    >
      <Input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />

      <Button type="button" onClick={onSearch} className="w-full md:w-auto">
        Pesquisar
      </Button>
    </div>
  );
}
