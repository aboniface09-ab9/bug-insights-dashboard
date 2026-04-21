import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "critical" | "warning" | "success";
  icon?: LucideIcon;
  trend?: number[];
}

const toneClass: Record<NonNullable<Props["tone"]>, string> = {
  default: "text-primary",
  critical: "text-[var(--critical)]",
  warning: "text-[var(--warning)]",
  success: "text-[var(--success)]",
};

const toneStroke: Record<NonNullable<Props["tone"]>, string> = {
  default: "var(--primary)",
  critical: "var(--critical)",
  warning: "var(--warning)",
  success: "var(--success)",
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 24;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="opacity-70">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MetricCard({ label, value, sub, tone = "default", icon: Icon, trend }: Props) {
  return (
    <Card className="group relative overflow-hidden border-border/60 bg-[var(--gradient-surface)] p-5 shadow-[var(--shadow-card)] transition-all hover:border-primary/40 hover:shadow-[var(--shadow-glow)]">
      <div className="absolute inset-x-0 top-0 h-px bg-[var(--gradient-primary)] opacity-60" />
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[var(--gradient-primary)] opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-20" />
      <div className="flex items-start justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        {Icon && <Icon className={`h-3.5 w-3.5 ${toneClass[tone]} opacity-60`} />}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className={`font-display text-3xl font-semibold tabular-nums leading-none ${toneClass[tone]}`}>
          {value}
        </p>
        {trend && <Sparkline data={trend} color={`oklch(from ${toneStroke[tone]} l c h)`} />}
      </div>
      {sub && <p className="mt-2 text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}
