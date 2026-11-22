import type { ActiveJob } from "@/lib/printer/types";
import { filamentGrams, formatDuration, formatFilamentLength, formatFinishTime, formatGrams, formatPercent } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { PrinterIcon } from "@/components/ui/icons";
import { Thumbnail } from "./Thumbnail";

const STATE_LABEL: Record<ActiveJob["state"], { label: string; tone: BadgeTone }> = {
  printing: { label: "Printer", tone: "accent" },
  paused: { label: "Pause", tone: "warn" },
  complete: { label: "Ferdig!", tone: "ok" },
  cancelled: { label: "Avbrutt", tone: "muted" },
  error: { label: "Feil", tone: "bad" },
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-2/70 px-3 py-2.5">
      <div className="text-xs text-muted">{label}</div>
      <div className="tabular mt-0.5 font-medium">{value}</div>
    </div>
  );
}

export function ActivePrintCard({ job }: { job: ActiveJob }) {
  const state = STATE_LABEL[job.state];
  // Klipper reports "printing" while it heats up before the first layer.
  const preparing = job.state === "printing" && job.printDuration === 0;
  const tone = job.state === "complete" ? "ok" : job.state === "error" ? "bad" : job.state === "paused" ? "warn" : "accent";

  const filament =
    job.filamentTotal != null
      ? `${formatFilamentLength(job.filamentUsed).replace(" m", "")} / ${formatFilamentLength(job.filamentTotal)}`
      : formatFilamentLength(job.filamentUsed);
  const grams = formatGrams(job.filamentWeight ?? filamentGrams(job.filamentTotal ?? job.filamentUsed));

  return (
    <Card title="Aktiv utskrift" icon={<PrinterIcon />} action={<Badge tone={state.tone} pulse={job.state === "printing"}>{preparing ? "Varmer opp" : state.label}</Badge>}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Thumbnail src={job.thumbnailUrl} alt={job.displayName} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-2xl font-semibold" title={job.filename}>
            {job.displayName}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {preparing
              ? "Printeren varmer opp og gjør seg klar…"
              : job.state === "complete"
                ? `Ferdig etter ${formatDuration(job.totalDuration)}. Husk å la den kjøle seg ned før du tar den av platen.`
                : job.state === "paused"
                  ? "Utskriften er satt på pause."
                  : job.state === "cancelled"
                    ? "Utskriften ble avbrutt."
                    : job.state === "error"
                      ? job.message ?? "Noe gikk galt med utskriften."
                      : job.remaining != null
                        ? `Ferdig ${formatFinishTime(job.remaining)}`
                        : "Printer…"}
          </p>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="tabular text-4xl font-semibold">{formatPercent(job.progress)}</span>
            {job.remaining != null && job.remaining > 0 && (
              <span className="text-sm text-muted">
                <span className="tabular font-medium text-text">{formatDuration(job.remaining)}</span> igjen
              </span>
            )}
          </div>
          <div className="mt-2">
            <ProgressBar value={job.progress} size="lg" tone={tone} label="Fremdrift" />
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Tid brukt" value={formatDuration(job.totalDuration)} />
        <Stat label="Tid igjen" value={job.remaining != null ? formatDuration(job.remaining) : "–"} />
        <Stat label="Lag" value={job.currentLayer != null && job.totalLayers ? `${job.currentLayer} / ${job.totalLayers}` : job.totalLayers ? `${job.totalLayers} totalt` : "–"} />
        <Stat label={`Filament (≈${grams})`} value={filament} />
      </div>
    </Card>
  );
}
