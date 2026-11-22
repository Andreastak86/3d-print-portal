/**
 * Simulated printer for development and testing (PRINTER_MOCK=true).
 *
 * An interactive state machine: you can start, pause, resume, cancel and
 * emergency-stop, upload/delete files and send simple G-code (M104/M140/SET_PIN/G28).
 * Temperatures move gradually toward their targets, and a print takes MOCK_PRINT_SECONDS.
 *
 * Uses the same buildSnapshot() as the real connection, so that logic is exercised too.
 */
import { EventEmitter } from "node:events";
import type { ConnectionState, HistoryJob, HistoryResponse, PrinterSnapshot } from "@/lib/printer/types";
import type { ConsoleLine, LogFile, PrinterFile, SystemInfo } from "@/lib/portal/types";
import { displayNameFromFilename } from "@/lib/printer/files";
import { buildSnapshot } from "@/server/moonraker/state";
import { PrinterCommandError } from "@/server/moonraker/rest";
import type { RawFileMetadata, RawStatus } from "@/server/moonraker/types";
import type { PrinterSource } from "./source";

const TICK_MS = 500;
const PRINT_SECONDS = Number(process.env.MOCK_PRINT_SECONDS) || 120;
const STARTUP_MS = 3000;
const LIGHT_PIN = "caselight1";

type MockState = "standby" | "printing" | "paused" | "complete" | "cancelled" | "error";

interface MockFile {
  path: string;
  modified: number;
  size: number;
  estimatedTime: number;
  filamentTotal: number;
  weight: number;
  color: string;
  layers: number;
}

const HOUR = 3_600_000;

function seedFiles(now: number): MockFile[] {
  const f = (path: string, est: number, mm: number, color: string, ageH: number): MockFile => ({
    path,
    modified: now - ageH * HOUR,
    size: Math.round(mm * 700),
    estimatedTime: est,
    filamentTotal: mm,
    weight: Math.round(mm * 0.00298 * 10) / 10,
    color,
    layers: Math.round(est / 20),
  });
  return [
    f("portal/EN4Plus_0.4_Dragekatt med vinger_Generic PLA _0.2_45m10s.gcode", 2710, 6200, "#8E24AA", 2),
    f("portal/EN4Plus_0.4_Nøkkelholder_Generic PLA _0.2_32m5s.gcode", 1925, 2400, "#26A69A", 20),
    f("portal/EN4Plus_0.4_Telefonstativ_Generic PLA _0.2_2h4m.gcode", 7440, 9800, "#1E88E5", 48),
    f("portal/EN4Plus_0.4_Fidget spinner_Generic PLA _0.2_1h12m.gcode", 4320, 5100, "#E53935", 70),
    f(".cache/EN4Plus_0.4_Kalibreringskube_Generic PLA _0.2_18m.gcode", 1080, 1300, "#FDD835", 1),
  ];
}

function seedHistory(files: MockFile[], now: number): HistoryJob[] {
  const job = (id: string, file: MockFile, status: string, agoH: number, frac = 1): HistoryJob => ({
    id,
    filename: file.path,
    displayName: displayNameFromFilename(file.path),
    status,
    startTime: now - agoH * HOUR,
    endTime: now - agoH * HOUR + file.estimatedTime * frac * 1000,
    printDuration: file.estimatedTime * frac,
    totalDuration: file.estimatedTime * frac + 180,
    filamentUsed: file.filamentTotal * frac,
    filamentType: "PLA",
    filamentColor: file.color,
    thumbnailUrl: null,
    fileExists: true,
  });
  const jobs: HistoryJob[] = [];
  // Spread out over a few weeks so the charts have something to show.
  let id = 500;
  for (let day = 1; day < 400; day += 1 + (day % 4) + (day > 60 ? 3 : 0)) {
    const file = files[day % files.length];
    const status = day % 11 === 0 ? "cancelled" : day % 17 === 0 ? "error" : "completed";
    // Vary the time of day (afternoons and weekends are most common)
    const hourOffset = [2, 5, 7, 20, 26, 3][day % 6];
    jobs.push(job(String(id--), file, status, day * 24 + hourOffset, status === "completed" ? 1 : 0.3));
  }
  return jobs;
}

