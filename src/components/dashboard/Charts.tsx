import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { TicketListDialog } from "./TicketListDialog";
import type { BugRow, Severity, Environment } from "@/lib/bug-data";

const COLORS = {
  P1: "oklch(0.65 0.24 25)",
  P2: "oklch(0.78 0.17 70)",
  P3: "oklch(0.72 0.18 235)",
  PROD: "oklch(0.65 0.24 25)",
  UAT: "oklch(0.78 0.17 70)",
  SIT: "oklch(0.78 0.16 195)",
  DEV: "oklch(0.72 0.17 155)",
};

const axis = { stroke: "oklch(0.7 0.03 250)", fontSize: 11 };
const grid = "oklch(0.32 0.04 254)";

const tooltipStyle = {
  backgroundColor: "oklch(0.22 0.035 254)",
  border: "1px solid oklch(0.32 0.04 254)",
  borderRadius: 8,
  fontSize: 12,
  color: "oklch(0.96 0.01 250)",
};

const tooltipLabelStyle = {
  color: "oklch(0.96 0.01 250)",
  fontWeight: 600,
  marginBottom: 4,
};

const tooltipItemStyle = {
  color: "oklch(0.9 0.02 250)",
};

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

function ChartCard({ title, subtitle, children }: ChartCardProps) {
  return (
    <Card className="border-border/60 bg-[var(--gradient-surface)] p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4">
        <h3 className="font-display text-base font-semibold">{title}</h3>
        {subtitle && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {subtitle} <span className="text-primary/70">· click bars to view tickets</span>
          </p>
        )}
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// Hook for managing a drill-down dialog tied to a specific chart.
function useDrillDown(rows: BugRow[]) {
  const [state, setState] = useState<{
    open: boolean;
    title: string;
    subtitle?: string;
    filtered: BugRow[];
  }>({ open: false, title: "", filtered: [] });

  const openFor = (title: string, subtitle: string, predicate: (r: BugRow) => boolean) => {
    setState({ open: true, title, subtitle, filtered: rows.filter(predicate) });
  };

  const dialog = (
    <TicketListDialog
      open={state.open}
      onOpenChange={(o) => setState((s) => ({ ...s, open: o }))}
      title={state.title}
      subtitle={state.subtitle}
      rows={state.filtered}
    />
  );

  return { openFor, dialog };
}

export function LeakageTrendChart({ rows }: { rows: BugRow[] }) {
  const { openFor, dialog } = useDrillDown(rows);
  const data = useMemo(() => {
    const byMonth = new Map<string, { month: string; total: number; prod: number }>();
    rows.forEach((r) => {
      const m = byMonth.get(r.month) ?? { month: r.month, total: 0, prod: 0 };
      m.total += 1;
      if (r.environment === "PROD") m.prod += 1;
      byMonth.set(r.month, m);
    });
    return Array.from(byMonth.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((d) => ({
        month: d.month,
        leakage: d.total ? Math.round((d.prod / d.total) * 1000) / 10 : 0,
        prod: d.prod,
        total: d.total,
      }));
  }, [rows]);

  return (
    <ChartCard title="Leakage Trend" subtitle="% of bugs reaching PROD per month · target 15%">
      <LineChart
        data={data}
        margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
        onClick={(e) => {
          const month = (e?.activePayload?.[0]?.payload as { month?: string } | undefined)?.month;
          if (month) openFor(`Leakage · ${month}`, `All bugs created in ${month}`, (r) => r.month === month);
        }}
      >
        <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" {...axis} />
        <YAxis {...axis} unit="%" />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
        <ReferenceLine
          y={15}
          stroke="oklch(0.72 0.17 155)"
          strokeDasharray="6 4"
          strokeWidth={1.5}
          label={{
            value: "Target 15%",
            position: "insideTopRight",
            fill: "oklch(0.72 0.17 155)",
            fontSize: 11,
            fontFamily: "JetBrains Mono, monospace",
          }}
        />
        <Line
          type="monotone"
          dataKey="leakage"
          stroke="oklch(0.72 0.18 235)"
          strokeWidth={2.5}
          dot={{ fill: "oklch(0.72 0.18 235)", r: 4, cursor: "pointer" }}
          activeDot={{ r: 6, cursor: "pointer" }}
        />
      </LineChart>
      {dialog}
    </ChartCard>
  );
}

export function SeverityChart({ rows }: { rows: BugRow[] }) {
  const { openFor, dialog } = useDrillDown(rows);
  const counts: Record<Severity, number> = { P1: 0, P2: 0, P3: 0 };
  rows.forEach((r) => {
    counts[r.severity] = (counts[r.severity] ?? 0) + 1;
  });
  const data = (["P1", "P2", "P3"] as Severity[]).map((s) => ({ name: s, value: counts[s] }));

  return (
    <ChartCard title="Severity Distribution" subtitle="Breakdown by priority">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={50}
          outerRadius={90}
          paddingAngle={2}
          onClick={(d) => {
            const sev = (d as { name?: Severity })?.name;
            if (sev) openFor(`Severity · ${sev}`, `All ${sev} bugs`, (r) => r.severity === sev);
          }}
          cursor="pointer"
        >
          {data.map((d) => (
            <Cell key={d.name} fill={COLORS[d.name as Severity]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
      {dialog}
    </ChartCard>
  );
}

export function SystemChart({ rows }: { rows: BugRow[] }) {
  const { openFor, dialog } = useDrillDown(rows);
  const counts = new Map<string, number>();
  rows.forEach((r) => counts.set(r.system, (counts.get(r.system) ?? 0) + 1));
  const data = Array.from(counts.entries())
    .map(([system, count]) => ({ system, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <ChartCard title="Bugs by System" subtitle="Volume per source system">
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="system" {...axis} />
        <YAxis {...axis} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={{ fill: "oklch(0.28 0.04 254 / 0.5)" }} />
        <Bar
          dataKey="count"
          fill="oklch(0.78 0.16 195)"
          radius={[6, 6, 0, 0]}
          cursor="pointer"
          onClick={(d) => {
            const sys = (d as { system?: string })?.system;
            if (sys) openFor(`System · ${sys}`, `All bugs in ${sys}`, (r) => r.system === sys);
          }}
        />
      </BarChart>
      {dialog}
    </ChartCard>
  );
}

export function QaFunnelChart({ rows }: { rows: BugRow[] }) {
  const { openFor, dialog } = useDrillDown(rows);
  const stages: Environment[] = ["DEV", "SIT", "UAT", "PROD"];
  const data = stages.map((s) => ({
    stage: s,
    count: rows.filter((r) => r.environment === s).length,
  }));
  const total = data.reduce((sum, d) => sum + d.count, 0) || 1;

  return (
    <ChartCard title="QA Funnel" subtitle="Where defects are caught across environments">
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 0 }}>
        <CartesianGrid stroke={grid} strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" {...axis} />
        <YAxis type="category" dataKey="stage" {...axis} width={50} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          cursor={{ fill: "oklch(0.28 0.04 254 / 0.5)" }}
          formatter={(v) => [`${v} bugs (${((Number(v) / total) * 100).toFixed(0)}% of total)`, "Caught"]}
        />
        <Bar
          dataKey="count"
          radius={[0, 6, 6, 0]}
          cursor="pointer"
          onClick={(d) => {
            const env = (d as { stage?: Environment })?.stage;
            if (env) openFor(`Caught in ${env}`, `Bugs whose environment is ${env}`, (r) => r.environment === env);
          }}
        >
          {data.map((d) => (
            <Cell key={d.stage} fill={COLORS[d.stage as Environment]} />
          ))}
        </Bar>
      </BarChart>
      {dialog}
    </ChartCard>
  );
}

export function ReporterChart({ rows }: { rows: BugRow[] }) {
  const { openFor, dialog } = useDrillDown(rows);
  const counts = new Map<string, number>();
  rows.forEach((r) => counts.set(r.reporter, (counts.get(r.reporter) ?? 0) + 1));
  const data = Array.from(counts.entries())
    .map(([reporter, count]) => ({ reporter, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <ChartCard title="Top Bug Reporters" subtitle="Who logs the most defects (top 10)">
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
        <CartesianGrid stroke={grid} strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" {...axis} />
        <YAxis type="category" dataKey="reporter" {...axis} width={120} tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={{ fill: "oklch(0.28 0.04 254 / 0.5)" }} />
        <Bar
          dataKey="count"
          fill="oklch(0.72 0.18 235)"
          radius={[0, 6, 6, 0]}
          cursor="pointer"
          onClick={(d) => {
            const rep = (d as { reporter?: string })?.reporter;
            if (rep) openFor(`Reporter · ${rep}`, `Bugs logged by ${rep}`, (r) => r.reporter === rep);
          }}
        />
      </BarChart>
      {dialog}
    </ChartCard>
  );
}

export function ComponentChart({ rows }: { rows: BugRow[] }) {
  const { openFor, dialog } = useDrillDown(rows);
  const counts = new Map<string, number>();
  rows.forEach((r) => counts.set(r.component, (counts.get(r.component) ?? 0) + 1));
  const data = Array.from(counts.entries())
    .map(([component, count]) => ({ component, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  return (
    <ChartCard title="Bugs by Component" subtitle="Components with the most defects (top 12)">
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
        <CartesianGrid stroke={grid} strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" {...axis} />
        <YAxis type="category" dataKey="component" {...axis} width={140} tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={{ fill: "oklch(0.28 0.04 254 / 0.5)" }} />
        <Bar
          dataKey="count"
          fill="oklch(0.78 0.16 195)"
          radius={[0, 6, 6, 0]}
          cursor="pointer"
          onClick={(d) => {
            const c = (d as { component?: string })?.component;
            if (c) openFor(`Component · ${c}`, `Bugs in ${c}`, (r) => r.component === c);
          }}
        />
      </BarChart>
      {dialog}
    </ChartCard>
  );
}

export function MttrByComponentChart({ rows }: { rows: BugRow[] }) {
  const { openFor, dialog } = useDrillDown(rows);
  const buckets = new Map<string, number[]>();
  rows.forEach((r) => {
    if (r.mttr === null) return;
    const arr = buckets.get(r.component) ?? [];
    arr.push(r.mttr);
    buckets.set(r.component, arr);
  });
  const data = Array.from(buckets.entries())
    .map(([component, vals]) => ({
      component,
      mttr: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10,
      n: vals.length,
    }))
    .sort((a, b) => b.mttr - a.mttr)
    .slice(0, 12);

  return (
    <ChartCard title="Mean Time to Resolve by Component" subtitle="Average days to resolve · top 12 slowest">
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
        <CartesianGrid stroke={grid} strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" {...axis} unit="d" />
        <YAxis type="category" dataKey="component" {...axis} width={140} tick={{ fontSize: 10 }} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          cursor={{ fill: "oklch(0.28 0.04 254 / 0.5)" }}
          formatter={(v, _n, p) => {
            const payload = (p as { payload?: { n?: number } } | undefined)?.payload;
            return [`${v}d (${payload?.n ?? 0} resolved)`, "Avg MTTR"];
          }}
        />
        <Bar
          dataKey="mttr"
          fill="oklch(0.78 0.17 70)"
          radius={[0, 6, 6, 0]}
          cursor="pointer"
          onClick={(d) => {
            const c = (d as { component?: string })?.component;
            if (c) openFor(`MTTR · ${c}`, `Resolved bugs in ${c}`, (r) => r.component === c && r.mttr !== null);
          }}
        />
      </BarChart>
      {dialog}
    </ChartCard>
  );
}

export function EnvironmentChart({ rows }: { rows: BugRow[] }) {
  const { openFor, dialog } = useDrillDown(rows);
  const envs: Environment[] = ["DEV", "SIT", "UAT", "PROD"];
  const data = envs.map((e) => ({
    env: e,
    count: rows.filter((r) => r.environment === e).length,
  }));

  return (
    <ChartCard title="Environment Breakdown" subtitle="DEV → PROD pipeline">
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="env" {...axis} />
        <YAxis {...axis} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={{ fill: "oklch(0.28 0.04 254 / 0.5)" }} />
        <Bar
          dataKey="count"
          radius={[6, 6, 0, 0]}
          cursor="pointer"
          onClick={(d) => {
            const env = (d as { env?: Environment })?.env;
            if (env) openFor(`Environment · ${env}`, `Bugs in ${env}`, (r) => r.environment === env);
          }}
        >
          {data.map((d) => (
            <Cell key={d.env} fill={COLORS[d.env as Environment]} />
          ))}
        </Bar>
      </BarChart>
      {dialog}
    </ChartCard>
  );
}
