import { describe, expect, it } from "vitest";
import type { PrinterSnapshot, PrintState } from "@/lib/printer/types";
import type { TobiasSettings } from "./types";
import { canTobiasPause, canTobiasResume, canTobiasStart, isWithinWindow, printerIsFree } from "./policy";

const settings: TobiasSettings = {
  kidName: "Tobias",
  canStart: true,
  canPause: true,
  canToggleLight: true,
  canStartAnyFile: false,
  requireAdult: true,
  startWindow: { enabled: false, from: "08:00", to: "21:00" },
  message: "",
};

function snap(printState: PrintState | null, connection: PrinterSnapshot["connection"] = "ready"): PrinterSnapshot {
  return {
    connection,
    klippyState: null,
    klippyMessage: null,
    temperatures: null,
    printState,
    job: null,
    light: null,
    topLight: false,
    updatedAt: 0,
    mock: false,
  };
}

const noon = new Date(2026, 10, 21, 12, 0);

describe("printerIsFree", () => {
  it.each<PrintState>(["standby", "complete", "cancelled"])("is free in %s", (state) => {
    expect(printerIsFree(snap(state)).ok).toBe(true);
  });
  it.each<PrintState>(["printing", "paused", "error"])("is busy in %s", (state) => {
    expect(printerIsFree(snap(state)).ok).toBe(false);
  });
  it("is not free when offline, connecting or Klipper not ready", () => {
    expect(printerIsFree(null).ok).toBe(false);
    expect(printerIsFree(snap(null, "offline")).ok).toBe(false);
    expect(printerIsFree(snap(null, "connecting")).ok).toBe(false);
    expect(printerIsFree(snap(null, "klippy_not_ready")).ok).toBe(false);
  });
});

describe("canTobiasStart", () => {
  it("allows start when everything is OK", () => {
    expect(canTobiasStart(settings, snap("standby"), noon)).toEqual({ ok: true });
  });
  it("denies when start is switched off", () => {
    expect(canTobiasStart({ ...settings, canStart: false }, snap("standby"), noon).ok).toBe(false);
  });
  it("denies outside the time window", () => {
    const s = { ...settings, startWindow: { enabled: true, from: "08:00", to: "11:00" } };
    const result = canTobiasStart(s, snap("standby"), noon);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("08:00");
  });
  it("denies when the printer is busy", () => {
    expect(canTobiasStart(settings, snap("printing"), noon).ok).toBe(false);
  });
});

describe("isWithinWindow", () => {
  const at = (h: number, m = 0) => new Date(2026, 0, 1, h, m);
  it("normal window", () => {
    const w = { enabled: true, from: "08:00", to: "21:00" };
    expect(isWithinWindow(w, at(8))).toBe(true);
    expect(isWithinWindow(w, at(20, 59))).toBe(true);
    expect(isWithinWindow(w, at(21))).toBe(false);
    expect(isWithinWindow(w, at(7, 59))).toBe(false);
  });
  it("window crossing midnight", () => {
    const w = { enabled: true, from: "22:00", to: "02:00" };
    expect(isWithinWindow(w, at(23))).toBe(true);
    expect(isWithinWindow(w, at(1))).toBe(true);
    expect(isWithinWindow(w, at(12))).toBe(false);
  });
  it("switched off or invalid = always allowed", () => {
    expect(isWithinWindow({ enabled: false, from: "08:00", to: "09:00" }, at(12))).toBe(true);
    expect(isWithinWindow({ enabled: true, from: "tull", to: "09:00" }, at(12))).toBe(true);
  });
});

describe("pause/resume", () => {
  it("pause only while printing, resume only while paused", () => {
    expect(canTobiasPause(settings, snap("printing")).ok).toBe(true);
    expect(canTobiasPause(settings, snap("paused")).ok).toBe(false);
    expect(canTobiasResume(settings, snap("paused")).ok).toBe(true);
    expect(canTobiasResume(settings, snap("printing")).ok).toBe(false);
  });
  it("is denied when switched off", () => {
    expect(canTobiasPause({ ...settings, canPause: false }, snap("printing")).ok).toBe(false);
  });
});
