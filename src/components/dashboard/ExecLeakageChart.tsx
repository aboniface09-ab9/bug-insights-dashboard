import { useMemo } from "react";
import { Maximize2 } from "lucide-react";
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
import { CHART } from "@/lib/chart-colors";
import { formatMonthLabel } from "@/lib/format";

// All colour decisions live in `@/lib/chart-colors`. Keep this file free of
// raw hex / oklch — go through the `CHART` palette so the Dashboard and
// Executive views stay visually aligned.
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
const tooltipItemStyle = { color: CHART.tooltip.item };

const COLOR_BAR_OK = CHART.primary;   // DARK CYAN — at or below target
const COLOR_BAR_OVER = CHART.alert;   // PINK      — above target
const COLOR_LINE = CHART.accent;      // CYAN      — running cumulative
const COLOR_TARGET = CHART.success;   // TEAL      — target reference

const DEFAULT_TARGET_PCT = 15;

interface Props {
  rows: BugRow[];
  targetPct?: number;
  /**
   * Compact mode renders a metric-card-sized chart suitable for fitting
   * alongside the KPI cards at the top of the Executive page. The full
   * version (taller, with legend + long subtitle) is used inside the
   * click-to-expand modal.
   */
  compact?: boolean;
}

/**
 * Executive-page leakage trend chart.
 *
 * - Bars: per-month leakage % (bars above target are tinted red so at-a-glance
 *   it's obvious which months missed).
 * - Line: the running *cumulative* leakage rate — at each month the value
 *   reflects the overall leakage across every month up to and including that
 *   one. So a great month will visibly drag the overall line down, and a bad
 *   month will pull it up. The final point equals the headline Leakage Rate
 *   KPI shown above the chart.
 * - Reference line: the target threshold (default 15%).
 */
export function ExecLeakageChart({ rows, targetPct = DEFAULT_TARGET_PCT, compact = false }: Props) {
  const { data, overall } = useMemo(() => {
    // Aggregate per month.
    const byMonth = new Map<string, { month: string; total: number; prod: number }>();
    rows.forEach((r) => {
      const m = byMonth.get(r.month) ?? { month: r.month, total: 0, prod: 0 };
      m.total += 1;
      if (r.environment === "PROD") m.prod += 1;
      byMonth.set(r.month, m);
    });

    // Running cumulative totals as we walk forward in time.
    let cumTotal = 0;
    let cumProd = 0;
    const monthly = Array.from(byMonth.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((d) => {
        cumTotal += d.total;
        cumProd += d.prod;
        const cumPct = cumTotal ? Math.round((cumProd / cumTotal) * 1000) / 10 : 0;
        return {
          month: d.month,
          leakage: d.total ? Math.round((d.prod / d.total) * 1000) / 10 : 0,
          total: d.total,
          prod: d.prod,
          cumulative: cumPct,
        };
      });

    // Final cumulative point equals the overall dataset leakage.
    const overallPct = monthly.length ? monthly[monthly.length - 1].cumulative : 0;

    return { data: monthly, overall: overallPct };
  }, [rows]);

  if (data.length === 0) {
    return (
      <Card className={`border-border/60 bg-[var(--gradient-surface)] ${compact ? "p-5" : "p-8"} text-center shadow-[var(--shadow-card)]`}>
        <h3 className="font-display text-base font-semibold">Leakage Rate — Monthly Trend</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload a Jira CSV on the Dashboard to populate this chart.
        </p>
      </Card>
    );
  }

  // Status used both to tint the top accent stripe and colour the KPI footer.
  const onTarget = overall <= targetPct;
  const statusColor = onTarget ? CHART.success : CHART.alert;

  return (
    <Card
      className={`relative overflow-hidden border-border/60 bg-[var(--gradient-surface)] ${
        compact ? "p-5" : "p-6"
      } shadow-[var(--shadow-card)] ${compact ? "transition-transform hover:-translate-y-0.5" : ""}`}
    >
      {/* Top accent stripe in compact mode — matches the metric cards so the
          chart tile reads as one of the KPI family rather than a standalone. */}
      {compact && (
        <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: statusColor }} />
      )}

      {compact ? (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Leakage Rate
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground/80">
              Monthly trend · target {targetPct}%
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="flex items-baseline justify-end gap-1">
                <span className="font-display text-3xl font-semibold tracking-tight">
                  {overall}
                </span>
                <span className="font-mono text-xs text-muted-foreground">%</span>
              </div>
              <p
                className="font-mono text-[10px] uppercase tracking-[0.15em]"
                style={{ color: statusColor }}
              >
                {onTarget ? "On target" : `${(overall - targetPct).toFixed(1)}pp over`}
              </p>
            </div>
            <Maximize2 className="h-4 w-4 text-muted-foreground/50" />
          </div>
        </div>
      ) : (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-semibold">Leakage Rate — Monthly Trend</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Bars: each month's leakage %. Line: overall rate to date (ends at {overall}%). Dashed: {targetPct}% target.
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
      )}
      <div className={compact ? "h-32" : "h-96"}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" {...axis} tickFormatter={formatMonthLabel} />
            <YAxis {...axis} unit="%" />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={tooltipLabelStyle}
              itemStyle={tooltipItemStyle}
              cursor={{ fill: CHART.cursor }}
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
            {!compact && (
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                iconType="square"
              />
            )}
            <ReferenceLine
              y={targetPct}
              stroke={COLOR_TARGET}
              strokeDasharray="6 4"
              strokeWidth={1.5}
              ifOverflow="extendDomain"
              label={
                compact
                  ? undefined
                  : {
                      value: `Target ${targetPct}%`,
                      position: "insideTopRight",
                      fill: COLOR_TARGET,
                      fontSize: 11,
                      fontFamily: "JetBrains Mono, monospace",
                    }
              }
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
              dataKey="cumulative"
              name="Overall to date"
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
