/**
 * Brand-aligned chart palette. Single source of truth for every chart in the
 * app — if you need to retweak a shade, do it here and both the Dashboard and
 * Executive charts pick it up.
 *
 * Brand values are the hex codes from the TJ brand guide, mapped to semantic
 * roles so chart code reads in plain English ("alert", "target", "accent")
 * rather than raw hex.
 */
export const CHART = {
  // ──────────────────────────────────────────────────────────────────────
  // Canvas chrome: axes, grid, tooltips. Kept deliberately understated so
  // the data series pop against the dark card background.
  // ──────────────────────────────────────────────────────────────────────
  // Axis lines + tick labels. Lifted from #64646e to #a0a0ab so labels stay
  // grey but actually read against the dark surface.
  axis: "#a0a0ab", // LIGHT GREY — axis lines + ticks
  grid: "rgba(200, 200, 210, 0.15)", // LIGHT GREY at ~15% — subtle
  cursor: "rgba(200, 200, 210, 0.08)", // bar hover highlight
  tooltip: {
    bg: "oklch(0.22 0.035 254)", // existing dark card tone
    border: "#64646e",
    label: "#ffffff",
    item: "#c8c8d2",
  },

  // ──────────────────────────────────────────────────────────────────────
  // Semantic roles. Use these names in chart code, not raw hex, so a palette
  // swap is painless.
  // ──────────────────────────────────────────────────────────────────────
  primary: "#0082d9", // DARK CYAN  — default bars / primary data series
  accent: "#00C1FF", // CYAN       — accent lines, highlight moments
  deep: "#034ea2", // BLUE       — tertiary / secondary data
  alert: "#ee236b", // PINK       — over-target, PROD leaks, P1 critical
  success: "#53c0a3", // TEAL       — target reference, DEV (caught early)
  neutral: "#c8c8d2", // LIGHT GREY — inactive / placeholder

  // ──────────────────────────────────────────────────────────────────────
  // Category palettes. These reuse the semantic roles so two charts showing
  // "P1" or "PROD" always draw it in the same colour.
  // ──────────────────────────────────────────────────────────────────────
  severity: {
    P1: "#ee236b", // PINK — critical
    P2: "#0082d9", // DARK CYAN — major
    P3: "#034ea2", // BLUE — minor
  },
  environment: {
    DEV: "#53c0a3", // TEAL — caught early (ideal)
    SIT: "#00C1FF", // CYAN
    UAT: "#0082d9", // DARK CYAN
    PROD: "#ee236b", // PINK — leaked to production
  },

  // ──────────────────────────────────────────────────────────────────────
  // Free-form category palette. Use for charts where the bars / segments
  // represent open-ended buckets (component names, reporter names, etc.).
  // Colours are picked from the brand palette + brand-adjacent extensions
  // so every bar still reads as TJ.
  // ──────────────────────────────────────────────────────────────────────
  categories: [
    "#0082d9", // dark cyan
    "#00C1FF", // bright cyan
    "#034ea2", // deep blue
    "#53c0a3", // teal
    "#ee236b", // pink
    "#7c5fe6", // brand-adjacent indigo
    "#f5a623", // amber accent
    "#3aa6a0", // muted teal
  ] as const,
} as const;

/**
 * Deterministic name → category colour. The same input always returns the
 * same colour, so a given component (or reporter) reads in one shade across
 * every chart that uses this helper.
 */
export function colorForCategory(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    // FNV-ish: enough uniformity for a small palette, no need for crypto.
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return CHART.categories[hash % CHART.categories.length];
}
