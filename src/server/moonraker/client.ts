/**
 * Live connection to Moonraker over WebSocket (JSON-RPC 2.0).
 *
 * Responsibilities:
 * - Connect, identify, subscribe to printer objects.
 * - Keep a merged status and turn it into a PrinterSnapshot.
 * - Detect drops (close event, silent dead connection via a watchdog) and
 *   reconnect with increasing backoff.
 * - Track Klipper's state separately: Moonraker can be up while Klipper is not ready.
 *
 * Uses Node's built-in WebSocket (Node 22+), so no extra dependency.
 */
import { EventEmitter } from "node:events";
import type { HistoryJob, HistoryResponse, PrinterSnapshot, ConnectionState } from "@/lib/printer/types";
import type { ConsoleLine, LogFile, PrinterFile, SystemInfo } from "@/lib/portal/types";
import type { ServerConfig } from "@/server/config";
import type { PrinterSource } from "@/server/printer/source";
import { buildSnapshot, mapHistoryJob, mapHistoryTotals, mergeStatus } from "./state";
import {
  PrinterCommandError,
  PrinterUnavailableError,
  copyGcode,
  deleteGcode,
  fetchGcodeStore,
  fetchHistoryList,
  fetchHistoryTotals,
  fetchLogFile,
  fetchLogList,
  fetchOneshotToken,
  uploadGcode,
} from "./rest";
import { getGcodeFile, listGcodeFiles } from "./files";
import { collectSystemInfo } from "./diagnostics";
import type { JsonRpcMessage, RawFileMetadata, RawServerInfo, RawStatus } from "./types";

/** Objects and fields we subscribe to. null = all fields. */
const SUBSCRIBE_OBJECTS = {
  print_stats: null,
  extruder: ["temperature", "target", "power"],
  heater_bed: ["temperature", "target", "power"],
  virtual_sdcard: ["progress", "file_position", "file_size", "is_active"],
  display_status: null,
  webhooks: null,
} as const;

const CONNECT_TIMEOUT_MS = 10_000;
const RPC_TIMEOUT_MS = 10_000;
const RECONNECT_MIN_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;
/** How often we check the connection is alive when everything is OK... */
const WATCHDOG_READY_MS = 15_000;
/** ...and how often we check whether Klipper is ready when it isn't. */
const WATCHDOG_NOT_READY_MS = 3_000;
/** Throttle snapshot updates to the browser. */
const EMIT_THROTTLE_MS = 250;
const META_RETRY_MS = 10_000;
/** G-code like G28 can take a while; Moonraker replies only when it's finished. */
const GCODE_TIMEOUT_MS = 60_000;

interface PendingCall {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: NodeJS.Timeout;
}

export class MoonrakerPrinter implements PrinterSource {
  private readonly events = new EventEmitter();
  private started = false;

  private ws: WebSocket | null = null;
  private connection: ConnectionState = "connecting";
  private klippyState: string | null = null;
  private klippyMessage: string | null = null;
  private subscribed = false;
  private lightAvailable = false;
  private topLightAvailable = false;
  private status: RawStatus = {};

  private fileMeta: RawFileMetadata | null = null;
  private fileMetaFor: string | null = null;
  private fileMetaAttemptAt = 0;

  private nextRpcId = 1;
  private readonly pending = new Map<number, PendingCall>();

  private reconnectDelay = RECONNECT_MIN_MS;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private watchdogTimer: NodeJS.Timeout | null = null;
  private emitTimer: NodeJS.Timeout | null = null;

  private snapshot: PrinterSnapshot;

  constructor(private readonly config: ServerConfig) {
    this.events.setMaxListeners(100);
    this.snapshot = this.buildSnapshot();
  }

  // ---------------------------------------------------------------- public API

  start(): void {
    if (this.started) return;
    this.started = true;
    void this.connect();
  }

  getSnapshot(): PrinterSnapshot {
    return this.snapshot;
  }

  onSnapshot(listener: (snapshot: PrinterSnapshot) => void): () => void {
    this.events.on("snapshot", listener);
    return () => this.events.off("snapshot", listener);
  }

