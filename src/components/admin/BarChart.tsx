/**
 * Simple bar chart (one series) in HTML/CSS – responsive without measuring.
 * One series = one color, no legend (the title says what is shown).
 * Hover shows the value; a hidden table provides the same data to screen readers.
 */

export interface BarDatum {
  label: string;
  value: number;
  display: string;
}

interface BarChartProps {
  title: string;
  subtitle?: string;
  data: BarDatum[];
  formatTick: (value: number) => string;
  /** Short label under the bars (defaults to label) */
  axisLabel?: (d: BarDatum, index: number) => string;
  height?: "sm" | "md";
}

function niceMax(max: number): number {
  if (max <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (step * pow >= max) return step * pow;
  }
  return 10 * pow;
}

export function BarChart({ title, subtitle, data, formatTick, axisLabel, height = "md" }: BarChartProps) {
  const h = height === "sm" ? "h-28" : "h-40";
  // Show at most ~8 axis labels; always include the last one.
  const step = Math.max(1, Math.ceil(data.length / 8));
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const ticks = [max, max / 2, 0];

  return (
    <figure>
      <figcaption className="mb-4">
        <div className="font-medium">{title}</div>
        {subtitle && <div className="text-sm text-muted">{subtitle}</div>}
      </figcaption>

      <div className="flex gap-2">
        {/* Y axis */}
        <div className={`tabular flex ${h} flex-col justify-between text-right text-xs text-muted`}>
          {ticks.map((t) => (
            <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
              {formatTick(t)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className={`relative ${h}`}>
            {/* Recessive gridlines */}
            {ticks.map((t) => (
              <div key={t} className="absolute inset-x-0 border-t border-line/60" style={{ bottom: `${(t / max) * 100}%` }} />
            ))}
            <div className="absolute inset-0 flex items-end gap-0.5">
              {data.map((d) => (
                <div key={d.label} className="group relative flex h-full flex-1 items-end justify-center">
                  <div
                    className="w-full max-w-8 rounded-t-[4px] bg-accent transition group-hover:brightness-125"
                    style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 2 : 0 }}
                  />
                  {/* Hover tooltip – the whole column is the hit target */}
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-xs whitespace-nowrap shadow-xl group-hover:block">
                    <div className="text-muted">{d.label}</div>
                    <div className="tabular font-medium text-text">{d.display}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* X axis: show every other label so they don't collide */}
          <div className="mt-2 flex gap-0.5 text-[11px] text-muted">
            {data.map((d, i) => (
              <span key={d.label} className="flex-1 overflow-visible text-center whitespace-nowrap">
                {(data.length - 1 - i) % step === 0 ? (axisLabel ? axisLabel(d, i) : d.label.replace(/^Uke /, "")) : ""}
              </span>
            ))}
          </div>
        </div>
      </div>

      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{d.display}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
