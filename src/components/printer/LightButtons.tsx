"use client";

import { useState } from "react";
import type { PrinterSnapshot } from "@/lib/printer/types";
import { errorMessage } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { BulbIcon, SunIcon } from "@/components/ui/icons";

export type LightName = "head" | "top";

interface LightButtonsProps {
  snapshot: PrinterSnapshot;
  send: (which: LightName, on: boolean) => Promise<unknown>;
  size?: "md" | "lg";
}

/**
 * Buttons for the printer's two lights:
 * - Nozzle light (output_pin): we know if it's on or off.
 * - Top light (Elegoo macro): just toggles, the printer doesn't report its state.
 */
export function LightButtons({ snapshot, send, size = "md" }: LightButtonsProps) {
  const toast = useToast();
  const [busy, setBusy] = useState<LightName | null>(null);

  const click = async (which: LightName, on: boolean) => {
    setBusy(which);
    try {
      await send(which, on);
    } catch (err) {
      toast(errorMessage(err), "bad");
    } finally {
      setBusy(null);
    }
  };

  const base = `flex items-center gap-2 rounded-full font-medium transition disabled:opacity-50 ${size === "lg" ? "h-11 px-4" : "h-10 px-3.5 text-sm"}`;

  return (
    <>
      {snapshot.light != null && (
        <button
          type="button"
          onClick={() => click("head", !snapshot.light)}
          disabled={busy !== null}
          aria-pressed={snapshot.light}
          title="Lyset ved printerhodet"
          className={`${base} ${snapshot.light ? "bg-warn/20 text-warn shadow-lg shadow-warn/20" : "bg-surface-2 text-muted hover:text-text"}`}
        >
          <BulbIcon className="size-5" />
          Dyselys {snapshot.light ? "på" : "av"}
        </button>
      )}
      {snapshot.topLight && (
        <button
          type="button"
          onClick={() => click("top", true)}
          disabled={busy !== null}
          title="Slår topplyset av eller på"
          className={`${base} bg-surface-2 text-muted hover:text-text`}
        >
          <SunIcon className={`size-5 ${busy === "top" ? "animate-spin" : ""}`} />
          Topplys av/på
        </button>
      )}
    </>
  );
}
