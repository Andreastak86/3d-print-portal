import type { HistoryJob, HistoryResponse, PrinterSnapshot } from "@/lib/printer/types";
import type { ConsoleLine, LogFile, PrinterFile, SystemInfo } from "@/lib/portal/types";

/**
 * Common interface for "a printer". The real Moonraker connection and the
 * simulated printer both implement it, so the rest of the app doesn't know the difference.
 *
 * NB: This layer does NOT check permissions. That happens in the API routes
 * (adminGuard / policy.ts) before these methods are called.
 */
export interface PrinterSource {
  // --- live status
  /** Starts the connection (idempotent). */
  start(): void;
  getSnapshot(): PrinterSnapshot;
  /** Called on every status change. Returns an unsubscribe function. */
  onSnapshot(listener: (snapshot: PrinterSnapshot) => void): () => void;
  /** Called when the printer reports the history has changed (job started/finished). */
  onHistoryChanged(listener: () => void): () => void;

  // --- history
  getHistory(limit: number): Promise<HistoryResponse>;
  /** ALL jobs in the history (paged against Moonraker), newest first. */
  getAllJobs(): Promise<HistoryJob[]>;

  // --- files
  listFiles(): Promise<PrinterFile[]>;
  getFile(path: string): Promise<PrinterFile | null>;
  /** Uploads G-code to `folder` (relative to gcodes). Returns the new path. */
  uploadFile(file: File, folder: string): Promise<string>;
  deleteFile(path: string): Promise<void>;
  copyFile(source: string, dest: string): Promise<void>;

  // --- control
  startPrint(path: string): Promise<void>;
  pausePrint(): Promise<void>;
  resumePrint(): Promise<void>;
  cancelPrint(): Promise<void>;
  emergencyStop(): Promise<void>;
  /** Runs G-code. Admin only. */
  runGcode(script: string): Promise<void>;

  // --- diagnostics
  getConsole(count: number): Promise<ConsoleLine[]>;
  getSystemInfo(): Promise<SystemInfo>;
  listLogs(): Promise<LogFile[]>;
  /** Streams a log file. `name` must be validated by the caller. */
  downloadLog(name: string): Promise<Response>;
}