  onHistoryChanged(listener: () => void): () => void {
    this.events.on("history", listener);
    return () => this.events.off("history", listener);
  }

  async getHistory(limit: number): Promise<HistoryResponse> {
    const [list, totals] = await Promise.all([fetchHistoryList(limit), fetchHistoryTotals().catch(() => null)]);
    return {
      jobs: list.jobs.map(mapHistoryJob),
      totals: totals ? mapHistoryTotals(totals) : null,
    };
  }

  async getAllJobs(): Promise<HistoryJob[]> {
    const PAGE = 200;
    const MAX_JOBS = 10_000; // safety valve
    const jobs: HistoryJob[] = [];
    for (let start = 0; start < MAX_JOBS; start += PAGE) {
      const page = await fetchHistoryList(PAGE, start);
      jobs.push(...page.jobs.map(mapHistoryJob));
      if (page.jobs.length < PAGE) break;
    }
    return jobs;
  }

  // ---------------------------------------------------------------- files

  listFiles(): Promise<PrinterFile[]> {
    return listGcodeFiles();
  }

  getFile(path: string): Promise<PrinterFile | null> {
    return getGcodeFile(path);
  }

  uploadFile(file: File, folder: string): Promise<string> {
    return uploadGcode(file, folder);
  }

  deleteFile(path: string): Promise<void> {
    return deleteGcode(path);
  }

  copyFile(source: string, dest: string): Promise<void> {
    return copyGcode(source, dest);
  }

  // ---------------------------------------------------------------- control

  async startPrint(path: string): Promise<void> {
    await this.command("printer.print.start", { filename: path });
  }

  async pausePrint(): Promise<void> {
    await this.command("printer.print.pause");
  }

  async resumePrint(): Promise<void> {
    await this.command("printer.print.resume");
  }

  async cancelPrint(): Promise<void> {
    await this.command("printer.print.cancel");
  }

  async emergencyStop(): Promise<void> {
    await this.command("printer.emergency_stop");
  }

  async runGcode(script: string): Promise<void> {
    await this.command("printer.gcode.script", { script }, GCODE_TIMEOUT_MS);
  }

