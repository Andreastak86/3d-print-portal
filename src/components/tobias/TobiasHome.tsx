"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { LibraryItem, TobiasView } from "@/lib/portal/types";
import { canTobiasStart } from "@/lib/portal/policy";
import { apiGet, apiSend } from "@/lib/api";
import { usePrinter } from "@/hooks/usePrinter";
import { useHistory } from "@/hooks/useHistory";
import { useToast } from "@/components/ui/Toast";
import { GearIcon, ShieldIcon } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LightButtons } from "@/components/printer/LightButtons";
import { ConnectionBadge } from "@/components/printer/ConnectionBadge";
import { StatusPanel } from "@/components/printer/StatusPanel";
import { HistoryList } from "@/components/printer/HistoryList";
import { Confetti } from "./Confetti";
import { LibraryGrid } from "./LibraryGrid";
import { PrintHero } from "./PrintHero";
import { StartDialog } from "./StartDialog";
import { UploadBox } from "./UploadBox";

const VIEW_REFRESH_MS = 60_000;

function greeting(hour: number): string {
  if (hour < 10) return "God morgen";
  if (hour < 17) return "Hei";
  return "God kveld";
}

export function TobiasHome() {
  const toast = useToast();
  const { snapshot, portalOnline, historyVersion } = usePrinter();
  const ready = portalOnline && snapshot?.connection === "ready";
  const history = useHistory(`${historyVersion}-${ready}`, snapshot !== null, 10);

  const [view, setView] = useState<TobiasView | null>(null);
  const [selected, setSelected] = useState<LibraryItem | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [viewVersion, setViewVersion] = useState(0);
  /** After an upload: open the start dialog for this item as soon as the list has it. */
  const openAfterLoad = useRef<string | null>(null);

  // Library + settings: refetch when history changes (times printed), after uploads and periodically.
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const next = await apiGet<TobiasView>("/api/tobias", controller.signal);
        setView(next);
        if (openAfterLoad.current) {
          const item = next.library.find((i) => i.id === openAfterLoad.current);
          if (item) setSelected(item);
          openAfterLoad.current = null;
        }
      } catch {
        // keep the old view
      }
    };
    void load();
    const t = setInterval(load, VIEW_REFRESH_MS);
    return () => {
      controller.abort();
      clearInterval(t);
    };
  }, [historyVersion, ready, viewVersion]);

  // Clock for greeting and time window (client only, avoids hydration differences).
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);

  // Confetti when a print goes from "printing" to "complete" while the page is open.
  const jobState = snapshot?.job?.state ?? null;
  const [prevJobState, setPrevJobState] = useState(jobState);
  const [celebration, setCelebration] = useState(0);
  if (jobState !== prevJobState) {
    setPrevJobState(jobState);
    if (jobState === "complete" && prevJobState === "printing") setCelebration((c) => c + 1);
  }

  const settings = view?.settings;
  const startPolicy = settings && now ? canTobiasStart(settings, snapshot, now) : null;
  const blockedReason = startPolicy && !startPolicy.ok ? startPolicy.reason : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10">
      {celebration > 0 && <Confetti key={celebration} />}

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-accent text-2xl font-bold text-on-accent shadow-lg shadow-accent/30">
            3D
          </div>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              {now ? greeting(now.getHours()) : "Hei"}, {settings?.kidName ?? "Tobias"}! 👋
            </h1>
            <p className="text-muted">Velkommen til 3D-printeren</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {settings?.canToggleLight && ready && (
            <LightButtons snapshot={snapshot} send={(which, on) => apiSend("/api/tobias/light", { which, on })} />
          )}
          <ThemeToggle />
          <ConnectionBadge snapshot={snapshot} portalOnline={portalOnline} />
        </div>
      </header>

      {settings?.message && (
        <div className="pop-in rounded-2xl border border-info/30 bg-info/10 px-5 py-4 text-lg">
          <span className="mr-2">💬</span>
          {settings.message}
        </div>
      )}

      {!ready ? (
        <StatusPanel snapshot={snapshot} portalOnline={portalOnline} />
      ) : snapshot.job && settings ? (
        <PrintHero job={snapshot.job} settings={settings} />
      ) : null}

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold">Hva vil du printe? 🖨️</h2>
            <p className="text-muted">
              Trykk på noe for å starte.{" "}
              <Link href="/slik-printer-du" className="font-medium text-accent hover:underline">
                Vil du printe noe nytt? Se hvordan →
              </Link>
            </p>
          </div>
          {blockedReason && ready && <p className="rounded-full bg-surface-2 px-4 py-2 text-sm text-muted">{blockedReason}</p>}
        </div>
        {settings?.canStartAnyFile && (
          <div className="mb-6">
            <UploadBox
              onUploaded={(path) => {
                toast("Filen er lastet opp! 🎉");
                openAfterLoad.current = `file:${path}`;
                setViewVersion((v) => v + 1);
              }}
            />
          </div>
        )}
        {view ? (
          <LibraryGrid items={view.library} onSelect={setSelected} />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-3xl bg-surface-2/60" />
            ))}
          </div>
        )}
      </section>

      <HistoryList history={history} title="Det jeg har printet" collapsedCount={5} />

      <footer className="mt-auto flex flex-col items-center gap-3 pt-4 text-center text-sm text-muted sm:flex-row sm:justify-between">
        <span className="flex items-center gap-2">
          <ShieldIcon className="size-4 text-warn" />
          {settings?.requireAdult === false
            ? "Hold et øye med printeren mens den jobber, og si fra til en voksen hvis noe ser rart ut."
            : "En voksen skal alltid være til stede når printeren er i gang."}
        </span>
        <Link href="/admin" className="flex items-center gap-1.5 rounded-full px-3 py-1.5 hover:bg-surface-2 hover:text-text">
          <GearIcon className="size-4" /> For voksne
        </Link>
      </footer>

      <StartDialog
        item={selected}
        blockedReason={blockedReason}
        requireAdult={settings?.requireAdult ?? true}
        onClose={() => setSelected(null)}
        onStarted={(item) => {
          setSelected(null);
          toast(`${item.emoji} ${item.title} starter! Printeren varmer opp først.`);
        }}
      />
    </div>
  );
}
