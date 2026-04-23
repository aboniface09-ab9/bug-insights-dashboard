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
  reporter: string;
  assignee: string;
  component: string;
  status: string;
}

const parseDate = (s: string): Date | null => {
  if (!s || !s.trim()) return null;
  const t = s.trim();
  // DD/MMM/YY H:MM (Jira format, e.g. "27/Feb/26 1:29 PM")
  const jira = t.match(
    /^(\d{1,2})\/([A-Za-z]{3})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?:\s*(AM|PM))?)?$/,
  );
  if (jira) {
    const [, d, monStr, y, h = "0", mi = "0", ampm] = jira;
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const mo = months.findIndex((m) => m.toLowerCase() === monStr.toLowerCase());
    if (mo >= 0) {
      let yr = parseInt(y);
      if (yr < 100) yr += 2000;
      let hr = parseInt(h);
      if (ampm) {
        const isPm = ampm.toUpperCase() === "PM";
        if (isPm && hr < 12) hr += 12;
        if (!isPm && hr === 12) hr = 0;
      }
      return new Date(yr, mo, parseInt(d), hr, parseInt(mi));
    }
  }
  // M/D/YY H:MM
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (m) {
    const [, mo, d, y, h = "0", mi = "0"] = m;
    let yr = parseInt(y);
    if (yr < 100) yr += 2000;
    return new Date(yr, parseInt(mo) - 1, parseInt(d), parseInt(h), parseInt(mi));
  }
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : d;
};

// Map a raw cell value to one of our Severity buckets.
// Accepts P1/P2/P3 directly, or Jira Priority values (Highest/High/Medium/Low/Lowest).
// Bucketing:
//   P1 = Highest / Critical / Blocker
//   P2 = High
//   P3 = Medium / Normal / Low / Lowest / Trivial / Minor
const toSeverity = (raw: string | undefined): Severity => {
  const v = (raw || "").trim().toUpperCase();
  if (v === "P1" || v === "P2" || v === "P3") return v;
  if (v === "HIGHEST" || v === "CRITICAL" || v === "BLOCKER") return "P1";
  if (v === "HIGH") return "P2";
  if (v === "MEDIUM" || v === "NORMAL") return "P3";
  if (v === "LOW" || v === "LOWEST" || v === "TRIVIAL" || v === "MINOR") return "P3";
  return "P3";
};

const toEnvironment = (raw: string | undefined): Environment => {
  const v = (raw || "").trim().toUpperCase();
  if (v === "DEV" || v === "SIT" || v === "UAT" || v === "PROD") return v;
  if (v === "PRODUCTION") return "PROD";
  if (v === "STAGING" || v === "STAGE") return "UAT";
  if (v === "DEVELOPMENT") return "DEV";
  return "PROD";
};

// Find the first non-empty value for any of the candidate header names.
// Jira CSVs often duplicate headers (e.g. multiple "Components" columns) — Papa
// will only keep one, but we still try aliases in priority order.
const pick = (row: Record<string, string>, keys: string[]): string => {
  for (const k of keys) {
    const v = row[k];
    if (v && v.trim()) return v.trim();
  }
  return "";
};

// Collect ALL values across duplicate column names (e.g. multiple "Components").
// Papa.parse with header:true overwrites duplicates, so we instead read the raw
// header row and collect all matching column indices ourselves.
const collectMulti = (
  headers: string[],
  rawRow: string[],
  keys: string[],
): string[] => {
  const out: string[] = [];
  headers.forEach((h, i) => {
    if (keys.includes(h.trim())) {
      const v = rawRow[i]?.trim();
      if (v) out.push(v);
    }
  });
  return out;
};

export const parseCsv = (text: string): BugRow[] => {
  // First parse without headers so we can handle duplicate column names (Jira's
  // "Components,Components,Components,..." pattern).
  const raw = Papa.parse<string[]>(text, { skipEmptyLines: true });
  const all = raw.data;
  if (!all.length) return [];
  const headers = (all[0] || []).map((h) => (h || "").replace(/^\uFEFF/, "").trim());
  const dataRows = all.slice(1);

  const idx = (names: string[]) => {
    for (const n of names) {
      const i = headers.indexOf(n);
      if (i >= 0) return i;
    }
    return -1;
  };

  const iTicket = idx(["Ticket ID", "Issue key", "Issue Key", "Key"]);
  const iSystem = idx(["System", "Project key", "Project Key"]);
  const iSeverity = idx(["Severity", "Priority"]);
  const iEnv = idx(["TJ Environment", "Custom field (TJ Environment)", "Environment"]);
  const iCreated = idx(["Created"]);
  const iResolved = idx(["Resolved", "Resolution Date"]);
  const iMonth = idx(["Month"]);
  const iMttr = idx(["MTTR"]);
  const iReporter = idx(["Reporter", "Creator"]);
  const iAssignee = idx(["Assignee"]);
  const iStatus = idx(["Status"]);

  return dataRows
    .map((cells): BugRow | null => {
      const get = (i: number) => (i >= 0 ? (cells[i] || "").trim() : "");
      const rowObj: Record<string, string> = {};
      headers.forEach((h, i) => {
        if (h && !(h in rowObj)) rowObj[h] = (cells[i] || "").trim();
      });

      const ticketId = get(iTicket);
      if (!ticketId) return null;
      const created = parseDate(get(iCreated));
      if (!created) return null;
      const resolved = parseDate(get(iResolved));
      const system =
        get(iSystem) || ticketId.split("-")[0]?.toUpperCase() || "UNKNOWN";
      const severity = toSeverity(get(iSeverity));
      const environment = toEnvironment(get(iEnv));
      const month =
        get(iMonth) ||
        `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`;

      const mttrRaw = get(iMttr);
      let mttr: number | null = mttrRaw ? Number(mttrRaw) : null;
      if ((mttr === null || isNaN(mttr)) && resolved) {
        mttr = (resolved.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      }

      const reporter = get(iReporter) || "Unknown";
      const assignee = get(iAssignee) || "Unassigned";
      const status = get(iStatus);

      const components = collectMulti(headers, cells, ["Components", "Component"]);
      const component = components[0] || pick(rowObj, ["Component"]) || "Unspecified";

      return {
        ticketId,
        system,
        severity,
        created,
        resolved,
        month,
        environment,
        mttr: mttr !== null && !isNaN(mttr) ? mttr : null,
        reporter,
        assignee,
        component,
        status,
      };
    })
    .filter((r): r is BugRow => r !== null);
};

export interface Filters {
  systems: string[];
  severities: Severity[];
  months: string[];
  environments: Environment[];
  reporters: string[];
  components: string[];
}

export const applyFilters = (rows: BugRow[], f: Filters): BugRow[] =>
  rows.filter(
    (r) =>
      (f.systems.length === 0 || f.systems.includes(r.system)) &&
      (f.severities.length === 0 || f.severities.includes(r.severity)) &&
      (f.months.length === 0 || f.months.includes(r.month)) &&
      (f.environments.length === 0 || f.environments.includes(r.environment)) &&
      (f.reporters.length === 0 || f.reporters.includes(r.reporter)) &&
      (f.components.length === 0 || f.components.includes(r.component)),
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
