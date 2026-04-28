import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { TrendingDown, Clock, AlertTriangle, ShieldCheck, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { computeMetrics } from "@/lib/bug-data";
import { useBugStore } from "@/lib/bug-store";
import { ExecLeakageChart } from "@/components/dashboard/ExecLeakageChart";

export const Route = createFileRoute("/executive")({
  component: ExecutiveSummary,
  head: () => ({
    meta: [
      { title: "Transaction Junction — Executive Summary" },
      {
        name: "description",
        content:
          "At-a-glance executive view of defect leakage, lead time for changes, change failure rate and test automation coverage.",
      },
    ],
  }),
});

interface ExecMetric {
  label: string;
  value: string;
  unit?: string;
  trend: string;
  trendDirection: "up" | "down" | "flat";
  trendIsGood: boolean;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  isSample: boolean;
  accent: string;
}

const metrics: ExecMetric[] = [
  {
    label: "Leakage Rate",
    value: "—",
    unit: "%",
    trend: "Live · upload data on Dashboard",
    trendDirection: "flat",
    trendIsGood: true,
    description: "% of defects that reach production. Lower is better.",
    icon: TrendingDown,
    isSample: false,
    accent: "oklch(0.65 0.24 25)",
  },
  {
    label: "Lead Time for Changes",
    value: "2.3",
    unit: "days",
    trend: "↓ 0.4d vs last quarter",
    trendDirection: "down",
    trendIsGood: true,
    description: "Time from commit to production. Shorter = faster delivery.",
    icon: Clock,
    isSample: true,
    accent: "oklch(0.72 0.18 235)",
  },
  {
    label: "Change Failure Rate",
    value: "12",
    unit: "%",
    trend: "↑ 2pp vs last quarter",
    trendDirection: "up",
    trendIsGood: false,
    description: "% of deployments causing a failure in production.",
    icon: AlertTriangle,
    isSample: true,
    accent: "oklch(0.78 0.17 70)",
  },
  {
    label: "Test Automation Coverage",
    value: "68",
    unit: "%",
    trend: "↑ 5pp vs last quarter",
    trendDirection: "up",
    trendIsGood: true,
    description: "% of regression cases covered by automated tests.",
    icon: ShieldCheck,
    isSample: true,
    accent: "oklch(0.72 0.17 155)",
  },
];

// Small presentational component for a single KPI tile. Extracted so both
// the top row (Leakage Rate) and the bottom row (other three metrics) can
// share the exact same layout without duplicating the JSX.
function MetricTile({ m }: { m: ExecMetric }) {
  return (
    <Card className="relative overflow-hidden border-border/60 bg-[var(--gradient-surface)] p-6 shadow-[var(--shadow-card)]">
      <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: m.accent }} />
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ background: `color-mix(in oklab, ${m.accent} 18%, transparent)` }}
          >
            <m.icon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {m.label}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground/80">{m.description}</p>
          </div>
        </div>
        {m.isSample && (
          <Badge
            variant="outline"
            className="border-[var(--warning)]/40 bg-[var(--warning)]/10 font-mono text-[9px] uppercase tracking-[0.15em] text-[var(--warning)]"
          >
            <Sparkles className="mr-1 h-2.5 w-2.5" />
            Sample
          </Badge>
        )}
      </div>

      <div className="mt-6 flex items-baseline gap-2">
        <span className="font-display text-5xl font-semibold tracking-tight">{m.value}</span>
        {m.unit && <span className="font-mono text-sm text-muted-foreground">{m.unit}</span>}
      </div>

      <p
        className="mt-3 font-mono text-[11px]"
        style={{
          color: m.trendIsGood
            ? "oklch(0.72 0.17 155)"
            : m.trendDirection === "flat"
            ? "oklch(0.7 0.03 250)"
            : "oklch(0.65 0.24 25)",
        }}
      >
        {m.trend}
      </p>
    </Card>
  );
}

function ExecutiveSummary() {
  // Pull rows directly from the shared store (persisted in IndexedDB), rather
  // than relying on a stale localStorage summary written by the Dashboard.
  const { rows } = useBugStore();
  const live = useMemo(() => (rows.length > 0 ? computeMetrics(rows) : null), [rows]);

  const resolved: ExecMetric[] = metrics.map((m) => {
    if (m.label === "Leakage Rate" && live) {
      return {
        ...m,
        value: live.leakagePct.toFixed(1),
        trend: `Live · ${live.total.toLocaleString()} bugs analysed`,
        trendIsGood: live.leakagePct <= 15,
      };
    }
    return m;
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader badge="For executive review · key engineering metrics" />

      <main className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="mb-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
            ▸ Executive Summary
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            Engineering health at a glance
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            The four metrics our exec team tracks. Live data flows in from the Dashboard;
            metrics tagged <span className="font-mono text-foreground/80">SAMPLE</span> are placeholders
            until their data feed is wired up.
          </p>
        </div>

        {/* Row 1: Leakage Rate card + its monthly trend chart, side-by-side.
            Row 2: the other three KPI cards. This keeps everything visible
            without scrolling while pairing the chart with the metric it shows. */}
        <div className="grid gap-5 md:grid-cols-2">
          {/* Leakage Rate metric card (first item in `resolved`) */}
          {resolved.slice(0, 1).map((m) => (
            <MetricTile key={m.label} m={m} />
          ))}

          {/* Compact chart → click opens a modal with the full-size version */}
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                aria-label="Expand leakage rate chart"
                className="block w-full cursor-pointer rounded-xl text-left outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
              >
                <ExecLeakageChart rows={rows} compact />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl border-border/60 bg-[var(--gradient-surface)]">
              <DialogTitle className="sr-only">Leakage Rate — Monthly Trend</DialogTitle>
              <DialogDescription className="sr-only">
                Per-month leakage % with running cumulative rate and target reference line.
              </DialogDescription>
              <ExecLeakageChart rows={rows} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {resolved.slice(1).map((m) => (
            <MetricTile key={m.label} m={m} />
          ))}
        </div>

        <Card className="mt-6 border-border/60 bg-card/40 p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Notes
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>Leakage Rate is calculated live once a Jira CSV is uploaded on the Dashboard.</li>
            <li>Lead Time, Change Failure Rate and Test Automation Coverage will switch from sample to live values once their data sources are connected.</li>
            <li>All values are quarter-to-date unless stated otherwise.</li>
          </ul>
        </Card>
      </main>
    </div>
  );
}
