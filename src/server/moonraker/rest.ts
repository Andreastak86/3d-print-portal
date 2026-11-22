/**
 * Thin REST client for Moonraker. Used for one-off fetches (history, files, logs).
 * Live status and printer commands run over the WebSocket in client.ts.
 */
import { getConfig } from "@/server/config";
import type { RawFileMetadata, RawHistoryList, RawHistoryTotals } from "./types";

export class PrinterUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PrinterUnavailableError";
  }
}

/** Moonraker answered, but refused the command (e.g. file not found, printer busy). */
export class PrinterCommandError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "PrinterCommandError";
  }
}

const DEFAULT_TIMEOUT_MS = 5000;

function authHeaders(): Record<string, string> {
  const { apiKey } = getConfig();
  return apiKey ? { "X-Api-Key": apiKey } : {};
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function request(path: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { printerUrl } = getConfig();
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(printerUrl + path, {
      ...rest,
      headers: { ...authHeaders(), ...(rest.headers as Record<string, string> | undefined) },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (err) {
    throw new PrinterUnavailableError("Fikk ikke kontakt med printeren", { cause: err });
  }
  if (!res.ok) {
    let message = `Printeren svarte med feil ${res.status}`;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      if (body.error?.message) message = body.error.message;
    } catch {
      // not JSON
    }
    if (res.status >= 500) throw new PrinterUnavailableError(message);
    throw new PrinterCommandError(message, res.status === 404 ? 404 : 400);
  }
  return res;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await request(path);
  const body = (await res.json()) as { result: T };
  return body.result;
}

async function sendJson<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await request(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    timeoutMs: 15_000,
  });
  return ((await res.json()) as { result: T }).result;
}

// --- history

export function fetchHistoryList(limit: number, start = 0): Promise<RawHistoryList> {
  return getJson<RawHistoryList>(`/server/history/list?limit=${limit}&start=${start}&order=desc`);
}

export function fetchHistoryTotals(): Promise<RawHistoryTotals> {
  return getJson<RawHistoryTotals>("/server/history/totals");
}

// --- files

export interface RawFileEntry {
  path: string;
  modified: number;
  size: number;
}

export function fetchFileList(): Promise<RawFileEntry[]> {
  return getJson<RawFileEntry[]>("/server/files/list?root=gcodes");
}

export function fetchFileMetadata(filename: string): Promise<RawFileMetadata> {
  return getJson<RawFileMetadata>(`/server/files/metadata?filename=${encodeURIComponent(filename)}`);
}

export async function fetchDiskUsage(): Promise<{ total: number; used: number; free: number } | null> {
  const dir = await getJson<{ disk_usage?: { total: number; used: number; free: number } }>(
    "/server/files/directory?path=gcodes&extended=false",
  );
  return dir.disk_usage ?? null;
}

/** Fetches a file from the gcodes folder (path must be validated by the caller). */
export function fetchGcodeFile(path: string): Promise<Response> {
  return request(`/server/files/gcodes/${encodePath(path)}`);
}

export async function uploadGcode(file: File, folder: string): Promise<string> {
  const form = new FormData();
  form.set("root", "gcodes");
  if (folder) form.set("path", folder);
  form.set("file", file, file.name);
  const res = await request("/server/files/upload", { method: "POST", body: form, timeoutMs: 120_000 });
  const body = (await res.json()) as { item?: { path?: string }; result?: string };
  return body.item?.path ?? (folder ? `${folder}/${file.name}` : file.name);
}

export async function deleteGcode(path: string): Promise<void> {
  await sendJson("DELETE", `/server/files/gcodes/${encodePath(path)}`);
}

export async function copyGcode(source: string, dest: string): Promise<void> {
  await sendJson("POST", "/server/files/copy", { source: `gcodes/${source}`, dest: `gcodes/${dest}` });
}

// --- diagnostics

export interface RawGcodeStoreEntry {
  message: string;
  time: number;
  type: "command" | "response";
}

export async function fetchGcodeStore(count: number): Promise<RawGcodeStoreEntry[]> {
  const result = await getJson<{ gcode_store: RawGcodeStoreEntry[] }>(`/server/gcode_store?count=${count}`);
  return result.gcode_store;
}

export function fetchServerInfo<T>(): Promise<T> {
  return getJson<T>("/server/info");
}

export function fetchPrinterInfo<T>(): Promise<T> {
  return getJson<T>("/printer/info");
}

export function fetchSystemInfo<T>(): Promise<T> {
  return getJson<T>("/machine/system_info");
}

export function fetchProcStats<T>(): Promise<T> {
  return getJson<T>("/machine/proc_stats");
}

export function fetchLogList(): Promise<RawFileEntry[]> {
  return getJson<RawFileEntry[]>("/server/files/list?root=logs");
}

export function fetchLogFile(name: string): Promise<Response> {
  return request(`/server/files/logs/${encodeURIComponent(name)}`, { timeoutMs: 60_000 });
}

/** One-shot token for the WebSocket when an API key is used (WebSocket can't send headers). */
export async function fetchOneshotToken(): Promise<string> {
  return getJson<string>("/access/oneshot_token");
}
