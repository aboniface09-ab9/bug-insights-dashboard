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
import { CHART } from "@/lib/chart-colors";
import { formatMonthLabel } from "@/lib/format";

// All colours come from the shared `CHART` palette — no raw hex/oklch here.
// Severity + Environment reuse the same semantic roles so a P1 bar and a PROD
// bar always draw in the same shade across every chart in the app.
const COLORS: Record<Severity | Environment, string> = {
  ...CHART.severity,
  ...CHART.environment,
};

const axis = { stroke: CHART.axis, fontSize: 11 };
const grid = CHART.grid;

const tooltipStyle = {
  backgroundColor: CHART.tooltip.bg,
  border: `1px solid ${CHART.tooltip.border}`,
  borderRadius: 8,
  fontSize: 12,
  color: CHART.tooltip.label,
};

const tooltipLabelStyle = {
  color: CHART.tooltip.label,
  fontWeight: 600,
  marginBottom: 4,
};

const tooltipItemStyle = {
  color: CHART.tooltip.item,
};

const cursorFill = { fill: CHART.cursor };

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
          const payload = (e as { activePayload?: Array<{ payload?: { month?: string } }> } | undefined)
            ?.activePayload?.[0]?.payload;
          const month = payload?.month;
          if (month) {
            const label = formatMonthLabel(month);
            openFor(`Leakage · ${label}`, `All bugs created in ${label}`, (r) => r.month === month);
          }
        }}
      >
        <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" {...axis} tickFormatter={formatMonthLabel} />
        <YAxis {...axis} unit="%" />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          labelFormatter={(label) => formatMonthLabel(String(label))}
        />
        <ReferenceLine
          y={15}
          stroke={CHART.success}
          strokeDasharray="6 4"
          strokeWidth={1.5}
          label={{
            value: "Target 15%",
            position: "insideTopRight",
            fill: CHART.success,
            fontSize: 11,
            fontFamily: "JetBrains Mono, monospace",
          }}
        />
        <Line
          type="monotone"
          dataKey="leakage"
          stroke={CHART.primary}
          strokeWidth={2.5}
          dot={{ fill: CHART.primary, r: 4, cursor: "pointer" }}
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
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={cursorFill} />
        <Bar
          dataKey="count"
          fill={CHART.accent}
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
          cursor={cursorFill}
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
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={cursorFill} />
        <Bar
          dataKey="count"
          fill={CHART.primary}
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
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={cursorFill} />
        <Bar
          dataKey="count"
          fill={CHART.accent}
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
          cursor={cursorFill}
          formatter={(v, _n, p) => {
            const payload = (p as { payload?: { n?: number } } | undefined)?.payload;
            return [`${v}d (${payload?.n ?? 0} resolved)`, "Avg MTTR"];
          }}
        />
        <Bar
          dataKey="mttr"
          fill={CHART.deep}
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
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={cursorFill} />
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
