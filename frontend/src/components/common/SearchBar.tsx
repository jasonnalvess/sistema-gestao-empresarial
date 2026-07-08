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
    <div className="flex flex-col gap-3 md:flex-row">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />

      <Button onClick={onSearch}>Pesquisar</Button>
    </div>
  );
}
