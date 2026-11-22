"use client";

import Link from "next/link";
import type { ActivityEntry } from "@/lib/portal/types";
import { useSharedPrinter } from "@/hooks/usePrinter";
import { useApiData } from "@/hooks/useApiData";
import { Card } from "@/components/ui/Card";
import { BedIcon, FlameIcon, ListIcon, PrinterIcon } from "@/components/ui/icons";
import { ActivePrintCard } from "@/components/printer/ActivePrintCard";
import { StatusPanel } from "@/components/printer/StatusPanel";
import { TemperatureCard } from "@/components/printer/TemperatureCard";
import { ControlPanel } from "./ControlPanel";
import { PageHeader } from "./AdminShell";
import { ActivityList } from "./ActivityList";

export function AdminOverview() {
  const { snapshot, portalOnline, historyVersion } = useSharedPrinter();
  const ready = portalOnline && snapshot?.connection === "ready";
  const activity = useApiData<{ activity: ActivityEntry[] }>("/api/admin/activity", { refreshKey: historyVersion, intervalMs: 30_000 });

  return (
    <>
      <PageHeader title="Oversikt" description="Sanntidsstatus og kontroll av printeren." />

      {ready && snapshot.temperatures ? (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 [&>section]:h-full">
              {snapshot.job ? (
                <ActivePrintCard job={snapshot.job} />
              ) : (
                <Card title="Aktiv utskrift" icon={<PrinterIcon />}>
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <p className="text-xl font-semibold">Ingen aktiv utskrift</p>
                    <p className="text-muted">
                      Start en fil fra <Link href="/admin/filer" className="text-accent hover:underline">Filer</Link>, eller la Tobias
                      starte en godkjent utskrift.
                    </p>
                  </div>
                </Card>
              )}
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
              <TemperatureCard title="Dyse" icon={<FlameIcon />} temp={snapshot.temperatures.nozzle} hotThreshold={50} maxScale={260} />
              <TemperatureCard title="Plate" icon={<BedIcon />} temp={snapshot.temperatures.bed} hotThreshold={40} maxScale={100} />
            </div>
          </div>
          <ControlPanel snapshot={snapshot} />
        </div>
      ) : (
        <StatusPanel snapshot={snapshot} portalOnline={portalOnline} />
      )}

      <div className="mt-6">
        <Card
          title="Siste aktivitet"
          icon={<ListIcon />}
          action={
            <Link href="/admin/aktivitet" className="text-sm text-muted hover:text-text">
              Se alt →
            </Link>
          }
        >
          <ActivityList entries={activity.data?.activity.slice(0, 6) ?? []} loading={activity.loading} />
        </Card>
      </div>
    </>
  );
}

