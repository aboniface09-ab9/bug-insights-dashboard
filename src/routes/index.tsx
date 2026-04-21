import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Activity, RefreshCw, Bug, AlertOctagon, TrendingDown, Flame, Timer, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { CsvDropzone } from "@/components/dashboard/CsvDropzone";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { FilterChips } from "@/components/dashboard/FilterChips";
import {
  EnvironmentChart,
  LeakageTrendChart,
  QaFunnelChart,
  SeverityChart,
  SystemChart,
} from "@/components/dashboard/Charts";
import {
  applyFilters,
  computeMetrics,
  type BugRow,
  type Environment,
  type Filters,
  type Severity,
} from "@/lib/bug-data";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Bug Quality Dashboard — Defect Leakage & QA Metrics" },
      {
        name: "description",
        content:
          "Interactive dashboard for visualising bug quality, defect leakage and QA effectiveness from Jira exports.",
      },
    ],
  }),
});

const EMPTY_FILTERS: Filters = {
  systems: [],
  severities: [],
  months: [],
  environments: [],
};

function Dashboard() {
  const [rows, setRows] = useState<BugRow[]>([]);
  const [filename, setFilename] = useState<string>("");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const options = useMemo(() => {
    const systems = Array.from(new Set(rows.map((r) => r.system))).sort();
    const months = Array.from(new Set(rows.map((r) => r.month))).sort();
    return { systems, months };
  }, [rows]);

  const filtered = useMemo(() => applyFilters(rows, filters), [rows, filters]);
  const metrics = useMemo(() => computeMetrics(filtered), [filtered]);

  const reset = () => {
    setRows([]);
    setFilename("");
    setFilters(EMPTY_FILTERS);
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster theme="dark" />

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--gradient-primary)] shadow-[var(--shadow-glow)]">
              <Activity className="h-5 w-5 text-primary-foreground" />
              <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--success)]" />
              </span>
            </div>
            <div>
              <h1 className="font-display text-lg font-semibold leading-none tracking-tight">
                Bug Quality Dashboard
              </h1>
              <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Defect leakage · QA effectiveness · Phase 1
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {rows.length > 0 && (
              <>
                <div className="hidden items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 sm:flex">
                  <CircleDot className="h-3 w-3 text-[var(--success)]" />
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {filtered.length.toLocaleString()} / {rows.length.toLocaleString()} bugs
                  </span>
                </div>
                <span className="hidden font-mono text-xs text-muted-foreground md:inline">
                  {filename}
                </span>
                <Button variant="outline" size="sm" onClick={reset}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  New file
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-8">
        {rows.length === 0 ? (
          <div className="mx-auto max-w-2xl pt-16">
            <div className="mb-8 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
                ▸ Phase 1 · Live preview
              </p>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight">
                See what's <span className="bg-[var(--gradient-primary)] bg-clip-text text-transparent">leaking</span> to production.
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
                Replace manual QA reports with a live, filterable dashboard built from your Jira exports.
              </p>
            </div>
            <CsvDropzone
              onLoaded={(r, f) => {
                setRows(r);
                setFilename(f);
              }}
            />
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Required columns: <span className="font-mono text-foreground/70">Ticket ID, Created, Resolved, Severity, TJ Environment</span>
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
              <MetricCard label="Total Bugs" value={metrics.total.toLocaleString()} />
              <MetricCard
                label="Prod Bugs"
                value={metrics.prod.toLocaleString()}
                tone="critical"
              />
              <MetricCard
                label="Leakage %"
                value={`${metrics.leakagePct.toFixed(1)}%`}
                sub="Prod ÷ Total"
                tone={metrics.leakagePct > 50 ? "critical" : "warning"}
              />
              <MetricCard
                label="P1 Leakage %"
                value={`${metrics.p1LeakagePct.toFixed(1)}%`}
                sub="Critical bugs in PROD"
                tone={metrics.p1LeakagePct > 30 ? "critical" : "warning"}
              />
              <MetricCard
                label="Avg MTTR"
                value={metrics.avgMttr !== null ? `${metrics.avgMttr.toFixed(1)}d` : "—"}
                sub={`${metrics.resolvedCount} resolved`}
                tone="success"
              />
            </div>

            {/* Filters */}
            <Card className="border-border/60 bg-[var(--gradient-surface)] p-5 shadow-[var(--shadow-card)]">
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                <FilterChips
                  label="System"
                  options={options.systems}
                  selected={filters.systems}
                  onChange={(s) => setFilters({ ...filters, systems: s })}
                />
                <FilterChips<Severity>
                  label="Severity"
                  options={["P1", "P2", "P3"]}
                  selected={filters.severities}
                  onChange={(s) => setFilters({ ...filters, severities: s })}
                />
                <FilterChips
                  label="Month"
                  options={options.months}
                  selected={filters.months}
                  onChange={(s) => setFilters({ ...filters, months: s })}
                />
                <FilterChips<Environment>
                  label="Environment"
                  options={["DEV", "SIT", "UAT", "PROD"]}
                  selected={filters.environments}
                  onChange={(s) => setFilters({ ...filters, environments: s })}
                />
              </div>
            </Card>

            {/* Charts */}
            <div className="grid gap-4 lg:grid-cols-2">
              <LeakageTrendChart rows={filtered} />
              <SeverityChart rows={filtered} />
              <SystemChart rows={filtered} />
              <EnvironmentChart rows={filtered} />
            </div>

            {filtered.length === 0 && (
              <Card className="border-border/60 bg-card/40 p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No bugs match the current filters.
                </p>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
