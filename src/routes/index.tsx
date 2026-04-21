import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Activity, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { CsvDropzone } from "@/components/dashboard/CsvDropzone";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { FilterChips } from "@/components/dashboard/FilterChips";
import {
  EnvironmentChart,
  LeakageTrendChart,
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
      <header className="border-b border-border/60 bg-card/40 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--gradient-primary)] shadow-[var(--shadow-glow)]">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-lg font-semibold leading-none">
                Bug Quality Dashboard
              </h1>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Defect leakage · QA effectiveness · Phase 1
              </p>
            </div>
          </div>
          {rows.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
                {filename}
              </span>
              <Button variant="outline" size="sm" onClick={reset}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                New file
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-8">
        {rows.length === 0 ? (
          <div className="mx-auto max-w-2xl pt-12">
            <CsvDropzone
              onLoaded={(r, f) => {
                setRows(r);
                setFilename(f);
              }}
            />
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Required columns: <span className="font-mono">Ticket ID, Created, Resolved, Severity, TJ Environment</span>
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
