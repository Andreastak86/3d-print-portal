"use client";

import { useState } from "react";
import type { PrinterSnapshot } from "@/lib/printer/types";
import { apiSend, errorMessage } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { LightButtons } from "@/components/printer/LightButtons";
import { AlertIcon, FlameIcon, HomeIcon, PauseIcon, PlayIcon, SnowIcon, StopIcon } from "@/components/ui/icons";

type Confirm = "cancel" | "emergency_stop" | null;

async function control(body: Record<string, unknown>) {
  await apiSend("/api/admin/control", body);
}

export function ControlPanel({ snapshot }: { snapshot: PrinterSnapshot }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [nozzle, setNozzle] = useState("");
  const [bed, setBed] = useState("");

  const state = snapshot.printState;
  const active = state === "printing" || state === "paused";
  const idle = !active;

  const run = async (key: string, body: Record<string, unknown>, success?: string) => {
    setBusy(key);
    try {
      await control(body);
      if (success) toast(success);
    } catch (err) {
      toast(errorMessage(err), "bad");
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  };

  const setTemp = (heater: "nozzle" | "bed", value: string) => {
    if (value === "") return;
    void run(`temp-${heater}`, { action: "temperature", heater, target: Number(value) }, `${heater === "nozzle" ? "Dyse" : "Plate"} satt til ${value}°`);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Utskrift" icon={<PlayIcon />}>
        <div className="flex flex-wrap gap-2">
          {state === "paused" ? (
            <Button variant="primary" icon={<PlayIcon />} loading={busy === "resume"} onClick={() => run("resume", { action: "resume" }, "Fortsetter")}>
              Fortsett
            </Button>
          ) : (
            <Button icon={<PauseIcon />} disabled={state !== "printing"} loading={busy === "pause"} onClick={() => run("pause", { action: "pause" }, "Satt på pause")}>
              Pause
            </Button>
          )}
          <Button variant="danger" icon={<StopIcon />} disabled={!active} onClick={() => setConfirm("cancel")}>
            Avbryt utskrift
          </Button>
        </div>
        <div className="mt-6 rounded-xl border border-bad/30 bg-bad/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-bad">Nødstopp</p>
              <p className="text-sm text-muted">Stopper alt umiddelbart. Printeren må startes på nytt etterpå.</p>
            </div>
            <button
              type="button"
              onClick={() => setConfirm("emergency_stop")}
              className="flex h-11 items-center gap-2 rounded-xl bg-bad px-5 font-bold text-on-accent shadow-lg shadow-bad/30 transition hover:brightness-110 active:scale-95"
            >
              <AlertIcon className="size-5" /> NØDSTOPP
            </button>
          </div>
        </div>
      </Card>

      <Card title="Hurtigvalg" icon={<FlameIcon />}>
        <div className="flex flex-wrap gap-2">
          <Button icon={<FlameIcon />} disabled={active} loading={busy === "preheat_pla"} onClick={() => run("preheat_pla", { action: "preset", preset: "preheat_pla" }, "Forvarmer for PLA")}>
            Forvarm PLA
          </Button>
          <Button icon={<FlameIcon />} disabled={active} loading={busy === "preheat_petg"} onClick={() => run("preheat_petg", { action: "preset", preset: "preheat_petg" }, "Forvarmer for PETG")}>
            Forvarm PETG
          </Button>
          <Button icon={<SnowIcon />} disabled={active} loading={busy === "cooldown"} onClick={() => run("cooldown", { action: "preset", preset: "cooldown" }, "Kjøler ned")}>
            Kjøl ned
          </Button>
          <Button icon={<HomeIcon />} disabled={!idle} loading={busy === "home"} onClick={() => run("home", { action: "preset", preset: "home" }, "Akser hjemmet")}>
            Hjem akser
          </Button>
          <LightButtons snapshot={snapshot} send={(which, on) => control({ action: "light", which, on })} />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {(
            [
              ["nozzle", "Dyse", nozzle, setNozzle, 280],
              ["bed", "Plate", bed, setBed, 100],
            ] as const
          ).map(([heater, label, value, setValue, max]) => (
            <form
              key={heater}
              onSubmit={(e) => {
                e.preventDefault();
                setTemp(heater, value);
              }}
              className="flex items-end gap-2"
            >
              <label className="flex-1">
                <span className="text-xs text-muted">
                  {label} (0–{max}°)
                </span>
                <input
                  type="number"
                  min={0}
                  max={max}
                  inputMode="numeric"
                  placeholder={String(Math.round((heater === "nozzle" ? snapshot.temperatures?.nozzle.target : snapshot.temperatures?.bed.target) ?? 0))}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  disabled={active}
                  className="mt-1 h-10 w-full rounded-xl border border-line bg-surface-2 px-3 outline-none focus:border-accent disabled:opacity-40"
                />
              </label>
              <Button type="submit" disabled={active || value === ""} loading={busy === `temp-${heater}`}>
                Sett
              </Button>
            </form>
          ))}
        </div>
        {active && <p className="mt-3 text-xs text-muted">Temperatur og forvarming er låst mens en utskrift pågår.</p>}
      </Card>

      <ConfirmDialog
        open={confirm === "cancel"}
        title="Avbryte utskriften?"
        message={`«${snapshot.job?.displayName ?? "Utskriften"}» stoppes og kan ikke fortsettes.`}
        confirmLabel="Avbryt utskrift"
        danger
        loading={busy === "cancel"}
        onConfirm={() => run("cancel", { action: "cancel" }, "Utskriften er avbrutt")}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "emergency_stop"}
        title="Nødstopp?"
        message="Alle motorer og varmeelementer stoppes umiddelbart. Klipper må startes på nytt (FIRMWARE_RESTART) før printeren kan brukes igjen."
        confirmLabel="NØDSTOPP"
        danger
        loading={busy === "emergency_stop"}
        onConfirm={() => run("emergency_stop", { action: "emergency_stop" }, "Nødstopp utført")}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
