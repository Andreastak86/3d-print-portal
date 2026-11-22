"use client";

import type { LogFile, SystemInfo } from "@/lib/portal/types";
import { useApiData } from "@/hooks/useApiData";
import { formatDateTime } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CpuIcon, FolderIcon, ListIcon } from "@/components/ui/icons";
import { PageHeader } from "./AdminShell";

function bytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1).replace(".", ",")} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1).replace(".", ",")} MB`;
  return `${Math.round(n / 1024)} kB`;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-muted">{label}</dt>
      <dd className="tabular text-right font-medium">{children}</dd>
    </div>
  );
}

export function SystemInfoView() {
  const { data, error, loading } = useApiData<{ info: SystemInfo; logs: LogFile[] }>("/api/admin/system", { intervalMs: 10_000 });
  const info = data?.info;

  return (
    <>
      <PageHeader title="System" description="Informasjon om printerens datamaskin, Klipper og Moonraker." />
      {error && !data && <p className="rounded-xl bg-bad/10 p-4 text-bad">{error}</p>}
      {loading && !data && <p className="text-muted">Henter systeminformasjon…</p>}

      {info && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Printer-PC" icon={<CpuIcon />}>
            <dl className="divide-y divide-line">
              <Row label="Vertsnavn">{info.hostname ?? "–"}</Row>
              <Row label="Operativsystem">{info.distribution ?? "–"}</Row>
              <Row label="Prosessor">{info.cpu ?? "–"}</Row>
              <Row label="CPU-temperatur">
                <span className={info.cpuTemp != null && info.cpuTemp > 70 ? "text-warn" : ""}>{info.cpuTemp != null ? `${info.cpuTemp.toFixed(1).replace(".", ",")} °C` : "–"}</span>
              </Row>
              <Row label="CPU-bruk">{info.cpuUsage != null ? `${Math.round(info.cpuUsage)} %` : "–"}</Row>
            </dl>
            {info.memoryTotal != null && info.memoryUsed != null && (
              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-muted">Minne</span>
                  <span className="tabular">
                    {bytes(info.memoryUsed * 1024)} av {bytes(info.memoryTotal * 1024)}
                  </span>
                </div>
                <ProgressBar value={info.memoryUsed / info.memoryTotal} tone="info" label="Minnebruk" />
              </div>
            )}
          </Card>

          <Card title="Programvare og lagring" icon={<FolderIcon />}>
            <dl className="divide-y divide-line">
              <Row label="Klipper-status">
                <span className={info.klippyState === "ready" ? "text-ok" : "text-warn"}>{info.klippyState}</span>
              </Row>
              <Row label="Moonraker">{info.moonrakerVersion === "?" ? "ukjent versjon (Elegoo)" : info.moonrakerVersion}</Row>
              <Row label="API-versjon">{info.apiVersion}</Row>
            </dl>
            {info.disk && (
              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-muted">Lagring (gcodes)</span>
                  <span className="tabular">
                    {bytes(info.disk.free)} ledig av {bytes(info.disk.total)}
                  </span>
                </div>
                <ProgressBar value={info.disk.used / info.disk.total} tone={info.disk.free / info.disk.total < 0.1 ? "warn" : "info"} label="Diskbruk" />
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {info.components.map((c) => (
                <span key={c} className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-xs text-muted">
                  {c}
                </span>
              ))}
            </div>
          </Card>

          <Card title="Logger" icon={<ListIcon />} className="lg:col-span-2">
            <p className="mb-3 text-sm text-muted">Last ned logger for feilsøking. klippy.log er den viktigste hvis printeren stopper med en feil.</p>
            <ul className="divide-y divide-line">
              {data.logs.map((log) => (
                <li key={log.name} className="flex flex-wrap items-center gap-3 py-2.5">
                  <span className="flex-1 font-mono text-sm">{log.name}</span>
                  <span className="tabular text-sm text-muted">{bytes(log.size)}</span>
                  <span className="tabular text-sm text-muted">{formatDateTime(log.modified)}</span>
                  <a
                    href={`/api/admin/logs/${encodeURIComponent(log.name)}`}
                    download
                    className="rounded-lg border border-line bg-surface-2 px-3 py-1 text-sm hover:border-muted/50"
                  >
                    Last ned
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}
