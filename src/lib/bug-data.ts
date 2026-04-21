import Papa from "papaparse";

export type Severity = "P1" | "P2" | "P3";
export type Environment = "DEV" | "SIT" | "UAT" | "PROD";

export interface BugRow {
  ticketId: string;
  system: string;
  severity: Severity;
  created: Date;
  resolved: Date | null;
  month: string; // YYYY-MM
  environment: Environment;
  mttr: number | null;
}

const parseDate = (s: string): Date | null => {
  if (!s || !s.trim()) return null;
  // Handle M/D/YY H:MM format
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (m) {
    let [, mo, d, y, h = "0", mi = "0"] = m;
    let yr = parseInt(y);
    if (yr < 100) yr += 2000;
    return new Date(yr, parseInt(mo) - 1, parseInt(d), parseInt(h), parseInt(mi));
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

export const parseCsv = (text: string): BugRow[] => {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  return result.data
    .map((r): BugRow | null => {
      const ticketId = r["Ticket ID"]?.trim();
      if (!ticketId) return null;
      const created = parseDate(r["Created"] || "");
      if (!created) return null;
      const resolved = parseDate(r["Resolved"] || "");
      const system =
        r["System"]?.trim() || ticketId.split("-")[0]?.toUpperCase() || "UNKNOWN";
      const sev = (r["Severity"]?.trim().toUpperCase() || "P3") as Severity;
      const env = (r["TJ Environment"]?.trim().toUpperCase() || "PROD") as Environment;
      // Always derive YYYY-MM from Created date for reliable chronological sorting
      const month = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`;
      const mttrRaw = r["MTTR"]?.trim();
      let mttr: number | null = mttrRaw ? Number(mttrRaw) : null;
      if (mttr === null && resolved) {
        mttr = (resolved.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      }
      return {
        ticketId,
        system,
        severity: sev,
        created,
        resolved,
        month,
        environment: env,
        mttr: mttr !== null && !isNaN(mttr) ? mttr : null,
      };
    })
    .filter((r): r is BugRow => r !== null);
};

export interface Filters {
  systems: string[];
  severities: Severity[];
  months: string[];
  environments: Environment[];
}

export const applyFilters = (rows: BugRow[], f: Filters): BugRow[] =>
  rows.filter(
    (r) =>
      (f.systems.length === 0 || f.systems.includes(r.system)) &&
      (f.severities.length === 0 || f.severities.includes(r.severity)) &&
      (f.months.length === 0 || f.months.includes(r.month)) &&
      (f.environments.length === 0 || f.environments.includes(r.environment)),
  );

export interface Metrics {
  total: number;
  prod: number;
  leakagePct: number;
  p1LeakagePct: number;
  avgMttr: number | null;
  resolvedCount: number;
}

export const computeMetrics = (rows: BugRow[]): Metrics => {
  const total = rows.length;
  const prod = rows.filter((r) => r.environment === "PROD").length;
  const p1Total = rows.filter((r) => r.severity === "P1").length;
  const p1Prod = rows.filter((r) => r.severity === "P1" && r.environment === "PROD").length;
  const mttrs = rows.map((r) => r.mttr).filter((m): m is number => m !== null);
  return {
    total,
    prod,
    leakagePct: total ? (prod / total) * 100 : 0,
    p1LeakagePct: p1Total ? (p1Prod / p1Total) * 100 : 0,
    avgMttr: mttrs.length ? mttrs.reduce((a, b) => a + b, 0) / mttrs.length : null,
    resolvedCount: mttrs.length,
  };
};
