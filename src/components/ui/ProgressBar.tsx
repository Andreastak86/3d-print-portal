interface ProgressBarProps {
  /** 0–1 */
  value: number;
  tone?: "accent" | "ok" | "warn" | "bad" | "info";
  size?: "sm" | "lg";
  label?: string;
}

const tones = {
  accent: "bg-accent",
  ok: "bg-ok",
  warn: "bg-warn",
  bad: "bg-bad",
  info: "bg-info",
};

export function ProgressBar({ value, tone = "accent", size = "sm", label }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value * 100));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label}
      className={`w-full overflow-hidden rounded-full bg-surface-2 ${size === "lg" ? "h-4" : "h-1.5"}`}
    >
      <div className={`h-full rounded-full transition-[width] duration-500 ease-out ${tones[tone]}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
