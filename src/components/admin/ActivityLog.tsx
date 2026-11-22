"use client";

import { useState } from "react";
import type { ActivityEntry } from "@/lib/portal/types";
import { useApiData } from "@/hooks/useApiData";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "./AdminShell";
import { ActivityList } from "./ActivityList";

const FILTERS: { key: ActivityEntry["actor"] | null; label: string }[] = [
  { key: null, label: "Alle" },
  { key: "tobias", label: "Tobias" },
  { key: "admin", label: "Admin" },
  { key: "system", label: "System" },
];

export function ActivityLog() {
  const { data, loading } = useApiData<{ activity: ActivityEntry[] }>("/api/admin/activity", { intervalMs: 15_000 });
  const [filter, setFilter] = useState<ActivityEntry["actor"] | null>(null);
  const entries = (data?.activity ?? []).filter((e) => !filter || e.actor === filter);

  return (
    <>
      <PageHeader title="Aktivitet" description="Hvem gjorde hva, og når. De siste 300 hendelsene lagres." />
      <div className="mb-4 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${filter === f.key ? "bg-accent text-on-accent" : "bg-surface-2 text-muted hover:text-text"}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <Card>
        <ActivityList entries={entries} loading={loading} />
      </Card>
    </>
  );
}
