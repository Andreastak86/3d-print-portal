/** Norwegian formatting of time, temperature and filament. */

const nb = "nb-NO";

/** 9261 → "2 t 34 min", 512 → "8 min", 40 → "under 1 min" */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "–";
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return "under 1 min";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} t` : `${h} t ${m} min`;
}

export function formatTemp(celsius: number): string {
  return `${Math.round(celsius)}°`;
}

export function formatPercent(fraction: number): string {
  return `${Math.floor(fraction * 100)} %`;
}

/** Clock time when something finishes: "kl. 21:45", "i morgen kl. 01:10" */
export function formatFinishTime(secondsFromNow: number, now = Date.now()): string {
  const target = new Date(now + secondsFromNow * 1000);
  const time = target.toLocaleTimeString(nb, { hour: "2-digit", minute: "2-digit" });
  const dayDiff = startOfDay(target) - startOfDay(new Date(now));
  if (dayDiff === 0) return `kl. ${time}`;
  if (dayDiff === 86_400_000) return `i morgen kl. ${time}`;
  return target.toLocaleString(nb, { weekday: "short", hour: "2-digit", minute: "2-digit" });
}

/** "I dag 14:32", "I går 09:10", "18. nov. 14:32" */
export function formatDateTime(epochMs: number, now = Date.now()): string {
  const d = new Date(epochMs);
  const time = d.toLocaleTimeString(nb, { hour: "2-digit", minute: "2-digit" });
  const dayDiff = startOfDay(new Date(now)) - startOfDay(d);
  if (dayDiff === 0) return `I dag ${time}`;
  if (dayDiff === 86_400_000) return `I går ${time}`;
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  const date = d.toLocaleDateString(nb, { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) });
  return `${date} ${time}`;
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Filament length in mm → "14,5 m" */
export function formatFilamentLength(mm: number): string {
  const m = mm / 1000;
  return `${m.toLocaleString(nb, { maximumFractionDigits: m < 10 ? 1 : 0 })} m`;
}

/**
 * Estimated weight for 1.75 mm PLA (density 1.24 g/cm³).
 * Approximation – other materials differ somewhat.
 */
export function filamentGrams(mm: number): number {
  const radius = 1.75 / 2;
  const volumeMm3 = Math.PI * radius * radius * mm;
  return (volumeMm3 / 1000) * 1.24;
}

export function formatGrams(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toLocaleString(nb, { maximumFractionDigits: 2 })} kg`;
  return `${Math.round(grams)} g`;
}