export class MockPrinter implements PrinterSource {
  private readonly events = new EventEmitter();
  private timer: NodeJS.Timeout | null = null;
  private readonly bootAt = Date.now();

  private state: MockState = "standby";
  private shutdownUntil = 0;
  private nozzle = { current: 22, target: 0 };
  private bed = { current: 21, target: 0 };
  private light = true;
  private topLightOn = false;
  private homed = false;

  private file: MockFile | null = null;
  private printedSeconds = 0;
  private totalSeconds = 0;
  private jobStart = 0;

  private files: MockFile[];
  private history: HistoryJob[];
  private console: ConsoleLine[] = [];
  private snapshot: PrinterSnapshot;

  constructor() {
    const now = Date.now();
    this.files = seedFiles(now);
    this.history = seedHistory(this.files, now);
    this.log("response", "// Simulert printer klar");
    this.snapshot = this.compute();
  }

  // ---------------------------------------------------------------- live

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), TICK_MS);
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

  private tick(): void {
    const dt = TICK_MS / 1000;
    const approach = (t: { current: number; target: number }, rate: number) => {
      const goal = t.target > 0 ? t.target : 22;
      t.current += (goal - t.current) * Math.min(1, rate * dt) + (Math.random() - 0.5) * 0.3;
    };
    approach(this.nozzle, this.nozzle.target > this.nozzle.current ? 0.35 : 0.05);
    approach(this.bed, this.bed.target > this.bed.current ? 0.15 : 0.03);

    if (this.state === "printing" || this.state === "paused") this.totalSeconds += dt;
    if (this.state === "printing" && this.file) {
      const heated = this.nozzle.current >= this.nozzle.target - 3 && this.bed.current >= this.bed.target - 2;
      if (heated) this.printedSeconds += dt * (this.file.estimatedTime / PRINT_SECONDS);
      if (this.printedSeconds >= this.file.estimatedTime) this.finish("complete");
    }

    this.snapshot = this.compute();
    this.events.emit("snapshot", this.snapshot);
  }

  /** Recompute and publish right away (so commands are reflected immediately). */
  private changed(): void {
    this.snapshot = this.compute();
    this.events.emit("snapshot", this.snapshot);
  }

  private finish(state: "complete" | "cancelled" | "error"): void {
    if (!this.file) return;
    this.state = state;
    this.nozzle.target = 0;
    this.bed.target = 0;
    const current = this.history.find((h) => h.status === "in_progress");
    if (current) {
      current.status = state === "complete" ? "completed" : state;
      current.endTime = Date.now();
      current.printDuration = this.printedSeconds;
      current.totalDuration = this.totalSeconds;
      current.filamentUsed = this.file.filamentTotal * (this.printedSeconds / this.file.estimatedTime);
    }
    this.log("response", `// Utskrift ${state}`);
    this.events.emit("history");
  }

  private compute(): PrinterSnapshot {
    const now = Date.now();
    let connection: ConnectionState = "ready";
    let klippyState: string | null = "ready";
    if (now - this.bootAt < STARTUP_MS) {
      connection = "offline";
      klippyState = null;
    } else if (now < this.shutdownUntil) {
      connection = "klippy_not_ready";
      klippyState = "shutdown";
    }

    const f = this.file;
    const progress = f ? Math.min(1, this.printedSeconds / f.estimatedTime) : 0;
    const status: RawStatus = {
      extruder: { temperature: this.nozzle.current, target: this.nozzle.target, power: this.nozzle.target ? 0.4 : 0 },
      heater_bed: { temperature: this.bed.current, target: this.bed.target, power: this.bed.target ? 0.3 : 0 },
      print_stats: {
        state: this.state,
        filename: f?.path ?? "",
        print_duration: this.printedSeconds,
        total_duration: this.totalSeconds,
        filament_used: f ? f.filamentTotal * progress : 0,
        info: f ? { total_layer: f.layers, current_layer: Math.max(1, Math.round(progress * f.layers)) } : {},
      },
      virtual_sdcard: { progress, is_active: this.state === "printing" },
      [`output_pin ${LIGHT_PIN}`]: { value: this.light ? 1 : 0 },
    };

    return buildSnapshot({
      connection,
      klippyState,
      klippyMessage: klippyState === "shutdown" ? "Nødstopp (simulert). Starter på nytt om noen sekunder." : null,
      status,
      fileMeta: f ? metaOf(f) : null,
      lightPin: LIGHT_PIN,
      topLight: true,
      mock: true,
      now,
    });
  }

  private requireReady(): void {
    if (this.snapshot.connection !== "ready") throw new PrinterCommandError("Printeren er ikke klar");
  }

  private log(type: ConsoleLine["type"], message: string): void {
    this.console.push({ time: Date.now(), type, message });
    if (this.console.length > 500) this.console.shift();
  }

  // ---------------------------------------------------------------- history

  async getHistory(limit: number): Promise<HistoryResponse> {
    const done = this.history.filter((h) => h.status !== "in_progress");
    return {
      jobs: this.history.slice(0, limit),
      totals: {
        totalJobs: this.history.length,
        totalPrintTime: done.reduce((s, h) => s + h.printDuration, 0),
        totalFilamentUsed: done.reduce((s, h) => s + h.filamentUsed, 0),
        longestPrint: Math.max(0, ...done.map((h) => h.printDuration)),
      },
    };
  }

  async getAllJobs(): Promise<HistoryJob[]> {
    return [...this.history];
  }

  // ---------------------------------------------------------------- files

  async listFiles(): Promise<PrinterFile[]> {
    return this.files.map(toFile).sort((a, b) => b.modified - a.modified);
  }

  async getFile(path: string): Promise<PrinterFile | null> {
    const f = this.files.find((x) => x.path === path);
    return f ? toFile(f) : null;
  }

  async uploadFile(file: File, folder: string): Promise<string> {
    const path = folder ? `${folder}/${file.name}` : file.name;
    this.files = this.files.filter((f) => f.path !== path);
    this.files.push({
      path,
      modified: Date.now(),
      size: file.size,
      estimatedTime: 1800,
      filamentTotal: 3000,
      weight: 9,
      color: "#FF7A45",
      layers: 90,
    });
    return path;
  }

  async deleteFile(path: string): Promise<void> {
    if (!this.files.some((f) => f.path === path)) throw new PrinterCommandError("Filen finnes ikke", 404);
    this.files = this.files.filter((f) => f.path !== path);
  }

  async copyFile(source: string, dest: string): Promise<void> {
    const f = this.files.find((x) => x.path === source);
    if (!f) throw new PrinterCommandError("Filen finnes ikke", 404);
    this.files = this.files.filter((x) => x.path !== dest);
    this.files.push({ ...f, path: dest, modified: Date.now() });
  }

  // ---------------------------------------------------------------- control

  async startPrint(path: string): Promise<void> {
    this.requireReady();
    if (this.state === "printing" || this.state === "paused") throw new PrinterCommandError("Printeren er opptatt");
    const f = this.files.find((x) => x.path === path);
    if (!f) throw new PrinterCommandError("Filen finnes ikke", 404);
    this.file = f;
    this.state = "printing";
    this.printedSeconds = 0;
    this.totalSeconds = 0;
    this.jobStart = Date.now();
    this.nozzle.target = 205;
    this.bed.target = 60;
    this.log("command", `SDCARD_PRINT_FILE FILENAME="${path}"`);
    this.history.unshift({
      id: String(Date.now()),
      filename: f.path,
      displayName: displayNameFromFilename(f.path),
      status: "in_progress",
      startTime: this.jobStart,
      endTime: null,
      printDuration: 0,
      totalDuration: 0,
      filamentUsed: 0,
      filamentType: "PLA",
      filamentColor: f.color,
      thumbnailUrl: null,
      fileExists: true,
    });
    this.events.emit("history");
    this.changed();
  }

  async pausePrint(): Promise<void> {
    this.requireReady();
    if (this.state !== "printing") throw new PrinterCommandError("Ingen utskrift å pause");
    this.state = "paused";
    this.log("command", "PAUSE");
    this.changed();
  }

  async resumePrint(): Promise<void> {
    this.requireReady();
    if (this.state !== "paused") throw new PrinterCommandError("Ingen utskrift på pause");
    this.state = "printing";
    this.log("command", "RESUME");
    this.changed();
  }

  async cancelPrint(): Promise<void> {
    this.requireReady();
    if (this.state !== "printing" && this.state !== "paused") throw new PrinterCommandError("Ingen utskrift å avbryte");
    this.log("command", "CANCEL_PRINT");
    this.finish("cancelled");
    this.changed();
  }

  async emergencyStop(): Promise<void> {
    this.log("command", "M112");
    if (this.state === "printing" || this.state === "paused") this.finish("error");
    this.state = "standby";
    this.file = null;
    this.nozzle.target = 0;
    this.bed.target = 0;
    this.shutdownUntil = Date.now() + 8000;
    this.changed();
  }

  async runGcode(script: string): Promise<void> {
    this.requireReady();
    for (const raw of script.split("\n")) {
      const line = raw.trim();
      if (!line) continue;
      this.log("command", line);
      const upper = line.toUpperCase();
      const s = /S(\d+(?:\.\d+)?)/i.exec(line);
      const value = /VALUE=(\d+(?:\.\d+)?)/i.exec(line);
      if (upper.startsWith("M104") || upper.startsWith("M109")) this.nozzle.target = s ? Number(s[1]) : 0;
      else if (upper.startsWith("M140") || upper.startsWith("M190")) this.bed.target = s ? Number(s[1]) : 0;
      else if (upper.startsWith("SET_PIN") && upper.includes(LIGHT_PIN.toUpperCase())) this.light = value ? Number(value[1]) > 0 : false;
      else if (upper === "MODLELIGHT_SWITCH") this.topLightOn = !this.topLightOn;
      else if (upper.startsWith("G28")) this.homed = true;
      else if (upper === "M115") this.log("response", "FIRMWARE_NAME:Klipper (simulert)");
      else if (upper === "STATUS") this.log("response", "// Klipper state: Ready");
      this.log("response", "ok");
    }
    this.changed();
  }

  // ---------------------------------------------------------------- diagnostics

  async getConsole(count: number): Promise<ConsoleLine[]> {
    return this.console.slice(-count);
  }

  async getSystemInfo(): Promise<SystemInfo> {
    return {
      moonrakerVersion: "simulert",
      apiVersion: "1.5.0",
      klippyState: this.snapshot.connection === "ready" ? "ready" : "shutdown",
      hostname: "mock-printer",
      distribution: "Simulert Linux",
      cpu: "4 kjerner, aarch64",
      cpuTemp: 48 + Math.random() * 4,
      cpuUsage: 10 + Math.random() * 8,
      memoryTotal: 999_784,
      memoryUsed: 412_000,
      disk: { total: 6_964_523_008, used: 2_921_820_160, free: 4_042_702_848 },
      components: ["file_manager", "history", "simulert"],
    };
  }

  async listLogs(): Promise<LogFile[]> {
    return [
      { name: "klippy.log", size: 1_234_567, modified: Date.now() },
      { name: "moonraker.log", size: 234_567, modified: Date.now() },
    ];
  }

  async downloadLog(name: string): Promise<Response> {
    const text = this.console.map((l) => `${new Date(l.time).toISOString()} ${l.type}: ${l.message}`).join("\n");
    return new Response(`Simulert ${name}\n\n${text}\n`, { headers: { "Content-Type": "text/plain" } });
  }
}

function metaOf(f: MockFile): RawFileMetadata {
  return {
    filename: f.path,
    estimated_time: f.estimatedTime,
    layer_count: f.layers,
    filament_total: f.filamentTotal,
    filament_weight_total: f.weight,
    filament_type: "PLA",
    filament_colors: [f.color],
  };
}

function toFile(f: MockFile): PrinterFile {
  const slash = f.path.lastIndexOf("/");
  return {
    path: f.path,
    displayName: displayNameFromFilename(f.path),
    folder: slash >= 0 ? f.path.slice(0, slash) : "",
    size: f.size,
    modified: f.modified,
    estimatedTime: f.estimatedTime,
    filamentWeight: f.weight,
    filamentTotal: f.filamentTotal,
    filamentType: "PLA",
    filamentColor: f.color,
    layerHeight: 0.2,
    objectHeight: f.layers * 0.2,
    slicer: "OrcaSlicer",
    thumbnailUrl: null,
  };
}
