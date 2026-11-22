/**
 * CSV adapted for Norwegian Excel:
 * - semicolon as separator (Excel with Norwegian settings expects it)
 * - decimal comma
 * - UTF-8 with BOM so Excel shows æøå correctly
 */

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
  /** Number of decimals for numbers (default 0 for integers, 2 otherwise) */
  decimals?: number;
}

const SEP = ";";

function formatCell(value: string | number | null | undefined, decimals?: number): string {
  if (value == null) return "";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    const d = decimals ?? (Number.isInteger(value) ? 0 : 2);
    return value.toFixed(d).replace(".", ",");
  }
  // Quote if needed; double quotes inside are escaped by doubling.
  // Also guard against "CSV injection" (cells starting with = + - @ are formulas in Excel).
  let text = value;
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines = [columns.map((c) => formatCell(c.header)).join(SEP)];
  for (const row of rows) {
    lines.push(columns.map((c) => formatCell(c.value(row), c.decimals)).join(SEP));
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/** Local date/time in a format Excel recognises: 2026-11-21 14:32 */
export function csvDateTime(epochMs: number | null): string {
  if (epochMs == null) return "";
  const d = new Date(epochMs);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
