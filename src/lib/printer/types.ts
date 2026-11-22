/**
 * Printer types shared between server and browser.
 * These are OUR domain types – deliberately decoupled from Moonraker's raw format,
 * so the UI never depends on Moonraker details.
 */

/**
 * - connecting:       portal just started, no answer yet
 * - offline:          Moonraker cannot be reached (printer off / network issue)
 * - klippy_not_ready: Moonraker answers, but Klipper is starting up, has an error or is shut down
 * - ready:            everything OK – status is live
 */
export type ConnectionState = "connecting" | "offline" | "klippy_not_ready" | "ready";

export type PrintState = "standby" | "printing" | "paused" | "complete" | "cancelled" | "error";

export interface Temperature {
  current: number;
  target: number;
  /** Heater power 0–1 */
  power: number;
}

export interface ActiveJob {
  filename: string;
  displayName: string;
  state: Exclude<PrintState, "standby">;
  /** 0–1 */
  progress: number;
  /** Seconds actually printing (excluding pauses) */
  printDuration: number;
  /** Seconds since the job started (including pauses/heating) */
  totalDuration: number;
  /** Estimated seconds left, null if unknown */
  remaining: number | null;
  /** Filament used so far, in mm */
  filamentUsed: number;
  /** Total filament for the job according to the slicer, in mm */
  filamentTotal: number | null;
  /** Estimated weight of the full job according to the slicer, in grams */
  filamentWeight: number | null;
  currentLayer: number | null;
  totalLayers: number | null;
  thumbnailUrl: string | null;
  message: string | null;
}

export interface PrinterSnapshot {
  connection: ConnectionState;
  /** Klipper's own state/message when not ready (e.g. "startup", "shutdown") */
  klippyState: string | null;
  klippyMessage: string | null;
  temperatures: { nozzle: Temperature; bed: Temperature } | null;
  /** Idle printer = standby with no job */
  printState: PrintState | null;
  job: ActiveJob | null;
  /** Light at the print head on/off, null if the printer has no light we know about */
  light: boolean | null;
  /** Whether the top/logo light can be toggled (its on/off state can't be read) */
  topLight: boolean;
  /** Epoch ms */
  updatedAt: number;
  /** True when the server is running against the simulated printer */
  mock: boolean;
}

export type HistoryStatus =
  | "completed"
  | "cancelled"
  | "error"
  | "in_progress"
  | "klippy_shutdown"
  | "klippy_disconnect"
  | "server_exit"
  | "interrupted"
  | (string & {});

export interface HistoryJob {
  id: string;
  filename: string;
  displayName: string;
  status: HistoryStatus;
  /** Epoch ms */
  startTime: number;
  /** Epoch ms, null while in progress */
  endTime: number | null;
  printDuration: number;
  totalDuration: number;
  /** mm */
  filamentUsed: number;
  filamentType: string | null;
  filamentColor: string | null;
  thumbnailUrl: string | null;
  /** Whether the G-code file still exists on the printer */
  fileExists: boolean;
}

export interface HistoryTotals {
  totalJobs: number;
  /** seconds */
  totalPrintTime: number;
  /** mm */
  totalFilamentUsed: number;
  /** seconds */
  longestPrint: number;
}

export interface HistoryResponse {
  jobs: HistoryJob[];
  totals: HistoryTotals | null;
}

export interface ApiError {
  error: { code: string; message: string };
}
