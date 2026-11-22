import type { ActivityEntry } from "@/lib/portal/types";
import { formatDateTime } from "@/lib/format";

const ACTOR: Record<ActivityEntry["actor"], { label: string; className: string }> = {
  tobias: { label: "Tobias", className: "bg-accent/15 text-accent" },
  admin: { label: "Admin", className: "bg-info/15 text-info" },
  system: { label: "System", className: "bg-surface-2 text-muted" },
};

export function ActivityList({ entries, loading }: { entries: ActivityEntry[]; loading?: boolean }) {
  if (loading && entries.length === 0) return <p className="py-4 text-center text-muted">Laster…</p>;
  if (entries.length === 0) return <p className="py-4 text-center text-muted">Ingen aktivitet ennå.</p>;

  return (
    <ul className="divide-y divide-line">
      {entries.map((e) => {
        const actor = ACTOR[e.actor];
        return (
          <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
            <span className={`w-16 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-medium ${actor.className}`}>{actor.label}</span>
            <span className={`font-medium ${e.action === "NØDSTOPP" ? "text-bad" : ""}`}>{e.action}</span>
            {e.detail && <span className="truncate text-muted">{e.detail}</span>}
            <span className="tabular ml-auto text-sm text-muted">{formatDateTime(e.at)}</span>
          </li>
        );
      })}
    </ul>
  );
}
