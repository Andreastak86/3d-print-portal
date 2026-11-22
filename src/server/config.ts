/**
 * Server-side configuration, read from environment variables (.env.local).
 * This module must only be imported from server code (route handlers, src/server/*).
 */

export interface ServerConfig {
  /** Base URL to Moonraker, e.g. "http://192.168.10.111" (no trailing slash). */
  printerUrl: string;
  /** WebSocket URL derived from printerUrl. */
  printerWsUrl: string;
  /** Optional Moonraker API key. Not needed when this PC is a trusted client. */
  apiKey: string | null;
  /** output_pin name for the case light ("" in env disables it) */
  lightPin: string | null;
  /** Klipper macro that toggles the top/logo light ("" in env disables it) */
  topLightMacro: string | null;
  /** Use a simulated printer instead of the real one (for development/testing). */
  mock: boolean;
}

function readConfig(): ServerConfig {
  const mock = process.env.PRINTER_MOCK === "true";
  const raw = process.env.PRINTER_URL?.trim();

  if (!raw && !mock) {
    throw new Error(
      "PRINTER_URL mangler. Kopier .env.example til .env.local og sett printerens adresse, f.eks. PRINTER_URL=http://192.168.10.111",
    );
  }

  let url: URL;
  try {
    url = new URL(raw || "http://mock.invalid");
  } catch {
    throw new Error(`PRINTER_URL er ikke en gyldig adresse: "${raw}"`);
  }

  const printerUrl = url.origin + url.pathname.replace(/\/+$/, "");
  const wsUrl = new URL(printerUrl + "/websocket");
  wsUrl.protocol = url.protocol === "https:" ? "wss:" : "ws:";

  return {
    printerUrl,
    printerWsUrl: wsUrl.toString(),
    apiKey: process.env.MOONRAKER_API_KEY?.trim() || null,
    lightPin: process.env.PRINTER_LIGHT_PIN === undefined ? "caselight1" : process.env.PRINTER_LIGHT_PIN.trim() || null,
    topLightMacro: readMacro(process.env.PRINTER_TOP_LIGHT_MACRO, "MODLELIGHT_SWITCH"),
    mock,
  };
}

/** Macro names are sent as G-code, so only plain names are allowed. */
function readMacro(value: string | undefined, fallback: string): string | null {
  const v = value === undefined ? fallback : value.trim();
  if (!v) return null;
  if (!/^[A-Za-z0-9_]+$/.test(v)) throw new Error(`Ugyldig makronavn: "${v}"`);
  return v.toUpperCase();
}

let cached: ServerConfig | null = null;

export function getConfig(): ServerConfig {
  cached ??= readConfig();
  return cached;
}
