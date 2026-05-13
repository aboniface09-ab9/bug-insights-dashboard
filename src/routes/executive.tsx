import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { TrendingDown, Clock, AlertTriangle, ShieldCheck, Sparkles, Rocket } from "lucide-react";
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
          "At-a-glance executive view of lead time for changes, deployment frequency, defect leakage, change failure rate and test automation coverage.",
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
  /** Optional override for the big number's colour. When unset, value renders
   *  in the default foreground. Used for the live Defect Leakage tile so the
   *  number itself reflects how far over/under target we are. */
  valueColor?: string;
  /** Expanded context surfaced in the click-to-expand modal. Pulled from the
   *  exco brief so the dashboard reads in the same language. */
  detail: {
    definition: string;
    target: string;
    measurement: string;
    notes?: string[];
  };
}

// Status colour bands for the Defect Leakage value, anchored on a 5% target:
//   ≤ 5%   → green   (on target)
//    5–10% → amber   (drifting)
//    > 10% → red     (well over)
// Returned in oklch so they sit cleanly alongside the existing theme tokens.
function leakageStatus(pct: number): { accent: string; valueColor: string; label: string } {
  if (pct <= 5) {
    const c = "oklch(0.72 0.17 155)"; // success / green
    return { accent: c, valueColor: c, label: "On target" };
  }
  if (pct <= 10) {
    const c = "oklch(0.78 0.17 70)"; // warning / amber
    return { accent: c, valueColor: c, label: "Drifting · within 2× target" };
  }
  const c = "oklch(0.65 0.24 25)"; // critical / red
  return { accent: c, valueColor: c, label: "Well over target" };
}

// Five metrics tracked per the exco brief. Wording on each tile is lifted
// straight from the brief so the dashboard reads in the same language as the
// document the team is being measured against. Targets:
//   - Defect leakage:               < 5%
//   - Change failure rate:          < 10%
//   - Test automation coverage:     > 70%
//   - Lead time for changes:        short-term Medium (1wk–1mo), stretched High (1d–1wk)
//   - Deployment frequency:         monthly cadence, platform-dependent
const metrics: ExecMetric[] = [
  {
    label: "Defect Leakage",
    value: "—",
    unit: "%",
    trend: "Live · upload data on Dashboard",
    trendDirection: "flat",
    trendIsGood: true,
    description:
      "% of defects reaching PROD. Measures testing & review effectiveness. Target < 5%.",
    icon: TrendingDown,
    isSample: false,
    accent: "oklch(0.65 0.24 25)",
    detail: {
      definition:
        "The percentage of defects that reach production versus those caught in QA. Measures the effectiveness of testing and reviews.",
      target: "< 5%",
      measurement:
        "Calculated live from Jira bug exports — production bugs as a percentage of total bugs logged in the period.",
      notes: ["Highlights gaps in automation, test coverage, and requirements."],
    },
  },
  {
    label: "Lead Time for Changes",
    value: "2.3",
    unit: "days",
    trend: "Short-term: Medium (1wk–1mo) · Stretched: High (1d–1wk)",
    trendDirection: "down",
    trendIsGood: true,
    description: "Time from code committed to live in production. Indicates delivery efficiency.",
    icon: Clock,
    isSample: true,
    accent: "oklch(0.72 0.18 235)",
    detail: {
      definition: "Time taken from code committed to live in production.",
      target:
        "Short-term: Medium (1 week – 1 month). Stretched: High (1 day – 1 week). Project size dependent.",
      measurement: "Measured continuously through various stages (Testing, UAT, Prod).",
      notes: [
        "Indicates delivery efficiency / exposes bottlenecks.",
        "Shorter lead times = faster customer value = increased ROI.",
      ],
    },
  },
  {
    label: "Deployment Frequency",
    value: "8",
    unit: "/month",
    trend: "Measured monthly · platform dependent (Switch vs TJPay)",
    trendDirection: "flat",
    trendIsGood: true,
    description: "How often successful releases reach production.",
    icon: Rocket,
    isSample: true,
    accent: "oklch(0.7 0.18 280)",
    detail: {
      definition: "How often successful releases are made to production.",
      target: "Monthly cadence. Platform dependent (e.g. Switch vs TJPay).",
      measurement: "Counted per platform, per month.",
      notes: ["Indicates how regularly customer value is reaching production."],
    },
  },
  {
    label: "Change Failure Rate",
    value: "12",
    unit: "%",
    trend: "Target < 10% · balances speed with stability",
    trendDirection: "up",
    trendIsGood: false,
    description: "% of deployments causing incidents, rollbacks or hotfixes.",
    icon: AlertTriangle,
    isSample: true,
    accent: "oklch(0.78 0.17 70)",
    detail: {
      definition: "Percentage of deployments with incidents, rollbacks or hotfixes.",
      target: "< 10%",
      measurement: "Failed deployments ÷ total deployments per month.",
      notes: ["Balances our speed with stability.", "Prevents 'fast but fragile' delivery."],
    },
  },
  {
    label: "Test Automation Coverage",
    value: "68",
    unit: "%",
    trend: "Target > 70% · automation enables speed without sacrificing quality",
    trendDirection: "up",
    trendIsGood: true,
    description: "% of system covered by automated tests.",
    icon: ShieldCheck,
    isSample: true,
    accent: "oklch(0.72 0.17 155)",
    detail: {
      definition:
        "How much of a system is covered by automated tests. Percentage of automated vs manual tests.",
      target: "> 70%",
      measurement: "Aggregated coverage report per system.",
      notes: ["Automation enables speed without sacrificing quality."],
    },
  },
];