  /** RPC call that translates errors into errors the API layer understands. */
  private async command(method: string, params?: Record<string, unknown>, timeoutMs?: number): Promise<unknown> {
    if (this.connection === "offline" || this.connection === "connecting") {
      throw new PrinterUnavailableError("Printeren er ikke tilkoblet");
    }
    try {
      return await this.call(method, params, timeoutMs);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.startsWith("Tidsavbrudd")) throw new PrinterUnavailableError("Printeren svarte ikke i tide");
      if (message === "Ikke tilkoblet" || message === "Forbindelsen ble brutt") throw new PrinterUnavailableError(message);
      throw new PrinterCommandError(message);
    }
  }

  // ---------------------------------------------------------------- diagnostics

  async getConsole(count: number): Promise<ConsoleLine[]> {
    const lines = await fetchGcodeStore(count);
    return lines.map((l) => ({ time: Math.round(l.time * 1000), type: l.type, message: l.message }));
  }

  getSystemInfo(): Promise<SystemInfo> {
    return collectSystemInfo();
  }

  async listLogs(): Promise<LogFile[]> {
    const logs = await fetchLogList();
    return logs
      .map((l) => ({ name: l.path, size: l.size, modified: Math.round(l.modified * 1000) }))
      .sort((a, b) => b.modified - a.modified);
  }

  downloadLog(name: string): Promise<Response> {
    return fetchLogFile(name);
  }

  // ---------------------------------------------------------------- connection

  private async connect(): Promise<void> {
    this.reconnectTimer = null;

    let url = this.config.printerWsUrl;
    if (this.config.apiKey) {
      try {
        url += `?token=${encodeURIComponent(await fetchOneshotToken())}`;
      } catch {
        this.handleDisconnect();
        return;
      }
    }

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      this.handleDisconnect();
      return;
    }
    this.ws = ws;

    const connectTimer = setTimeout(() => this.dropSocket(ws), CONNECT_TIMEOUT_MS);

    ws.addEventListener("open", () => {
      clearTimeout(connectTimer);
      this.reconnectDelay = RECONNECT_MIN_MS;
      void this.onOpen();
    });
    ws.addEventListener("message", (ev) => this.handleMessage(String(ev.data)));
    ws.addEventListener("close", () => {
      clearTimeout(connectTimer);
      if (this.ws === ws) this.handleDisconnect();
    });
    // "error" is always followed by "close" – handled there.
    ws.addEventListener("error", () => {});
  }

  /**
   * Gives up a socket immediately. A dead TCP connection can take a long time to
   * fire "close", so we disconnect it from our state first and then close it.
   */
  private dropSocket(ws: WebSocket): void {
    if (this.ws !== ws) return;
    this.handleDisconnect();
    try {
      ws.close();
    } catch {
      // ignore
    }
  }

  private async onOpen(): Promise<void> {
    this.setConnection("klippy_not_ready");
    try {
      await this.call("server.connection.identify", {
        client_name: "3d-print-portal",
        version: "0.1.0",
        type: "web",
        url: "http://localhost",
      });
    } catch {
      // Not critical – older Moonraker versions may lack it.
    }
    try {
      await this.checkKlippy();
    } catch {
      // The watchdog tries again shortly.
    }
    if (this.ws) this.scheduleWatchdog();
  }

  private handleDisconnect(): void {
    this.ws = null;
    this.subscribed = false;
    this.status = {};
    this.fileMeta = null;
    this.fileMetaFor = null;
    this.klippyState = null;
    this.klippyMessage = null;

    for (const call of this.pending.values()) {
      clearTimeout(call.timer);
      call.reject(new Error("Forbindelsen ble brutt"));
    }
    this.pending.clear();

    if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
    this.watchdogTimer = null;

    this.setConnection("offline");

    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => void this.connect(), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, RECONNECT_MAX_MS);
    }
  }

  /** Periodic health check: detects silent drops and Klipper becoming ready. */
  private scheduleWatchdog(): void {
    if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
    const delay = this.connection === "ready" ? WATCHDOG_READY_MS : WATCHDOG_NOT_READY_MS;
    this.watchdogTimer = setTimeout(async () => {
      const ws = this.ws;
      if (!ws) return;
      try {
        await this.checkKlippy();
        if (this.connection === "ready") this.ensureFileMeta();
      } catch {
        // No answer within the timeout → treat the connection as dead.
        this.dropSocket(ws);
        return;
      }
      if (this.ws === ws) this.scheduleWatchdog();
    }, delay);
  }

  /** Asks Moonraker about Klipper's state and subscribes when it is ready. */
  private async checkKlippy(): Promise<void> {
    const info = (await this.call("server.info")) as RawServerInfo;

    if (info.klippy_state === "ready") {
      if (!this.subscribed) await this.subscribe();
      return;
    }

    // Klipper not ready (startup / shutdown / error / disconnected)
    this.subscribed = false;
    this.status = {};
    this.klippyState = info.klippy_state;
    this.klippyMessage = null;
    if (info.klippy_connected) {
      try {
        const printerInfo = (await this.call("printer.info")) as { state_message?: string };
        this.klippyMessage = printerInfo.state_message ?? null;
      } catch {
        // ignore
      }
    }
    this.setConnection("klippy_not_ready", true);
  }

  private async subscribe(): Promise<void> {
    const objects: Record<string, readonly string[] | null> = { ...SUBSCRIBE_OBJECTS };
    const { lightPin: pin, topLightMacro: macro } = this.config;
    if (pin || macro) {
      let available: string[] = [];
      try {
        available = ((await this.call("printer.objects.list")) as { objects: string[] }).objects.map((o) => o.toLowerCase());
      } catch {
        // ignore – lights are just hidden
      }
      this.lightAvailable = Boolean(pin && available.includes(`output_pin ${pin}`.toLowerCase()));
      this.topLightAvailable = Boolean(macro && available.includes(`gcode_macro ${macro}`.toLowerCase()));
      if (this.lightAvailable) objects[`output_pin ${pin}`] = ["value"];
    }
    const result = (await this.call("printer.objects.subscribe", { objects })) as {
      status: RawStatus;
    };
    this.status = result.status;
    this.subscribed = true;
    this.klippyState = "ready";
    this.klippyMessage = null;
    this.setConnection("ready", true);
    this.ensureFileMeta();
  }

  // ---------------------------------------------------------------- messages

  private handleMessage(data: string): void {
    let msg: JsonRpcMessage;
    try {
      msg = JSON.parse(data) as JsonRpcMessage;
    } catch {
      return;
    }

    if (msg.id != null) {
      const call = this.pending.get(msg.id);
      if (call) {
        this.pending.delete(msg.id);
        clearTimeout(call.timer);
        if (msg.error) call.reject(new Error(msg.error.message));
        else call.resolve(msg.result);
      }
      return;
    }

    switch (msg.method) {
      case "notify_status_update": {
        if (!this.subscribed) return;
        const update = msg.params?.[0] as Record<string, unknown> | undefined;
        if (!update) return;
        this.status = mergeStatus(this.status, update);
        this.ensureFileMeta();
        this.scheduleEmit();
        break;
      }
      case "notify_klippy_ready":
        void this.subscribe().catch(() => {});
        break;
      case "notify_klippy_shutdown":
      case "notify_klippy_disconnected":
        this.subscribed = false;
        this.status = {};
        this.klippyState = msg.method === "notify_klippy_shutdown" ? "shutdown" : "disconnected";
        this.klippyMessage = null;
        this.setConnection("klippy_not_ready", true);
        this.scheduleWatchdog();
        break;
      case "notify_history_changed":
        this.events.emit("history");
        break;
    }
  }

  private call(method: string, params?: Record<string, unknown>, timeoutMs = RPC_TIMEOUT_MS): Promise<unknown> {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error("Ikke tilkoblet"));
    }
    const id = this.nextRpcId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Tidsavbrudd: ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      ws.send(JSON.stringify({ jsonrpc: "2.0", method, params, id }));
    });
  }

  // ---------------------------------------------------------------- file metadata

  /** Fetches metadata (thumbnail, slicer estimate) for the active file when it changes. */
  private ensureFileMeta(): void {
    const filename = this.status.print_stats?.filename || null;

    if (!filename) {
      this.fileMeta = null;
      this.fileMetaFor = null;
      return;
    }
    if (this.fileMetaFor === filename && this.fileMeta) return;
    if (this.fileMetaFor === filename && Date.now() - this.fileMetaAttemptAt < META_RETRY_MS) return;

    this.fileMetaFor = filename;
    this.fileMetaAttemptAt = Date.now();
    this.call("server.files.metadata", { filename })
      .then((meta) => {
        if (this.fileMetaFor !== filename) return;
        this.fileMeta = meta as RawFileMetadata;
        this.emitNow();
      })
      .catch(() => {
        // Moonraker may not have analysed the file yet – retried later.
      });
  }

  // ---------------------------------------------------------------- snapshot

  private setConnection(state: ConnectionState, force = false): void {
    if (this.connection === state && !force) return;
    this.connection = state;
    this.emitNow();
  }

  private scheduleEmit(): void {
    if (this.emitTimer) return;
    this.emitTimer = setTimeout(() => {
      this.emitTimer = null;
      this.emitNow();
    }, EMIT_THROTTLE_MS);
  }

  private emitNow(): void {
    if (this.emitTimer) {
      clearTimeout(this.emitTimer);
      this.emitTimer = null;
    }
    this.snapshot = this.buildSnapshot();
    this.events.emit("snapshot", this.snapshot);
  }

  private buildSnapshot(): PrinterSnapshot {
    return buildSnapshot({
      connection: this.connection,
      klippyState: this.klippyState,
      klippyMessage: this.klippyMessage,
      status: this.status,
      fileMeta: this.fileMeta,
      lightPin: this.lightAvailable ? this.config.lightPin : null,
      topLight: this.topLightAvailable,
      mock: false,
      now: Date.now(),
    });
  }
}
