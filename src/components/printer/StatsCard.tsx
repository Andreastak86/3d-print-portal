import type { HistoryTotals } from "@/lib/printer/types";
import { filamentGrams, formatDuration, formatFilamentLength, formatGrams } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { ChartIcon } from "@/components/ui/icons";

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5">
      <dt className="text-muted">{label}</dt>
      <dd className="tabular text-right font-medium">
        {value}
        {sub && <span className="ml-1.5 text-sm font-normal text-muted">{sub}</span>}
      </dd>
    </div>
  );
}

export function StatsCard({ totals }: { totals: HistoryTotals | null }) {
  return (
    <Card title="Statistikk" icon={<ChartIcon />}>
      {totals ? (
        <dl className="divide-y divide-line">
          <Row label="Utskrifter" value={String(totals.totalJobs)} />
          <Row label="Total printetid" value={formatDuration(totals.totalPrintTime)} />
          <Row
            label="Filament brukt"
            value={formatFilamentLength(totals.totalFilamentUsed)}
            sub={`≈${formatGrams(filamentGrams(totals.totalFilamentUsed))}`}
          />
          <Row label="Lengste utskrift" value={formatDuration(totals.longestPrint)} />
        </dl>
      ) : (
        <p className="py-4 text-center text-muted">Ingen statistikk tilgjengelig.</p>
      )}
    </Card>
  );
}
