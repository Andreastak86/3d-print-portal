import { adminGuard } from "@/server/auth";
import { getConfig } from "@/server/config";
import { logActivity, readStore, updateStore } from "@/server/store";
import { HttpError, apiError, readJson, str } from "@/server/http";
import type { CostSettings, TobiasSettings } from "@/lib/portal/types";

export const dynamic = "force-dynamic";

const TIME = /^([01]?\d|2[0-3]):[0-5]\d$/;

export async function GET(): Promise<Response> {
  const denied = await adminGuard();
  if (denied) return denied;
  const { settings } = await readStore();
  const config = getConfig();
  return Response.json({ settings, config: { printerUrl: config.printerUrl, mock: config.mock, lightPin: config.lightPin } });
}

export async function PUT(request: Request): Promise<Response> {
  const denied = await adminGuard();
  if (denied) return denied;
  try {
    const body = await readJson(request);
    const t = (body.tobias ?? {}) as Record<string, unknown>;
    const w = (t.startWindow ?? {}) as Record<string, unknown>;
    const bool = (v: unknown, field: string) => {
      if (typeof v !== "boolean") throw new HttpError(400, "bad_request", `Ugyldig verdi for ${field}`);
      return v;
    };
    const time = (v: unknown, field: string) => {
      const s = str(v, field, { max: 5 });
      if (!TIME.test(s)) throw new HttpError(400, "bad_request", `${field} må være på formen TT:MM`);
      return s;
    };
    const tobias: TobiasSettings = {
      kidName: str(t.kidName, "navn", { max: 40 }),
      canStart: bool(t.canStart, "start"),
      canPause: bool(t.canPause, "pause"),
      canToggleLight: bool(t.canToggleLight, "lys"),
      canStartAnyFile: bool(t.canStartAnyFile, "alle filer"),
      requireAdult: bool(t.requireAdult, "voksen til stede"),
      startWindow: { enabled: bool(w.enabled, "tidsvindu"), from: time(w.from, "Fra"), to: time(w.to, "Til") },
      message: str(t.message ?? "", "melding", { max: 300, allowEmpty: true }),
    };
    const c = (body.costs ?? {}) as Record<string, unknown>;
    const num = (v: unknown, field: string, max: number) => {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > max) throw new HttpError(400, "bad_request", `Ugyldig verdi for ${field}`);
      return n;
    };
    const costs: CostSettings = {
      filamentPricePerKg: num(c.filamentPricePerKg, "filamentpris", 10_000),
      printerWatts: num(c.printerWatts, "strømforbruk", 2_000),
      electricityPricePerKwh: num(c.electricityPricePerKwh, "strømpris", 100),
    };
    await updateStore((data) => {
      data.settings.tobias = tobias;
      data.settings.costs = costs;
    });
    await logActivity("admin", "Endret innstillinger");
    return Response.json({ settings: { tobias, costs } });
  } catch (err) {
    return apiError(err);
  }
}
