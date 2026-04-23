// Small display-formatting helpers. Kept outside bug-data.ts so the data
// layer stays purely about parsing and transforming rows.

/**
 * Format a YYYY-MM month key as "MMM yyyy" (e.g. "2026-01" -> "Jan 2026").
 * Falls back to the original string if the input isn't recognisable.
 */
export const formatMonthLabel = (ym: string): string => {
  const m = ym?.match(/^(\d{4})-(\d{2})$/);
  if (!m) return ym ?? "";
  const year = Number(m[1]);
  const monthIdx = Number(m[2]) - 1;
  if (monthIdx < 0 || monthIdx > 11) return ym;
  const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${MONTHS[monthIdx]} ${year}`;
};
