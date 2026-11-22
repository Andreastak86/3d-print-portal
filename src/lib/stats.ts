/**
 * Statistics computed from print history. Pure functions – used both by the
 * statistics page (browser) and the CSV export (server).
 */
import type { HistoryJob } from "@/lib/printer/types";
import type { CostSettings } from "@/lib/portal/types";
import { filamentGrams } from "@/lib/format";

// ---------------------------------------------------------------- periods

export type PeriodKey = "7d" | "30d" | "90d" | "year" | "all";

export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "7d", label: "7 dager" },
  { key: "30d", label: "30 dager" },
  { key: "90d", label: "90 dager" },
  { key: "year", label: "I år" },
  { key: "all", label: "Alt" },
];

export function isPeriodKey(value: unknown): value is PeriodKey {
  return PERIODS.some((p) => p.key === value);
}

/** Start of the period (epoch ms), or null for "all". */
export function periodStart(period: PeriodKey, now = Date.now()): number | null {
  const d = new Date(now);
  switch (period) {
    case "7d":
      return now - 7 * 86_400_000;
    case "30d":
      return now - 30 * 86_400_000;
    case "90d":
      return now - 90 * 86_400_000;
    case "year":
      return new Date(d.getFullYear(), 0, 1).getTime();
    case "all":
      return null;
  }
}

export function filterByPeriod(jobs: HistoryJob[], period: PeriodKey, now = Date.now()): HistoryJob[] {
  const start = periodStart(period, now);
  return start == null ? jobs : jobs.filter((j) => j.startTime >= start);
}

// ---------------------------------------------------------------- cost

export function jobCost(job: HistoryJob, costs: CostSettings): { filament: number; power: number; total: number } {
  const filament = (filamentGrams(job.filamentUsed) / 1000) * costs.filamentPricePerKg;
  // Power for the whole job (including heating/pauses): total duration × watts.
  const power = (job.totalDuration / 3600) * (costs.printerWatts / 1000) * costs.electricityPricePerKwh;
  return { filament, power, total: filament + power };
}

// ---------------------------------------------------------------- summary

export interface Summary {
  jobs: number;
  completed: number;
  failed: number;
  /** completed / (all finished), null if none finished */
  successRate: number | null;
  /** seconds */
  printTime: number;
  /** grams */
  grams: number;
  /** mm */
  filamentMm: number;
  cost: { filament: number; power: number; total: number };
  /** grams of filament spent on prints that failed or were cancelled */
  wastedGrams: number;
  /** seconds, among completed */
  averagePrintTime: number | null;
}

const FAILED = new Set(["cancelled", "error", "klippy_shutdown", "klippy_disconnect", "server_exit", "interrupted"]);

export function summarize(jobs: HistoryJob[], costs: CostSettings): Summary {
  const finished = jobs.filter((j) => j.status !== "in_progress");
  const completed = finished.filter((j) => j.status === "completed");
  const failed = finished.filter((j) => FAILED.has(j.status));
  const cost = { filament: 0, power: 0, total: 0 };
  for (const j of jobs) {
    const c = jobCost(j, costs);
    cost.filament += c.filament;
    cost.power += c.power;
    cost.total += c.total;
  }
  const sum = (list: HistoryJob[], f: (j: HistoryJob) => number) => list.reduce((s, j) => s + f(j), 0);
  return {
    jobs: jobs.length,
    completed: completed.length,
    failed: failed.length,
    successRate: finished.length ? completed.length / finished.length : null,
    printTime: sum(jobs, (j) => j.printDuration),
    grams: sum(jobs, (j) => filamentGrams(j.filamentUsed)),
    filamentMm: sum(jobs, (j) => j.filamentUsed),
    cost,
    wastedGrams: sum(failed, (j) => filamentGrams(j.filamentUsed)),
    averagePrintTime: completed.length ? sum(completed, (j) => j.printDuration) / completed.length : null,
  };
}

// ---------------------------------------------------------------- time buckets

export interface TimeBucket {
  /** Start of the bucket (local time), epoch ms */
  start: number;
  label: string;
  jobs: number;
  grams: number;
  hours: number;
}

const MONTHS = ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"];

function startOfWeek(ms: number): Date {
  const d = new Date(ms);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
}

export function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

/**
 * Splits jobs into weeks or months, oldest first, including empty buckets.
 * Short periods (≤ 90 days) get weeks, longer ones months.
 */
