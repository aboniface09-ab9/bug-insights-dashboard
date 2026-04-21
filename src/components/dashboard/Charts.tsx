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
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function LeakageTrendChart({ rows }: { rows: BugRow[] }) {
  const byMonth = new Map<string, { month: string; total: number; prod: number }>();
  rows.forEach((r) => {
    const m = byMonth.get(r.month) ?? { month: r.month, total: 0, prod: 0 };
    m.total += 1;
    if (r.environment === "PROD") m.prod += 1;
    byMonth.set(r.month, m);
  });
  const data = Array.from(byMonth.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((d) => {
      const [y, m] = d.month.split("-").map(Number);
      const label = new Date(y, (m ?? 1) - 1, 1).toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
      return {
        month: d.month,
        label,
        leakage: d.total ? Math.round((d.prod / d.total) * 1000) / 10 : 0,
        prod: d.prod,
        total: d.total,
      };
    });

  return (
    <ChartCard title="Leakage Trend" subtitle="% of bugs reaching PROD per month · target 15%">
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" {...axis} />
        <YAxis {...axis} unit="%" />
        <Tooltip contentStyle={tooltipStyle} />
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
          dot={{ fill: "oklch(0.72 0.18 235)", r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ChartCard>
  );
}

export function SeverityChart({ rows }: { rows: BugRow[] }) {
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
        >
          {data.map((d) => (
            <Cell key={d.name} fill={COLORS[d.name as Severity]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ChartCard>
  );
}

export function SystemChart({ rows }: { rows: BugRow[] }) {
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
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "oklch(0.28 0.04 254 / 0.5)" }} />
        <Bar dataKey="count" fill="oklch(0.78 0.16 195)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartCard>
  );
}

export function QaFunnelChart({ rows }: { rows: BugRow[] }) {
  const stages: Environment[] = ["DEV", "SIT", "UAT", "PROD"];
  const data = stages.map((s) => ({
    stage: s,
    count: rows.filter((r) => r.environment === s).length,
  }));
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <ChartCard title="QA Funnel" subtitle="Defect catch rate across environments">
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 0 }}>
        <CartesianGrid stroke={grid} strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" {...axis} />
        <YAxis type="category" dataKey="stage" {...axis} width={50} />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: "oklch(0.28 0.04 254 / 0.5)" }}
          formatter={(v) => [`${v} bugs (${((Number(v) / max) * 100).toFixed(0)}%)`, "Caught"]}
        />
        <Bar dataKey="count" radius={[0, 6, 6, 0]}>
          {data.map((d) => (
            <Cell key={d.stage} fill={COLORS[d.stage as Environment]} />
          ))}
        </Bar>
      </BarChart>
    </ChartCard>
  );
}

export function EnvironmentChart({ rows }: { rows: BugRow[] }) {
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
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "oklch(0.28 0.04 254 / 0.5)" }} />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.env} fill={COLORS[d.env as Environment]} />
          ))}
        </Bar>
      </BarChart>
    </ChartCard>
  );
}
