import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Props<T extends string> {
  label: string;
  options: T[];
  selected: T[];
  onChange: (next: T[]) => void;
}

export function FilterChips<T extends string>({ label, options, selected, onChange }: Props<T>) {
  const toggle = (opt: T) => {
    onChange(selected.includes(opt) ? selected.filter((o) => o !== opt) : [...selected, opt]);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        {selected.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="h-5 px-2 text-[10px] text-muted-foreground hover:text-foreground"
            onClick={() => onChange([])}
          >
            clear
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const on = selected.includes(opt);
          return (
            <Badge
              key={opt}
              onClick={() => toggle(opt)}
              variant={on ? "default" : "outline"}
              className={`cursor-pointer select-none font-mono text-xs transition-all ${
                on
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "border-border/60 bg-card hover:border-primary/60 hover:text-primary"
              }`}
            >
              {opt}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
