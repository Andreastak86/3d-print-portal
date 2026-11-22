/**
 * G-code file list with metadata (thumbnails, time, filament).
 * Metadata is cached per path+modification time, so we don't ask
 * Moonraker about every file on each listing.
 */
import type { PrinterFile } from "@/lib/portal/types";
import { displayNameFromFilename, thumbnailUrlFor } from "@/lib/printer/files";
import { fetchFileList, fetchFileMetadata, type RawFileEntry } from "./rest";
import type { RawFileMetadata } from "./types";

const metaCache = new Map<string, RawFileMetadata>();
const CONCURRENCY = 6;

function cacheKey(entry: RawFileEntry): string {
  return `${entry.path}@${entry.modified}`;
}

export function toPrinterFile(entry: RawFileEntry, meta: RawFileMetadata | null): PrinterFile {
  const slash = entry.path.lastIndexOf("/");
  return {
    path: entry.path,
    displayName: displayNameFromFilename(entry.path),
    folder: slash >= 0 ? entry.path.slice(0, slash) : "",
    size: entry.size,
    modified: Math.round(entry.modified * 1000),
    estimatedTime: meta?.estimated_time ?? null,
    filamentWeight: meta?.filament_weight_total ?? null,
    filamentTotal: meta?.filament_total ?? null,
    filamentType: meta?.filament_type ?? null,
    filamentColor: meta?.filament_colors?.[0] ?? null,
    layerHeight: meta?.layer_height ?? null,
    objectHeight: meta?.object_height ?? null,
    slicer: meta?.slicer ?? null,
    thumbnailUrl: meta ? thumbnailUrlFor(entry.path, meta.thumbnails) : null,
  };
}

async function metaFor(entry: RawFileEntry): Promise<RawFileMetadata | null> {
  const key = cacheKey(entry);
  const cached = metaCache.get(key);
  if (cached) return cached;
  try {
    const meta = await fetchFileMetadata(entry.path);
    metaCache.set(key, meta);
    return meta;
  } catch {
    // Moonraker may still be analysing the file – try again next time.
    return null;
  }
}

export async function listGcodeFiles(): Promise<PrinterFile[]> {
  const entries = (await fetchFileList()).filter((e) => /\.(gcode|g|gco)$/i.test(e.path));
  const result: PrinterFile[] = new Array(entries.length);

  // Fetch metadata with limited concurrency so the printer isn't overloaded.
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, entries.length) }, async () => {
      while (next < entries.length) {
        const i = next++;
        result[i] = toPrinterFile(entries[i], await metaFor(entries[i]));
      }
    }),
  );

  return result.sort((a, b) => b.modified - a.modified);
}

export async function getGcodeFile(path: string): Promise<PrinterFile | null> {
  const files = await fetchFileList();
  const entry = files.find((f) => f.path === path);
  return entry ? toPrinterFile(entry, await metaFor(entry)) : null;
}
