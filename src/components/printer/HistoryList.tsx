"use client";

import { useState } from "react";
import type { HistoryJob, HistoryStatus } from "@/lib/printer/types";
import type { HistoryState } from "@/hooks/useHistory";
import { filamentGrams, formatDateTime, formatDuration, formatGrams } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { HistoryIcon } from "@/components/ui/icons";
import { Thumbnail } from "./Thumbnail";


function statusInfo(status: HistoryStatus): { label: string; tone: BadgeTone } {
  switch (status) {
    case "completed":
      return { label: "Ferdig", tone: "ok" };
    case "in_progress":
      return { label: "Pågår", tone: "accent" };
    case "cancelled":
      return { label: "Avbrutt", tone: "muted" };
    case "error":
      return { label: "Feil", tone: "bad" };
    default:
      // klippy_shutdown, server_exit, interrupted, …
      return { label: "Stoppet", tone: "warn" };
  }
}

function HistoryRow({ job }: { job: HistoryJob }) {
  const status = statusInfo(job.status);
  return (
    <li className="flex items-center gap-3 py-3">
      <Thumbnail src={job.thumbnailUrl} alt={job.displayName} size="sm" color={job.filamentColor} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium" title={job.filename}>
          {job.displayName}
        </div>
        <div className="tabular mt-0.5 flex flex-wrap gap-x-3 text-sm text-muted">
          <span>{formatDateTime(job.startTime)}</span>
          {job.status !== "in_progress" && <span>{formatDuration(job.printDuration)}</span>}
          {job.filamentUsed > 0 && <span>≈{formatGrams(filamentGrams(job.filamentUsed))}</span>}
        </div>
      </div>
      <Badge tone={status.tone}>{status.label}</Badge>
    </li>
  );
}

interface HistoryListProps {
  history: HistoryState;
  title?: string;
  collapsedCount?: number;
}

export function HistoryList({ history, title = "Tidligere utskrifter", collapsedCount = 8 }: HistoryListProps) {
  const [expanded, setExpanded] = useState(false);
  const jobs = history.data?.jobs ?? [];
  const visible = expanded ? jobs : jobs.slice(0, collapsedCount);

  return (
    <Card
      title={title}
      icon={<HistoryIcon />}
      action={history.error && jobs.length > 0 ? <span className="text-xs text-warn">Viser sist hentede data</span> : null}
    >
      {history.loading && jobs.length === 0 ? (
        <ul className="divide-y divide-line">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="flex items-center gap-3 py-3">
              <div className="size-12 animate-pulse rounded-xl bg-surface-2" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/2 animate-pulse rounded bg-surface-2" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-surface-2" />
              </div>
            </li>
          ))}
        </ul>
      ) : jobs.length === 0 ? (
        <p className="py-6 text-center text-muted">
          {history.error ? "Historikken er ikke tilgjengelig mens printeren er frakoblet." : "Ingen utskrifter ennå."}
        </p>
      ) : (
        <>
          <ul className="divide-y divide-line">
            {visible.map((job) => (
              <HistoryRow key={job.id} job={job} />
            ))}
          </ul>
          {jobs.length > collapsedCount && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="mt-2 w-full rounded-xl py-2 text-sm font-medium text-muted transition hover:bg-surface-2 hover:text-text"
            >
              {expanded ? "Vis færre" : `Vis alle (${jobs.length})`}
            </button>
          )}
        </>
      )}
    </Card>
  );
}
