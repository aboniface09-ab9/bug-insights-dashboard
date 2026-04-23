import { useMemo, useState } from "react";
import { List, Plus, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TicketListDialog } from "./TicketListDialog";
import type { BugRow } from "@/lib/bug-data";

interface Props<T extends string> {
  label: string;
  /** Always-visible chips (e.g. the top 5 most-used values). */
  options: T[];
  selected: T[];
  onChange: (next: T[]) => void;
  /**
   * Additional selectable values hidden behind a "+ more" searchable picker.
   * Any currently-selected value from this list is also rendered as an extra
   * chip so the user can deselect it without reopening the picker.
   */
  extraOptions?: T[];
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
  extraOptions,
  renderLabel,
  rows,
  accessor,
}: Props<T>) {
  const [drill, setDrill] = useState<{ open: boolean; value: string }>({
    open: false,
    value: "",
  });
  const [pickerOpen, setPickerOpen] = useState(false);

  const toggle = (opt: T) => {
    onChange(selected.includes(opt) ? selected.filter((o) => o !== opt) : [...selected, opt]);
  };

  // Chips to always show: the top-N passed in as `options`, plus any currently
  // selected values that aren't in the top-N (so the user can see & remove
  // their out-of-top-N picks without reopening the picker).
  const outsideTopSelected = useMemo(
    () => selected.filter((s) => !options.includes(s)),
    [selected, options],
  );

  const hasExtras = !!extraOptions && extraOptions.length > 0;

  const drillRows =
    rows && accessor && drill.value ? rows.filter((r) => accessor(r) === drill.value) : [];

  const renderChip = (opt: T, key: string) => {
    const on = selected.includes(opt);
    const showDrill = !!(rows && accessor);
    return (
      <div key={key} className="inline-flex items-center">
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
        {options.map((opt) => renderChip(opt, `top-${opt}`))}
        {outsideTopSelected.map((opt) => renderChip(opt, `extra-${opt}`))}
        {hasExtras && (
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex h-[22px] items-center gap-1 rounded-md border border-dashed border-border/60 bg-card px-2 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
                aria-label={`Pick from all ${label.toLowerCase()}`}
              >
                <Plus className="h-3 w-3" />
                {extraOptions!.length} more
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <Command>
                <CommandInput placeholder={`Search ${label.toLowerCase()}…`} className="h-9" />
                <CommandList className="max-h-64">
                  <CommandEmpty>No matches.</CommandEmpty>
                  <CommandGroup>
                    {extraOptions!.map((opt) => {
                      const on = selected.includes(opt);
                      return (
                        <CommandItem
                          key={opt}
                          value={opt}
                          onSelect={() => toggle(opt)}
                          className="flex items-center justify-between"
                        >
                          <span className="truncate">
                            {renderLabel ? renderLabel(opt) : opt}
                          </span>
                          {on && <Check className="ml-2 h-3.5 w-3.5 text-primary" />}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {rows && accessor && (
        <TicketListDialog
          open={drill.open}
          onOpenChange={(o) => setDrill((s) => ({ ...s, open: o }))}
          title={`${label} · ${renderLabel ? renderLabel(drill.value as T) : drill.value}`}
          subtitle={`${drillRows.length} matching ticket${drillRows.length === 1 ? "" : "s"} (ignores other filters)`}
          rows={drillRows}
        />
      )}
    </div>
  );
}
