import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { RefreshCw, Bug, AlertOctagon, TrendingDown, Flame, Timer, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { CsvDropzone } from "@/components/dashboard/CsvDropzone";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { FilterChips } from "@/components/dashboard/FilterChips";
import {
  ComponentChart,
  EnvironmentChart,
  LeakageTrendChart,
  MttrByComponentChart,
  QaFunnelChart,
  ReporterChart,
  SeverityChart,
  SystemChart,
} from "@/components/dashboard/Charts";
import {
  applyFilters,
  computeMetrics,
  type Environment,
  type Filters,
  type Severity,
} from "@/lib/bug-data";
import { useBugStore } from "@/lib/bug-store";
import { formatMonthLabel } from "@/lib/format";

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
  reporters: [],
  components: [],
};

function Dashboard() {
  // Rows + filename now live in a root-level store so they survive route
  // changes (Dashboard <-> Executive) and full page reloads (via IndexedDB).
  const { rows, filename, hydrated, setData, reset: resetStore } = useBugStore();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const options = useMemo(() => {
    const systems = Array.from(new Set(rows.map((r) => r.system))).sort();
    const months = Array.from(new Set(rows.map((r) => r.month))).sort();
    const tally = (key: "reporter" | "component") => {
      const m = new Map<string, number>();
      rows.forEach((r) => m.set(r[key], (m.get(r[key]) ?? 0) + 1));
      return Array.from(m.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([v]) => v);
    };
    return { systems, months, reporters: tally("reporter"), components: tally("component") };
  }, [rows]);

  const filtered = useMemo(() => applyFilters(rows, filters), [rows, filters]);
  const metrics = useMemo(() => computeMetrics(filtered), [filtered]);

  const monthlyTrend = useMemo(() => {
    const byMonth = new Map<string, { t: number; p: number }>();
    filtered.forEach((r) => {
      const m = byMonth.get(r.month) ?? { t: 0, p: 0 };
      m.t += 1;
      if (r.environment === "PROD") m.p += 1;
      byMonth.set(r.month, m);
    });
    const sorted = Array.from(byMonth.entries()).sort(([a], [b]) => a.localeCompare(b));
    return {
      total: sorted.map(([, v]) => v.t),
      prod: sorted.map(([, v]) => v.p),
      leakage: sorted.map(([, v]) => (v.t ? (v.p / v.t) * 100 : 0)),
    };
  }, [filtered]);

  const reset = () => {
    resetStore();
    setFilters(EMPTY_FILTERS);
  };

  const headerRight =
    rows.length > 0 ? (
      <>
        <div className="hidden items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 sm:flex">
          <CircleDot className="h-3 w-3 text-[var(--success)]" />
          <span className="font-mono text-[11px] text-muted-foreground">
            {filtered.length.toLocaleString()} / {rows.length.toLocaleString()} bugs
          </span>
        </div>
        <span className="hidden font-mono text-xs text-muted-foreground md:inline">{filename}</span>
        <Button variant="outline" size="sm" onClick={reset}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          New file
        </Button>
      </>
    ) : null;

  return (
    <div className="min-h-screen bg-background">
      <Toaster theme="dark" />
      <AppHeader rightSlot={headerRight} badge="Defect leakage · QA effectiveness · Phase 1" />

      <main className="mx-auto max-w-[1400px] px-6 py-8">
        {!hydrated ? (
          // Brief placeholder while we check IndexedDB for previously-loaded
          // data; stops the dropzone from flashing on reload when data exists.
          <div className="mx-auto max-w-2xl pt-24 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              ▸ Restoring session…
            </p>
          </div>
        ) : rows.length === 0 ? (
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
                setData(r, f);
              }}
            />
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Required columns: <span className="font-mono text-foreground/70">Ticket ID, Created, Resolved, Severity, TJ Environment</span>
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
              <MetricCard label="Total Bugs" value={metrics.total.toLocaleString()} icon={Bug} trend={monthlyTrend.total} />
              <MetricCard label="Prod Bugs" value={metrics.prod.toLocaleString()} tone="critical" icon={AlertOctagon} trend={monthlyTrend.prod} />
              <MetricCard
                label="Leakage %"
                value={`${metrics.leakagePct.toFixed(1)}%`}
                sub="Prod ÷ Total"
                tone={metrics.leakagePct > 50 ? "critical" : "warning"}
                icon={TrendingDown}
                trend={monthlyTrend.leakage}
              />
              <MetricCard
                label="P1 Leakage %"
                value={`${metrics.p1LeakagePct.toFixed(1)}%`}
                sub="Critical bugs in PROD"
                tone={metrics.p1LeakagePct > 30 ? "critical" : "warning"}
                icon={Flame}
              />
              <MetricCard
                label="Avg MTTR"
                value={metrics.avgMttr !== null ? `${metrics.avgMttr.toFixed(1)}d` : "—"}
                sub={`${metrics.resolvedCount} resolved`}
                tone="success"
                icon={Timer}
              />
            </div>

            <Card className="border-border/60 bg-[var(--gradient-surface)] p-5 shadow-[var(--shadow-card)]">
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                <FilterChips
                  label="System"
                  options={options.systems}
                  selected={filters.systems}
                  onChange={(s) => setFilters({ ...filters, systems: s })}
                  rows={rows}
                  accessor={(r) => r.system}
                />
                <FilterChips<Severity>
                  label="Severity"
                  options={["P1", "P2", "P3"]}
                  selected={filters.severities}
                  onChange={(s) => setFilters({ ...filters, severities: s })}
                  rows={rows}
                  accessor={(r) => r.severity}
                />
                <FilterChips
                  label="Month"
                  options={options.months}
                  selected={filters.months}
                  onChange={(s) => setFilters({ ...filters, months: s })}
                  renderLabel={formatMonthLabel}
                  rows={rows}
                  accessor={(r) => r.month}
                />
                <FilterChips<Environment>
                  label="Environment"
                  options={["DEV", "SIT", "UAT", "PROD"]}
                  selected={filters.environments}
                  onChange={(s) => setFilters({ ...filters, environments: s })}
                  rows={rows}
                  accessor={(r) => r.environment}
                />
                <FilterChips
                  label="Reporter (top 15)"
                  options={options.reporters}
                  selected={filters.reporters}
                  onChange={(s) => setFilters({ ...filters, reporters: s })}
                  rows={rows}
                  accessor={(r) => r.reporter}
                />
                <FilterChips
                  label="Component (top 15)"
                  options={options.components}
                  selected={filters.components}
                  onChange={(s) => setFilters({ ...filters, components: s })}
                  rows={rows}
                  accessor={(r) => r.component}
                />
              </div>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <LeakageTrendChart rows={filtered} />
              </div>
              <SeverityChart rows={filtered} />
              <SystemChart rows={filtered} />
              <EnvironmentChart rows={filtered} />
              <QaFunnelChart rows={filtered} />
              <ComponentChart rows={filtered} />
              <ReporterChart rows={filtered} />
              <div className="lg:col-span-2">
                <MttrByComponentChart rows={filtered} />
              </div>
            </div>

            {filtered.length === 0 && (
              <Card className="border-border/60 bg-card/40 p-8 text-center">
                <p className="text-sm text-muted-foreground">No bugs match the current filters.</p>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
