import { useState } from "react";
import { List } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TicketListDialog } from "./TicketListDialog";
import type { BugRow } from "@/lib/bug-data";

interface Props<T extends string> {
  label: string;
  options: T[];
  selected: T[];
  onChange: (next: T[]) => void;
  /**
   * Optional display transform for a chip's label. The raw option value is
   * still used for equality/selection (e.g. show "Jan 2026" but store
   * "2026-01").
   */
  renderLabel?: (opt: T) => string;
  /**
   * If provided, each chip gets a small "view tickets" icon that opens a
   * drill-down dialog with the matching tickets, without changing the filter.
   * The accessor returns the row's value for this dimension (e.g. r => r.reporter).
   */
  rows?: BugRow[];
  accessor?: (r: BugRow) => string;
}

export function FilterChips<T extends string>({
  label,
  options,
  selected,
  onChange,
  renderLabel,
  rows,
  accessor,
}: Props<T>) {
  const [drill, setDrill] = useState<{ open: boolean; value: string }>({ open: false, value: "" });

  const toggle = (opt: T) => {
    onChange(selected.includes(opt) ? selected.filter((o) => o !== opt) : [...selected, opt]);
  };

  const drillRows =
    rows && accessor && drill.value ? rows.filter((r) => accessor(r) === drill.value) : [];

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
          const showDrill = !!(rows && accessor);
          return (
            <div key={opt} className="inline-flex items-center">
              <Badge
                onClick={() => toggle(opt)}
                variant={on ? "default" : "outline"}
                className={`cursor-pointer select-none font-mono text-xs transition-all ${
                  showDrill ? "rounded-r-none" : ""
                } ${
                  on
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border-border/60 bg-card hover:border-primary/60 hover:text-primary"
                }`}
              >
                {renderLabel ? renderLabel(opt) : opt}
              </Badge>
              {showDrill && (
                <button
                  type="button"
                  aria-label={`View tickets for ${opt}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDrill({ open: true, value: opt });
                  }}
                  className={`flex h-[22px] items-center justify-center rounded-r-md border border-l-0 px-1.5 transition-colors ${
                    on
                      ? "border-primary bg-primary/80 text-primary-foreground hover:bg-primary"
                      : "border-border/60 bg-card text-muted-foreground hover:border-primary/60 hover:text-primary"
                  }`}
                >
                  <List className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {rows && accessor && (
        <TicketListDialog
          open={drill.open}
          onOpenChange={(o) => setDrill((s) => ({ ...s, open: o }))}
          title={`${label} · ${drill.value}`}
          subtitle={`${drillRows.length} matching ticket${drillRows.length === 1 ? "" : "s"} (ignores other filters)`}
          rows={drillRows}
        />
      )}
    </div>
  );
}