export function timeBuckets(jobs: HistoryJob[], period: PeriodKey, now = Date.now()): { unit: "week" | "month"; buckets: TimeBucket[] } {
  const earliest = periodStart(period, now) ?? Math.min(now, ...jobs.map((j) => j.startTime));
  const unit = period === "7d" || period === "30d" || period === "90d" ? "week" : "month";
  const buckets: TimeBucket[] = [];

  if (unit === "week") {
    for (let w = startOfWeek(earliest); w.getTime() <= now; w = new Date(w.getFullYear(), w.getMonth(), w.getDate() + 7)) {
      buckets.push({ start: w.getTime(), label: `Uke ${isoWeek(w)}`, jobs: 0, grams: 0, hours: 0 });
    }
  } else {
    const first = new Date(earliest);
    for (let m = new Date(first.getFullYear(), first.getMonth(), 1); m.getTime() <= now; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
      buckets.push({ start: m.getTime(), label: `${MONTHS[m.getMonth()]} ${String(m.getFullYear()).slice(2)}`, jobs: 0, grams: 0, hours: 0 });
    }
  }

  for (const job of jobs) {
    // Find the last bucket that starts on or before the job.
    let bucket: TimeBucket | undefined;
    for (const b of buckets) {
      if (b.start <= job.startTime) bucket = b;
      else break;
    }
    if (!bucket || job.startTime < earliest) continue;
    bucket.jobs += 1;
    bucket.grams += filamentGrams(job.filamentUsed);
    bucket.hours += job.printDuration / 3600;
  }
  return { unit, buckets };
}

// ---------------------------------------------------------------- breakdowns

export interface Breakdown {
  key: string;
  label: string;
  count: number;
  grams: number;
  color?: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  completed: "Fullført",
  cancelled: "Avbrutt",
  error: "Feil",
  in_progress: "Pågår",
};

export function byStatus(jobs: HistoryJob[]): Breakdown[] {
  const map = new Map<string, Breakdown>();
  for (const j of jobs) {
    const key = STATUS_LABEL[j.status] ? j.status : "other";
    const entry = map.get(key) ?? { key, label: STATUS_LABEL[key] ?? "Stoppet", count: 0, grams: 0 };
    entry.count += 1;
    entry.grams += filamentGrams(j.filamentUsed);
    map.set(key, entry);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

/** Number of prints started per hour of the day (0–23). */
export function byHour(jobs: HistoryJob[]): number[] {
  const hours = new Array<number>(24).fill(0);
  for (const j of jobs) hours[new Date(j.startTime).getHours()] += 1;
  return hours;
}

/** Number of prints per weekday, Monday first. */
export function byWeekday(jobs: HistoryJob[]): number[] {
  const days = new Array<number>(7).fill(0);
  for (const j of jobs) days[(new Date(j.startTime).getDay() + 6) % 7] += 1;
  return days;
}

/** Filament per type + color (from the G-code metadata). */
export function byFilament(jobs: HistoryJob[]): Breakdown[] {
  const map = new Map<string, Breakdown>();
  for (const j of jobs) {
    const type = j.filamentType ?? "Ukjent";
    const color = j.filamentColor?.toUpperCase() ?? null;
    const key = `${type}|${color ?? ""}`;
    const entry = map.get(key) ?? { key, label: type, count: 0, grams: 0, color };
    entry.count += 1;
    entry.grams += filamentGrams(j.filamentUsed);
    map.set(key, entry);
  }
  return [...map.values()].sort((a, b) => b.grams - a.grams);
}

/** The most printed models (completed only). */
export function topModels(jobs: HistoryJob[], top = 8): { name: string; count: number; grams: number }[] {
  const map = new Map<string, { name: string; count: number; grams: number }>();
  for (const j of jobs) {
    if (j.status !== "completed") continue;
    const entry = map.get(j.displayName) ?? { name: j.displayName, count: 0, grams: 0 };
    entry.count += 1;
    entry.grams += filamentGrams(j.filamentUsed);
    map.set(j.displayName, entry);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.grams - a.grams || a.name.localeCompare(b.name, "nb")).slice(0, top);
}

/** Monthly summary for CSV export, oldest first. */
export function monthlySummary(jobs: HistoryJob[], costs: CostSettings) {
  const map = new Map<string, HistoryJob[]>();
  for (const j of jobs) {
    const d = new Date(j.startTime);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, [...(map.get(key) ?? []), j]);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, list]) => ({ month, ...summarize(list, costs) }));
}
