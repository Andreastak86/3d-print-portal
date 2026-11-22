/**
 * Builds Tobias' list of things he can print. Pure function (tested).
 *
 * - Approved prints are always included (with the name/icon the admin chose).
 * - If "start any file" is on, every other G-code file on the printer is included too.
 * - Files uploaded in the last 24 hours get isNew and come first, so what Tobias just
 *   sent from OrcaSlicer is at the top.
 */
import type { ApprovedPrint, LibraryItem, PrinterFile } from "./types";

export const NEW_FILE_MS = 24 * 3600_000;
export const FILE_ID_PREFIX = "file:";
export const OTHER_FILES_CATEGORY = "Fra printeren";

function fromApproved(print: ApprovedPrint, file: PrinterFile | undefined, now: number): LibraryItem {
  return {
    id: print.id,
    source: "approved",
    isNew: file ? now - file.modified < NEW_FILE_MS : false,
    title: print.title,
    emoji: print.emoji,
    category: print.category,
    note: print.note,
    estimatedTime: file?.estimatedTime ?? null,
    filamentWeight: file?.filamentWeight ?? null,
    filamentColor: file?.filamentColor ?? null,
    thumbnailUrl: file?.thumbnailUrl ?? null,
    available: Boolean(file),
    timesStarted: print.timesStarted,
  };
}

function fromFile(file: PrinterFile, now: number): LibraryItem {
  return {
    id: FILE_ID_PREFIX + file.path,
    source: "file",
    isNew: now - file.modified < NEW_FILE_MS,
    title: file.displayName,
    emoji: "📄",
    category: OTHER_FILES_CATEGORY,
    note: "",
    estimatedTime: file.estimatedTime,
    filamentWeight: file.filamentWeight,
    filamentColor: file.filamentColor,
    thumbnailUrl: file.thumbnailUrl,
    available: true,
    timesStarted: 0,
  };
}

/**
 * @param files null when the printer couldn't be reached (approved prints are shown as unavailable)
 */
export function buildLibrary(
  approved: readonly ApprovedPrint[],
  files: PrinterFile[] | null,
  canStartAnyFile: boolean,
  now = Date.now(),
): LibraryItem[] {
  if (files === null) return approved.map((p) => ({ ...fromApproved(p, undefined, now), available: false }));

  const byPath = new Map(files.map((f) => [f.path, f]));
  const approvedPaths = new Set(approved.map((p) => p.filename));

  const entries: { item: LibraryItem; modified: number }[] = approved.map((p) => {
    const f = byPath.get(p.filename);
    return { item: fromApproved(p, f, now), modified: f?.modified ?? 0 };
  });
  if (canStartAnyFile) {
    for (const f of [...files].sort((a, b) => b.modified - a.modified)) {
      if (!approvedPaths.has(f.path)) entries.push({ item: fromFile(f, now), modified: f.modified });
    }
  }

  // New files first, newest at the very top; the rest keep their order.
  const fresh = entries.filter((e) => e.item.isNew).sort((a, b) => b.modified - a.modified);
  const rest = entries.filter((e) => !e.item.isNew);
  return [...fresh, ...rest].map((e) => e.item);
}
