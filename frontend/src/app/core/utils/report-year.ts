export const CURRENT_REPORT_YEAR = new Date().getFullYear();

export const REPORT_YEAR_OPTIONS = Array.from(
  { length: CURRENT_REPORT_YEAR - 1999 },
  (_, index) => CURRENT_REPORT_YEAR - index
);

export function resolveReportYear(value: string | null): number {
  const year = Number(value);

  return Number.isInteger(year) && year >= 2000 && year <= CURRENT_REPORT_YEAR
    ? year
    : CURRENT_REPORT_YEAR;
}
