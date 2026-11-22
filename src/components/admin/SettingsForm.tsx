"use client";

import { useState } from "react";
import type { CostSettings, PortalSettings, TobiasSettings } from "@/lib/portal/types";
import { apiSend, errorMessage } from "@/lib/api";
import { useApiData } from "@/hooks/useApiData";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { useToast } from "@/components/ui/Toast";
import { GearIcon, ShieldIcon } from "@/components/ui/icons";
import { PageHeader } from "./AdminShell";

interface SettingsResponse {
  settings: PortalSettings;
  config: { printerUrl: string; mock: boolean; lightPin: string | null };
}

export function SettingsForm() {
  const { data, error } = useApiData<SettingsResponse>("/api/admin/settings");

  return (
    <>
      <PageHeader title="Innstillinger" description="Bestem hva Tobias kan gjøre på sin side." />
      {error && !data && <p className="rounded-xl bg-bad/10 p-4 text-bad">{error}</p>}
      {data && <SettingsEditor initial={data.settings} config={data.config} />}
    </>
  );
}

function SettingsEditor({ initial, config }: { initial: PortalSettings; config: SettingsResponse["config"] }) {
  const toast = useToast();
  const [saved, setSaved] = useState(initial);
  const [s, setS] = useState(initial.tobias);
  const [costs, setCosts] = useState(initial.costs);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify({ tobias: s, costs }) !== JSON.stringify(saved);
  const setCost = (key: keyof CostSettings, value: string) => setCosts((c) => ({ ...c, [key]: Number(value.replace(",", ".")) || 0 }));
  const set = <K extends keyof TobiasSettings>(key: K, value: TobiasSettings[K]) => setS((prev) => ({ ...prev, [key]: value }));
  const input = "h-10 rounded-xl border border-line bg-surface-2 px-3 outline-none focus:border-accent";

  const save = async () => {
    setSaving(true);
    try {
      await apiSend("/api/admin/settings", { tobias: s, costs }, "PUT");
      setSaved({ tobias: s, costs });
      toast("Innstillingene er lagret");
    } catch (err) {
      toast(errorMessage(err), "bad");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card title="Tobias sine rettigheter" icon={<ShieldIcon />}>
          <label className="block pb-3">
            <span className="text-sm text-muted">Navn på siden</span>
            <input className={`${input} mt-1 w-full`} value={s.kidName} maxLength={40} onChange={(e) => set("kidName", e.target.value)} />
          </label>
          <div className="divide-y divide-line border-t border-line">
            <Toggle
              label="Kan starte godkjente utskrifter"
              description="Alltid med sjekkliste om at byggeplaten er tom."
              checked={s.canStart}
              onChange={(v) => set("canStart", v)}
            />
            <Toggle
              label="Kan starte alle filer og laste opp egne"
              description="Ikke bare godkjente. Tobias får en «Last opp fil»-boks, og alt han laster opp (også fra OrcaSlicer) kan han starte med en gang."
              checked={s.canStartAnyFile}
              onChange={(v) => set("canStartAnyFile", v)}
            />
            <Toggle
              label="Krev at en voksen er til stede"
              description="Legger til «En voksen er her» på sjekklisten. Skru av hvis Tobias skal kunne printe når du ikke er hjemme."
              checked={s.requireAdult}
              onChange={(v) => set("requireAdult", v)}
            />
            <Toggle label="Kan sette på pause og fortsette" description="Tobias kan aldri avbryte en utskrift." checked={s.canPause} onChange={(v) => set("canPause", v)} />
            <Toggle label="Kan skru lyset av og på" checked={s.canToggleLight} onChange={(v) => set("canToggleLight", v)} />
            <div>
              <Toggle
                label="Begrens når utskrifter kan startes"
                description="F.eks. ikke etter leggetid."
                checked={s.startWindow.enabled}
                onChange={(v) => set("startWindow", { ...s.startWindow, enabled: v })}
              />
              {s.startWindow.enabled && (
                <div className="flex items-center gap-3 pb-3">
                  <span className="text-sm text-muted">Fra</span>
                  <input type="time" className={input} value={s.startWindow.from} onChange={(e) => set("startWindow", { ...s.startWindow, from: e.target.value })} />
                  <span className="text-sm text-muted">til</span>
                  <input type="time" className={input} value={s.startWindow.to} onChange={(e) => set("startWindow", { ...s.startWindow, to: e.target.value })} />
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card title="Melding til Tobias" icon={<span>💬</span>}>
          <textarea
            className="min-h-24 w-full rounded-xl border border-line bg-surface-2 px-3 py-2 outline-none focus:border-accent"
            placeholder="Vises øverst på Tobias sin side. F.eks. «Husk å rydde platen etter deg!»"
            maxLength={300}
            value={s.message}
            onChange={(e) => set("message", e.target.value)}
          />
        </Card>

        <Card title="Kostnader (for statistikken)" icon={<span>💰</span>}>
          <p className="mb-4 text-sm text-muted">Brukes til å anslå hva utskriftene koster i plast og strøm.</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {(
              [
                ["filamentPricePerKg", "Filamentpris", "kr per kg"],
                ["printerWatts", "Strømforbruk", "watt i snitt under utskrift"],
                ["electricityPricePerKwh", "Strømpris", "kr per kWh"],
              ] as const
            ).map(([key, label, unit]) => (
              <label key={key} className="block">
                <span className="text-sm font-medium">{label}</span>
                <input
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  className={`${input} mt-1 w-full`}
                  value={costs[key]}
                  onChange={(e) => setCost(key, e.target.value)}
                />
                <span className="mt-1 block text-xs text-muted">{unit}</span>
              </label>
            ))}
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            disabled={!dirty || saving}
            onClick={() => {
              setS(saved.tobias);
              setCosts(saved.costs);
            }}
          >
            Tilbakestill
          </Button>
          <Button variant="primary" loading={saving} disabled={!dirty} onClick={save}>
            Lagre endringer
          </Button>
        </div>
      </div>

      <Card title="Oppsett" icon={<GearIcon />} className="self-start">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted">Printer-adresse</dt>
            <dd className="font-mono">{config.printerUrl}</dd>
          </div>
          <div>
            <dt className="text-muted">Lys (output_pin)</dt>
            <dd className="font-mono">{config.lightPin ?? "ikke satt"}</dd>
          </div>
          {config.mock && (
            <div className="rounded-lg bg-info/10 p-2 text-info">Kjører mot simulert printer (PRINTER_MOCK=true)</div>
          )}
        </dl>
        <p className="mt-4 border-t border-line pt-4 text-sm text-muted">
          Printer-adresse og admin-passord endres i <code className="text-text">.env.local</code> i prosjektmappen. Start portalen på nytt etterpå.
        </p>
      </Card>
    </div>
  );
}
