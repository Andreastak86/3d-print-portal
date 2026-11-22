/**
 * Portal domain types (files, approved prints, settings, activity).
 * Shared between server and browser.
 */

export interface PrinterFile {
  /** Path relative to the gcodes root, e.g. "portal/benchy.gcode" */
  path: string;
  displayName: string;
  /** Folder part of the path ("" for the root) */
  folder: string;
  size: number;
  /** Epoch ms */
  modified: number;
  estimatedTime: number | null;
  /** grams */
  filamentWeight: number | null;
  /** mm */
  filamentTotal: number | null;
  filamentType: string | null;
  filamentColor: string | null;
  layerHeight: number | null;
  objectHeight: number | null;
  slicer: string | null;
  thumbnailUrl: string | null;
}

export interface ApprovedPrint {
  id: string;
  /** Path in the gcodes root */
  filename: string;
  title: string;
  emoji: string;
  category: string;
  note: string;
  /** Epoch ms */
  createdAt: number;
  timesStarted: number;
  lastStartedAt: number | null;
}

/** Something Tobias can start – an approved print or (if allowed) any file on the printer. */
export interface LibraryItem {
  /** Approved print: its id. Other file: "file:<path>" */
  id: string;
  source: "approved" | "file";
  /** Uploaded to the printer in the last 24 hours */
  isNew: boolean;
  title: string;
  emoji: string;
  category: string;
  note: string;
  estimatedTime: number | null;
  filamentWeight: number | null;
  filamentColor: string | null;
  thumbnailUrl: string | null;
  /** false if the G-code file no longer exists on the printer */
  available: boolean;
  timesStarted: number;
}

export interface TobiasSettings {
  kidName: string;
  canStart: boolean;
  canPause: boolean;
  canToggleLight: boolean;
  /** Tobias may start ALL G-code files on the printer, not just approved ones */
  canStartAnyFile: boolean;
  /** The checklist requires "an adult is present" */
  requireAdult: boolean;
  /** Only allow starting prints within this time window (local time, "HH:MM") */
  startWindow: { enabled: boolean; from: string; to: string };
  /** Message shown on Tobias' page (empty = none) */
  message: string;
}

/** Used to estimate what printing costs (admin statistics). */
export interface CostSettings {
  /** NOK per kg filament */
  filamentPricePerKg: number;
  /** Average power draw while printing, in watts */
  printerWatts: number;
  /** NOK per kWh */
  electricityPricePerKwh: number;
}

export interface PortalSettings {
  tobias: TobiasSettings;
  costs: CostSettings;
}

export type ActivityActor = "tobias" | "admin" | "system";

export interface ActivityEntry {
  id: string;
  /** Epoch ms */
  at: number;
  actor: ActivityActor;
  action: string;
  detail?: string;
}

export interface ConsoleLine {
  /** Epoch ms */
  time: number;
  type: "command" | "response";
  message: string;
}

export interface SystemInfo {
  moonrakerVersion: string;
  apiVersion: string;
  klippyState: string;
  hostname: string | null;
  distribution: string | null;
  cpu: string | null;
  /** °C */
  cpuTemp: number | null;
  /** percent */
  cpuUsage: number | null;
  /** kB */
  memoryTotal: number | null;
  memoryUsed: number | null;
  disk: { total: number; used: number; free: number } | null;
  components: string[];
}

export interface LogFile {
  name: string;
  size: number;
  modified: number;
}

/** Public view for Tobias' page: library + what he's allowed to do. */
export interface TobiasView {
  settings: TobiasSettings;
  library: LibraryItem[];
}
