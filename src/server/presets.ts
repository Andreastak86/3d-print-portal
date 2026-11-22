/**
 * Predefined G-code commands. Only these (plus the admin console) are sent to the printer.
 */
import { HttpError } from "@/server/http";

export const TEMP_LIMITS = { nozzle: 280, bed: 100 } as const;

export function lightScript(pin: string | null, on: boolean): string {
  if (!pin) throw new HttpError(409, "no_light", "Printeren har ikke lys vi kan styre.");
  return `SET_PIN PIN=${pin} VALUE=${on ? 1 : 0}`;
}

export function topLightScript(macro: string | null): string {
  if (!macro) throw new HttpError(409, "no_light", "Printeren har ikke topplys vi kan styre.");
  return macro;
}

export type LightName = "head" | "top";

export function lightName(value: unknown): LightName {
  return value === "top" ? "top" : "head";
}

export const PRESETS = {
  preheat_pla: { label: "Forvarm PLA", script: "M104 S205\nM140 S60" },
  preheat_petg: { label: "Forvarm PETG", script: "M104 S240\nM140 S80" },
  cooldown: { label: "Kjøl ned", script: "M104 S0\nM140 S0" },
  home: { label: "Hjem alle akser", script: "G28" },
  motors_off: { label: "Motorer av", script: "M84" },
} as const;

export type PresetName = keyof typeof PRESETS;

export function isPreset(name: unknown): name is PresetName {
  return typeof name === "string" && Object.hasOwn(PRESETS, name);
}

export function temperatureScript(heater: unknown, target: unknown): string {
  const t = Number(target);
  if (heater !== "nozzle" && heater !== "bed") throw new HttpError(400, "bad_request", "Ukjent varmeelement");
  const max = TEMP_LIMITS[heater];
  if (!Number.isFinite(t) || t < 0 || t > max) {
    throw new HttpError(400, "bad_request", `Temperaturen må være mellom 0 og ${max}°`);
  }
  return `${heater === "nozzle" ? "M104" : "M140"} S${Math.round(t)}`;
}
