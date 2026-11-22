"use client";

import { useEffect, useState } from "react";
import type { ActiveJob } from "@/lib/printer/types";
import type { TobiasSettings } from "@/lib/portal/types";
import { formatDuration, formatFinishTime } from "@/lib/format";
import { apiSend, errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { PauseIcon, PlayIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";
import { Thumbnail } from "@/components/printer/Thumbnail";
import { ProgressRing } from "./ProgressRing";
import { funFacts } from "./funFacts";

const FACT_INTERVAL_MS = 12_000;

/** Large live view of the active print, designed for Tobias. */
export function PrintHero({ job, settings }: { job: ActiveJob; settings: TobiasSettings }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [factIndex, setFactIndex] = useState(0);

  const preparing = job.state === "printing" && job.printDuration === 0;
  const done = job.state === "complete";
  const facts = funFacts(job.filamentUsed, job.printDuration, job.currentLayer);

  useEffect(() => {
    const t = setInterval(() => setFactIndex((i) => i + 1), FACT_INTERVAL_MS);
    return () => clearInterval(t);
  }, []);

  const pauseOrResume = async (action: "pause" | "resume") => {
    setBusy(true);
    try {
      await apiSend("/api/tobias/pause", { action });
      toast(action === "pause" ? "Utskriften er satt på pause" : "Utskriften fortsetter!");
    } catch (err) {
      toast(errorMessage(err), "bad");
    } finally {
      setBusy(false);
    }
  };

  const ringColor =
    done ? "var(--color-ok)" : job.state === "paused" ? "var(--color-warn)" : job.state === "error" ? "var(--color-bad)" : "var(--color-accent)";

  let headline: string;
  let sub: string;
  if (done) {
    headline = "Ferdig! 🎉";
    sub = "La den kjøle seg ned et par minutter før du tar den av platen.";
  } else if (preparing) {
    headline = "Varmer opp…";
    sub = "Printeren gjør seg klar. Det tar et par minutter før den begynner.";
  } else if (job.state === "paused") {
    headline = "På pause";
    sub = "Utskriften venter på deg.";
  } else if (job.state === "cancelled") {
    headline = "Avbrutt";
    sub = "Utskriften ble stoppet.";
  } else if (job.state === "error") {
    headline = "Oi, noe gikk galt";
    sub = "Hent en voksen som kan se på printeren.";
  } else {
    headline = job.remaining != null ? `Ferdig ${formatFinishTime(job.remaining)}` : "Printer…";
    sub = job.remaining != null ? `${formatDuration(job.remaining)} igjen` : "";
  }

  return (
    <section
      className={`pop-in overflow-hidden rounded-3xl border p-6 shadow-xl sm:p-8 ${
        done ? "border-ok/30 bg-gradient-to-br from-ok/15 to-surface" : "border-line bg-surface/80"
      }`}
    >
      <div className="flex flex-col items-center gap-8 md:flex-row">
        <ProgressRing value={job.progress} color={ringColor} size={260}>
          <div className="flex flex-col items-center">
            <Thumbnail src={job.thumbnailUrl} alt={job.displayName} size="lg" />
          </div>
        </ProgressRing>

        <div className="min-w-0 flex-1 text-center md:text-left">
          <p className="text-sm font-medium uppercase tracking-wider text-muted">
            {done ? "Utskriften er klar" : "Nå printes"}
          </p>
          <h2 className="mt-1 truncate text-3xl font-bold sm:text-4xl" title={job.displayName}>
            {job.displayName}
          </h2>
          <div className="mt-4 flex items-baseline justify-center gap-4 md:justify-start">
            <span className="tabular text-6xl font-bold">{Math.floor(job.progress * 100)}%</span>
            <div className="text-left">
              <div className="text-lg font-semibold">{headline}</div>
              {sub && <div className="text-muted">{sub}</div>}
            </div>
          </div>

          {!done && job.state !== "cancelled" && job.state !== "error" && !preparing && (
            <p className="mt-6 rounded-2xl bg-surface-2/70 px-4 py-3 text-sm text-muted">
              <span className="font-medium text-text">Visste du? </span>
              {facts[factIndex % facts.length]}
            </p>
          )}

          {settings.canPause && (job.state === "printing" || job.state === "paused") && (
            <div className="mt-6">
              {job.state === "printing" ? (
                <Button size="lg" variant="secondary" icon={<PauseIcon />} loading={busy} onClick={() => pauseOrResume("pause")}>
                  Sett på pause
                </Button>
              ) : (
                <Button size="lg" variant="primary" icon={<PlayIcon />} loading={busy} onClick={() => pauseOrResume("resume")}>
                  Fortsett utskriften
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
