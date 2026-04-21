import { Card } from "@/components/ui/card";

interface Props {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "critical" | "warning" | "success";
}

const toneClass: Record<NonNullable<Props["tone"]>, string> = {
  default: "text-primary",
  critical: "text-[var(--critical)]",
  warning: "text-[var(--warning)]",
  success: "text-[var(--success)]",
};

export function MetricCard({ label, value, sub, tone = "default" }: Props) {
  return (
    <Card className="relative overflow-hidden border-border/60 bg-[var(--gradient-surface)] p-5 shadow-[var(--shadow-card)]">
      <div className="absolute inset-x-0 top-0 h-px bg-[var(--gradient-primary)] opacity-60" />
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className={`mt-2 font-display text-3xl font-semibold tabular-nums ${toneClass[tone]}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}
