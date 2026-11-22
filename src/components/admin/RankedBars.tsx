/** Horizontal ranked list with bars – for breakdowns (status, filament, models). */

export interface RankedItem {
  key: string;
  label: string;
  value: number;
  display: string;
  /** Optional swatch (e.g. the actual filament color) */
  swatch?: string | null;
}

export function RankedBars({ items, empty = "Ingen data i perioden." }: { items: RankedItem[]; empty?: string }) {
  if (items.length === 0) return <p className="py-4 text-center text-muted">{empty}</p>;
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.key}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              {item.swatch !== undefined && (
                <span
                  className="size-3 shrink-0 rounded-full ring-1 ring-line"
                  style={{ background: item.swatch ?? "transparent" }}
                  title={item.swatch ?? "Ukjent farge"}
                />
              )}
              <span className="truncate">{item.label}</span>
            </span>
            <span className="tabular shrink-0 text-muted">{item.display}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
