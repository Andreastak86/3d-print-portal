"use client";

import { useState } from "react";
import type { HistoryJob } from "@/lib/printer/types";
import type { CostSettings } from "@/lib/portal/types";
import { useApiData } from "@/hooks/useApiData";
import { useSharedPrinter } from "@/hooks/usePrinter";
import {
  PERIODS,
  byFilament,
  byHour,
  byStatus,
  byWeekday,
  filterByPeriod,
  summarize,
  timeBuckets,
  topModels,
  type PeriodKey,
} from "@/lib/stats";
import { formatDuration, formatGrams } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { ChartIcon, ClockIcon, StarIcon } from "@/components/ui/icons";
import { HistoryList } from "@/components/printer/HistoryList";
import { PageHeader } from "./AdminShell";
import { BarChart } from "./BarChart";
import { RankedBars } from "./RankedBars";

const nb = "nb-NO";
const kr = (n: number) => `${n.toLocaleString(nb, { minimumFractionDigits: n < 100 ? 2 : 0, maximumFractionDigits: n < 100 ? 2 : 0 })} kr`;
const hours = (seconds: number) => `${(seconds / 3600).toLocaleString(nb, { maximumFractionDigits: seconds < 36_000 ? 1 : 0 })} t`;
const WEEKDAYS = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface/80 p-4 shadow-sm">
      <div className="text-sm text-muted">{label}</div>
      <div className="tabular mt-1 text-2xl font-semibold">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

function ExportLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      download
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-3 text-sm font-medium hover:border-muted/50"
    >
      ⬇ {children}
    </a>
  );
}

export function StatisticsPage() {
  const { historyVersion } = useSharedPrinter();
  const { data, error, loading } = useApiData<{ jobs: HistoryJob[]; costs: CostSettings }>("/api/admin/jobs", { refreshKey: historyVersion });
  const [period, setPeriod] = useState<PeriodKey>("30d");

  const all = data?.jobs ?? [];
  const jobs = filterByPeriod(all, period);
  const costs = data?.costs;
  const s = costs ? summarize(jobs, costs) : null;
  const { unit, buckets } = timeBuckets(jobs, period);
  const unitLabel = unit === "week" ? "uke" : "måned";
  const hourly = byHour(jobs);
  const weekday = byWeekday(jobs);

  return (
    <>
      <PageHeader
        title="Statistikk"
        description={`Basert på ${all.length} utskrifter i printerens historikk.`}
        action={
          <div className="flex flex-wrap gap-2">
            <ExportLink href={`/api/admin/export/utskrifter?period=${period}`}>Utskrifter (CSV)</ExportLink>
            <ExportLink href={`/api/admin/export/maneder?period=${period}`}>Per måned (CSV)</ExportLink>
            <ExportLink href="/api/admin/export/aktivitet">Aktivitet (CSV)</ExportLink>
          </div>
        }
      />

      {/* Period filter – one row above all the charts */}
      <div className="mb-6 flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPeriod(p.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${period === p.key ? "bg-accent text-on-accent" : "bg-surface-2 text-muted hover:text-text"}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && !data && <p className="rounded-xl bg-bad/10 p-4 text-bad">{error}</p>}
      {loading && !data && <div className="h-64 animate-pulse rounded-2xl bg-surface-2/60" />}

      {s && costs && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Kpi label="Utskrifter" value={String(s.jobs)} sub={`${s.completed} fullført · ${s.failed} mislykket`} />
            <Kpi label="Fullføringsrate" value={s.successRate == null ? "–" : `${Math.round(s.successRate * 100)} %`} />
            <Kpi label="Printetid" value={hours(s.printTime)} sub={s.averagePrintTime ? `snitt ${formatDuration(s.averagePrintTime)}` : undefined} />
            <Kpi label="Filament" value={formatGrams(s.grams)} sub={`${(s.filamentMm / 1000).toLocaleString(nb, { maximumFractionDigits: 0 })} m`} />
            <Kpi label="Kostnad (ca.)" value={kr(s.cost.total)} sub={`${kr(s.cost.filament)} plast · ${kr(s.cost.power)} strøm`} />
            <Kpi label="Bortkastet" value={formatGrams(s.wastedGrams)} sub="plast på mislykkede" />
          </div>

          <Card title={`Per ${unitLabel}`} icon={<ChartIcon />}>
            <div className="grid gap-8 md:grid-cols-2">
              <BarChart
                title={`Filament per ${unitLabel}`}
                subtitle="Gram plast (beregnet for 1,75 mm PLA)"
                data={buckets.map((b) => ({ label: b.label, value: b.grams, display: `≈${formatGrams(b.grams)} · ${b.jobs} utskrifter` }))}
                formatTick={(v) => `${Math.round(v)} g`}
              />
              <BarChart
                title={`Printetid per ${unitLabel}`}
                subtitle="Timer printeren har jobbet"
                data={buckets.map((b) => ({ label: b.label, value: b.hours, display: `${b.hours.toFixed(1).replace(".", ",")} t · ${b.jobs} utskrifter` }))}
                formatTick={(v) => `${Number.isInteger(v) ? v : v.toFixed(1).replace(".", ",")} t`}
              />
            </div>
          </Card>

          <Card title="Når printes det?" icon={<ClockIcon />}>
            <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
              <BarChart
                title="Klokkeslett"
                subtitle="Antall utskrifter startet per time"
                height="sm"
                data={hourly.map((n, h) => ({ label: `kl. ${String(h).padStart(2, "0")}`, value: n, display: `${n} utskrifter (kl. ${h}–${h + 1})` }))}
                axisLabel={(_, i) => String(i).padStart(2, "0")}
                formatTick={(v) => String(Math.round(v))}
              />
              <BarChart
                title="Ukedag"
                subtitle="Antall utskrifter"
                height="sm"
                data={weekday.map((n, i) => ({ label: WEEKDAYS[i], value: n, display: `${n} utskrifter` }))}
                axisLabel={(d) => d.label}
                formatTick={(v) => String(Math.round(v))}
              />
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card title="Utfall">
              <RankedBars
                items={byStatus(jobs).map((b) => ({ key: b.key, label: b.label, value: b.count, display: `${b.count} · ${formatGrams(b.grams)}` }))}
              />
            </Card>
            <Card title="Filament per type og farge">
              <RankedBars
                items={byFilament(jobs).map((b) => ({
                  key: b.key,
                  label: b.label,
                  value: b.grams,
                  display: `${formatGrams(b.grams)} · ${b.count} stk`,
                  swatch: b.color,
                }))}
              />
            </Card>
            <Card title="Mest printet" icon={<StarIcon />}>
              <RankedBars
                items={topModels(jobs).map((m) => ({ key: m.name, label: m.name, value: m.count, display: `×${m.count}` }))}
                empty="Ingen fullførte utskrifter i perioden."
              />
            </Card>
          </div>

          <HistoryList history={{ data: { jobs, totals: null }, error: null, loading: false }} title="Utskrifter i perioden" collapsedCount={10} />

          <p className="text-xs text-muted">
            Kostnaden er et estimat: {costs.filamentPricePerKg} kr/kg filament, {costs.printerWatts} W i snitt og {costs.electricityPricePerKwh.toString().replace(".", ",")} kr/kWh.
            Endre verdiene under Innstillinger.
          </p>
        </div>
      )}
    </>
  );
}
