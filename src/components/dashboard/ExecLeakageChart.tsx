import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import type { BugRow } from "@/lib/bug-data";
import { formatMonthLabel } from "@/lib/format";

// Shared palette (kept in sync with Dashboard Charts.tsx).
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
const tooltipItemStyle = { color: "oklch(0.9 0.02 250)" };

const COLOR_BAR_OK = "oklch(0.72 0.18 235)"; // primary blue
const COLOR_BAR_OVER = "oklch(0.65 0.24 25)"; // critical red
const COLOR_LINE = "oklch(0.78 0.16 195)"; // accent cyan
const COLOR_TARGET = "oklch(0.72 0.17 155)"; // success green

const DEFAULT_TARGET_PCT = 15;

interface Props {
  rows: BugRow[];
  targetPct?: number;
}

/**
 * Executive-page leakage trend chart.
 *
 * - Bars: per-month leakage % (bars above target are tinted red so at-a-glance
 *   it's obvious which months missed).
 * - Line: the overall leakage rate across the entire loaded dataset, rendered
 *   as a flat reference so execs can see how each month compares to the
 *   period-wide average (matches the "Leakage Rate" KPI card above the chart).
 * - Reference line: the target threshold (default 15%).
 */
export function ExecLeakageChart({ rows, targetPct = DEFAULT_TARGET_PCT }: Props) {
  const { data, overall } = useMemo(() => {
    // Aggregate per month and compute the dataset-wide leakage in one pass.
    const byMonth = new Map<string, { month: string; total: number; prod: number }>();
    let totalAll = 0;
    let prodAll = 0;
    rows.forEach((r) => {
      const m = byMonth.get(r.month) ?? { month: r.month, total: 0, prod: 0 };
      m.total += 1;
      totalAll += 1;
      if (r.environment === "PROD") {
        m.prod += 1;
        prodAll += 1;
      }
      byMonth.set(r.month, m);
    });

    const overallPct = totalAll ? Math.round((prodAll / totalAll) * 1000) / 10 : 0;

    const monthly = Array.from(byMonth.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((d) => ({
        month: d.month,
        leakage: d.total ? Math.round((d.prod / d.total) * 1000) / 10 : 0,
        total: d.total,
        prod: d.prod,
        overall: overallPct,
      }));

    return { data: monthly, overall: overallPct };
  }, [rows]);

  if (data.length === 0) {
    return (
      <Card className="border-border/60 bg-[var(--gradient-surface)] p-8 text-center shadow-[var(--shadow-card)]">
        <h3 className="font-display text-base font-semibold">Leakage Rate — Monthly Trend</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload a Jira CSV on the Dashboard to populate this chart.
        </p>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 bg-[var(--gradient-surface)] p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold">Leakage Rate — Monthly Trend</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Bars: each month's leakage %. Line: overall leakage rate ({overall}%) across the period. Dashed: {targetPct}% target.
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: COLOR_BAR_OK }} />
            On target
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: COLOR_BAR_OVER }} />
            Over
          </span>
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" {...axis} tickFormatter={formatMonthLabel} />
            <YAxis {...axis} unit="%" />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={tooltipLabelStyle}
              itemStyle={tooltipItemStyle}
              cursor={{ fill: "oklch(0.28 0.04 254 / 0.4)" }}
              labelFormatter={(label) => formatMonthLabel(String(label))}
              formatter={(value, name, entry) => {
                const payload = (entry as { payload?: { total?: number; prod?: number } } | undefined)
                  ?.payload;
                if (name === "Leakage %") {
                  return [
                    `${value}% (${payload?.prod ?? 0} of ${payload?.total ?? 0} in PROD)`,
                    name,
                  ];
                }
                return [`${value}%`, name];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              iconType="square"
            />
            <ReferenceLine
              y={targetPct}
              stroke={COLOR_TARGET}
              strokeDasharray="6 4"
              strokeWidth={1.5}
              ifOverflow="extendDomain"
              label={{
                value: `Target ${targetPct}%`,
                position: "insideTopRight",
                fill: COLOR_TARGET,
                fontSize: 11,
                fontFamily: "JetBrains Mono, monospace",
              }}
            />
            <Bar dataKey="leakage" name="Leakage %" radius={[6, 6, 0, 0]}>
              {data.map((d) => (
                <Cell
                  key={d.month}
                  fill={d.leakage > targetPct ? COLOR_BAR_OVER : COLOR_BAR_OK}
                />
              ))}
            </Bar>
            <Line
              type="monotone"
              dataKey="overall"
              name="Overall leakage"
              stroke={COLOR_LINE}
              strokeWidth={2.5}
              dot={{ fill: COLOR_LINE, r: 3 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