// Tiny label-over-paragraph block used inside the detail modal. Keeps the
// "── HEADING ──" / body rhythm consistent across the four detail sections.
function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </p>
      <p className="mt-1 text-sm text-foreground/85">{children}</p>
    </div>
  );
}

// Larger version of a metric, rendered inside the click-to-expand modal.
// Same visual identity as the small tile (icon, accent stripe, big number)
// but at a more readable size and with the full exco-brief context below.
function MetricDetailModal({ m }: { m: ExecMetric }) {
  return (
    <div className="space-y-5">
      <div className="h-1 w-full rounded-full" style={{ background: m.accent }} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-lg"
            style={{ background: `color-mix(in oklab, ${m.accent} 18%, transparent)` }}
          >
            <m.icon className="h-6 w-6" />
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {m.label}
            </p>
            <p className="mt-1 text-sm text-muted-foreground/80">{m.description}</p>
          </div>
        </div>
        {m.isSample && (
          <Badge
            variant="outline"
            className="border-[var(--warning)]/40 bg-[var(--warning)]/10 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--warning)]"
          >
            <Sparkles className="mr-1 h-3 w-3" />
            Sample
          </Badge>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span
          className="font-display text-7xl font-semibold tracking-tight"
          style={m.valueColor ? { color: m.valueColor } : undefined}
        >
          {m.value}
        </span>
        {m.unit && <span className="font-mono text-base text-muted-foreground">{m.unit}</span>}
      </div>

      <p
        className="font-mono text-[11px]"
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

      <div className="space-y-4 border-t border-border/60 pt-4">
        <DetailSection title="What it measures">{m.detail.definition}</DetailSection>
        <DetailSection title="Target">{m.detail.target}</DetailSection>
        <DetailSection title="How we measure">{m.detail.measurement}</DetailSection>
        {m.detail.notes && m.detail.notes.length > 0 && (
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Notes
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {m.detail.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// Wraps a tile in a Dialog so clicking it opens MetricDetailModal. Used for
// every KPI tile on the page so the drill-down UX is consistent across the
// whole row, mirroring the chart's existing click-to-expand behaviour.
function ClickableMetricTile({ m }: { m: ExecMetric }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Expand ${m.label}`}
          className="block w-full cursor-pointer rounded-xl text-left outline-none ring-offset-background transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
        >
          <MetricTile m={m} />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl border-border/60 bg-[var(--gradient-surface)]">
        <DialogTitle className="sr-only">{m.label}</DialogTitle>
        <DialogDescription className="sr-only">{m.description}</DialogDescription>
        <MetricDetailModal m={m} />
      </DialogContent>
    </Dialog>
  );
}

// Small presentational component for a single KPI tile. Extracted so both
// the top row (Defect Leakage) and the bottom row can share the same layout
// without duplicating the JSX.
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
        <span
          className="font-display text-5xl font-semibold tracking-tight"
          style={m.valueColor ? { color: m.valueColor } : undefined}
        >
          {m.value}
        </span>
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
    if (m.label === "Defect Leakage" && live) {
      const status = leakageStatus(live.leakagePct);
      return {
        ...m,
        value: live.leakagePct.toFixed(1),
        trend: `${status.label} · ${live.total.toLocaleString()} bugs analysed`,
        trendIsGood: live.leakagePct <= 5,
        accent: status.accent,
        valueColor: status.valueColor,
      };
    }
    return m;
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader badge="Performance metrics for exco review" />

      <main className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="mb-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
            ▸ Executive Summary
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            How we&apos;re delivering
          </h2>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
            The five numbers the leadership team uses to gauge engineering health. Together they
            answer: are we shipping fast enough, often enough, reliably enough — and is our test
            discipline keeping pace?
          </p>
          <p className="mt-3 max-w-3xl text-xs text-muted-foreground/80">
            Live data flows in from the Dashboard; metrics tagged{" "}
            <span className="font-mono text-foreground/80">SAMPLE</span> are placeholders until
            their data feeds are wired up.
          </p>
        </div>

        {/* Row 1: Defect Leakage KPI tile + its monthly trend chart side-by-side.
            Row 2: the remaining four KPI tiles in a single row so the whole set
            of metrics is visible without scrolling. */}
        <div className="grid gap-5 md:grid-cols-2">
          {/* Defect Leakage metric card (first item in `resolved`).
              Click opens the metric-detail modal — see ClickableMetricTile. */}
          {resolved.slice(0, 1).map((m) => (
            <ClickableMetricTile key={m.label} m={m} />
          ))}

          {/* Compact chart → click opens a modal with the full-size version */}
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                aria-label="Expand defect leakage chart"
                className="block w-full cursor-pointer rounded-xl text-left outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
              >
                <ExecLeakageChart rows={rows} compact />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl border-border/60 bg-[var(--gradient-surface)]">
              <DialogTitle className="sr-only">Defect Leakage — Monthly Trend</DialogTitle>
              <DialogDescription className="sr-only">
                Per-month leakage % with running cumulative rate and target reference line.
              </DialogDescription>
              <ExecLeakageChart rows={rows} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {resolved.slice(1).map((m) => (
            <ClickableMetricTile key={m.label} m={m} />
          ))}
        </div>

        <Card className="mt-6 border-border/60 bg-card/40 p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Notes
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>Defect Leakage is calculated live once a Jira CSV is loaded on the Dashboard.</li>
            <li>
              Lead Time, Deployment Frequency, Change Failure Rate and Test Automation Coverage will
              switch from sample to live values once their data sources are connected.
            </li>
            <li>All values are quarter-to-date unless stated otherwise.</li>
          </ul>
        </Card>
      </main>
    </div>
  );
}
