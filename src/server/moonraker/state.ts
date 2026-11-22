/**
 * Pure functions that turn Moonraker's raw data into our PrinterSnapshot / HistoryJob.
 * No I/O here, so everything is easy to unit test.
 */
import type {
  ActiveJob,
  ConnectionState,
  HistoryJob,
  HistoryTotals,
  PrintState,
  PrinterSnapshot,
  Temperature,
} from "@/lib/printer/types";
import { displayNameFromFilename, thumbnailUrlFor } from "@/lib/printer/files";
import type { RawFileMetadata, RawHistoryJob, RawHistoryTotals, RawStatus, RawTemperatureObject } from "./types";

/** Merges a notify_status_update into the existing status (Moonraker only sends changed fields). */
export function mergeStatus(current: RawStatus, update: Record<string, unknown>): RawStatus {
  const next: Record<string, unknown> = { ...current };
  for (const [key, value] of Object.entries(update)) {
    const prev = next[key];
    next[key] =
      value && typeof value === "object" && !Array.isArray(value) && prev && typeof prev === "object"
        ? { ...(prev as object), ...(value as object) }
        : value;
  }
  return next as RawStatus;
}

const PRINT_STATES: readonly PrintState[] = ["standby", "printing", "paused", "complete", "cancelled", "error"];

function toPrintState(raw: string | undefined): PrintState | null {
  return raw && (PRINT_STATES as readonly string[]).includes(raw) ? (raw as PrintState) : null;
}

function toTemperature(raw: RawTemperatureObject | undefined): Temperature {
  return { current: raw?.temperature ?? 0, target: raw?.target ?? 0, power: raw?.power ?? 0 };
}

/**
 * Progress like Fluidd's "file-relative": position within the actual G-code body
 * (excluding the header with thumbnails, and footer). Falls back to Klipper's own value.
 */
export function computeProgress(status: RawStatus, meta: RawFileMetadata | null): number {
  const sd = status.virtual_sdcard;
  const pos = sd?.file_position;
  const start = meta?.gcode_start_byte;
  const end = meta?.gcode_end_byte;
  let progress: number;
  if (pos != null && start != null && end != null && end > start) {
    progress = (pos - start) / (end - start);
  } else {
    progress = sd?.progress ?? status.display_status?.progress ?? 0;
  }
  return Math.min(1, Math.max(0, progress));
}

/**
 * Remaining time. Early on we trust the slicer's estimate; once there's enough
 * data (>10 %) we extrapolate from actual pace, which adapts to real speed.
 */
export function computeRemaining(progress: number, printDuration: number, estimatedTime: number | undefined): number | null {
  if (progress >= 1) return 0;
  if (progress > 0.1 && printDuration > 0) {
    return Math.max(0, printDuration / progress - printDuration);
  }
  if (estimatedTime && estimatedTime > 0) {
    return Math.max(0, estimatedTime - printDuration);
  }
  return null;
}

export interface SnapshotInput {
  connection: ConnectionState;
  klippyState: string | null;
  klippyMessage: string | null;
  status: RawStatus;
  /** Metadata for the file in print_stats.filename (if fetched) */
  fileMeta: RawFileMetadata | null;
  /** Name of the light's output_pin (e.g. "caselight1"), null if none */
  lightPin: string | null;
  /** Whether the top light macro exists */
  topLight?: boolean;
  mock: boolean;
  now: number;
}

export function buildSnapshot(input: SnapshotInput): PrinterSnapshot {
  const { connection, status, fileMeta } = input;
  const ready = connection === "ready";

  const printState = ready ? toPrintState(status.print_stats?.state) : null;
  let job: ActiveJob | null = null;

  const ps = status.print_stats;
  if (ready && printState && printState !== "standby" && ps?.filename) {
    const meta = fileMeta?.filename === ps.filename ? fileMeta : null;
    const printDuration = ps.print_duration ?? 0;
    const progress = printState === "complete" ? 1 : computeProgress(status, meta);
    job = {
      filename: ps.filename,
      displayName: displayNameFromFilename(ps.filename),
      state: printState,
      progress,
      printDuration,
      totalDuration: ps.total_duration ?? 0,
      remaining: printState === "printing" || printState === "paused" ? computeRemaining(progress, printDuration, meta?.estimated_time) : null,
      filamentUsed: ps.filament_used ?? 0,
      filamentTotal: meta?.filament_total ?? null,
      filamentWeight: meta?.filament_weight_total ?? null,
      currentLayer: ps.info?.current_layer ?? null,
      totalLayers: ps.info?.total_layer ?? meta?.layer_count ?? null,
      thumbnailUrl: meta ? thumbnailUrlFor(ps.filename, meta.thumbnails) : null,
      message: ps.message || null,
    };
  }

  return {
    connection,
    klippyState: input.klippyState,
    klippyMessage: input.klippyMessage,
    temperatures: ready ? { nozzle: toTemperature(status.extruder), bed: toTemperature(status.heater_bed) } : null,
    printState,
    job,
    light: ready && input.lightPin ? lightValue(status, input.lightPin) : null,
    topLight: ready && Boolean(input.topLight),
    updatedAt: input.now,
    mock: input.mock,
  };
}

function lightValue(status: RawStatus, pin: string): boolean | null {
  const obj = status[`output_pin ${pin}`];
  return obj?.value == null ? null : obj.value > 0;
}

export function mapHistoryJob(raw: RawHistoryJob): HistoryJob {
  const meta = raw.metadata ?? {};
  return {
    id: raw.job_id,
    filename: raw.filename,
    displayName: displayNameFromFilename(raw.filename),
    status: raw.status,
    startTime: Math.round(raw.start_time * 1000),
    endTime: raw.end_time != null ? Math.round(raw.end_time * 1000) : null,
    printDuration: raw.print_duration ?? 0,
    totalDuration: raw.total_duration ?? 0,
    filamentUsed: raw.filament_used ?? 0,
    filamentType: meta.filament_type ?? null,
    filamentColor: meta.filament_colors?.[0] ?? null,
    // Thumbnails usually disappear along with the file, so we only show them when the file exists.
    thumbnailUrl: raw.exists ? thumbnailUrlFor(raw.filename, meta.thumbnails) : null,
    fileExists: raw.exists,
  };
}

export function mapHistoryTotals(raw: RawHistoryTotals): HistoryTotals {
  const t = raw.job_totals;
  return {
    totalJobs: Math.round(t.total_jobs),
    totalPrintTime: t.total_print_time,
    totalFilamentUsed: t.total_filament_used,
    longestPrint: t.longest_print,
  };
}
