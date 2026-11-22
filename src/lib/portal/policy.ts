/**
 * Rules for what Tobias may do. Pure functions – used both by the server
 * (enforcement) and the browser (to explain why a button is disabled).
 * The server is always the authority.
 */
import type { PrinterSnapshot } from "@/lib/printer/types";
import type { TobiasSettings } from "./types";

export type PolicyResult = { ok: true } | { ok: false; reason: string };

const ALLOW: PolicyResult = { ok: true };
const deny = (reason: string): PolicyResult => ({ ok: false, reason });

/** Printer states where a new print may begin. */
export function printerIsFree(snapshot: PrinterSnapshot | null): PolicyResult {
  if (!snapshot || snapshot.connection === "offline" || snapshot.connection === "connecting") {
    return deny("Printeren er ikke tilkoblet.");
  }
  if (snapshot.connection === "klippy_not_ready") return deny("Printeren er ikke klar ennå.");
  switch (snapshot.printState) {
    case "printing":
      return deny("Printeren er opptatt med en annen utskrift.");
    case "paused":
      return deny("Det er en utskrift på pause.");
    case "error":
      return deny("Printeren har en feil. En voksen må sjekke den.");
    case "standby":
    case "complete":
    case "cancelled":
      return ALLOW;
    default:
      return deny("Printeren er ikke klar.");
  }
}

function minutesOf(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** True if `now` is within the window. Supports windows that cross midnight. */
export function isWithinWindow(window: TobiasSettings["startWindow"], now: Date): boolean {
  if (!window.enabled) return true;
  const from = minutesOf(window.from);
  const to = minutesOf(window.to);
  if (from == null || to == null || from === to) return true;
  const current = now.getHours() * 60 + now.getMinutes();
  return from < to ? current >= from && current < to : current >= from || current < to;
}

export function canTobiasStart(settings: TobiasSettings, snapshot: PrinterSnapshot | null, now: Date): PolicyResult {
  if (!settings.canStart) return deny("Å starte utskrifter er skrudd av akkurat nå. Spør en voksen.");
  if (!isWithinWindow(settings.startWindow, now)) {
    return deny(`Utskrifter kan bare startes mellom ${settings.startWindow.from} og ${settings.startWindow.to}.`);
  }
  return printerIsFree(snapshot);
}

export function canTobiasPause(settings: TobiasSettings, snapshot: PrinterSnapshot | null): PolicyResult {
  if (!settings.canPause) return deny("Pause er ikke skrudd på.");
  if (snapshot?.connection !== "ready" || snapshot.printState !== "printing") return deny("Ingen utskrift å sette på pause.");
  return ALLOW;
}

export function canTobiasResume(settings: TobiasSettings, snapshot: PrinterSnapshot | null): PolicyResult {
  if (!settings.canPause) return deny("Pause er ikke skrudd på.");
  if (snapshot?.connection !== "ready" || snapshot.printState !== "paused") return deny("Ingen utskrift på pause.");
  return ALLOW;
}
